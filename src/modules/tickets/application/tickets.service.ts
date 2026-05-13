import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { Truck } from '../../trucks/domain/truck.entity';
import { TicketStatus } from '../domain/ticket-status.enum';
import { TicketRepository } from '../domain/ticket.repository.interface';
import { Ticket } from '../domain/ticket.entity';
import { BulkCreateTicketsDto } from './dto/bulk-create-tickets.dto';
import { GetTicketsQueryDto } from './get-tickets-query.dto';

/**
 * Handles all business logic for the Tickets resource.
 *
 * Responsibilities:
 * - Querying tickets with optional filters (site, date range, pagination)
 * - Atomically bulk-creating tickets under a per-site advisory lock to
 *   guarantee gap-free sequential ticket numbers across concurrent requests
 */
@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Returns a paginated list of tickets, optionally filtered by site and date range.
   *
   * @param query - Pagination and filter parameters (siteId, startDate, endDate, page, limit)
   * @returns Paginated result containing ticket records and metadata
   */
  async findAll(query: GetTicketsQueryDto): Promise<PaginatedResultDto<Ticket>> {
    const [tickets, total] = await this.ticketRepository.findAll(query);
    return new PaginatedResultDto(tickets, total, query.page, query.limit);
  }

  /**
   * Atomically bulk-creates tickets under a per-site PostgreSQL advisory lock.
   *
   * The advisory lock on `siteId` serialises concurrent bulk-create requests
   * for the same site, ensuring ticket numbers are assigned sequentially
   * without gaps or duplicates.
   *
   * Future-date validation is handled upstream by `@IsNotFutureDate()` on the DTO.
   *
   * @param dto - Payload containing one or more ticket items to create
   * @returns The newly created ticket entities
   * @throws BadRequestException if the request contains duplicate truck+time pairs
   * @throws NotFoundException if any truckId does not exist
   * @throws BadRequestException if trucks span more than one site
   * @throws ConflictException if any truck+time pair already exists in the database
   */
  async bulkCreate(dto: BulkCreateTicketsDto): Promise<Ticket[]> {
    this.validateNoDuplicates(dto.tickets);

    const truckIds = [...new Set(dto.tickets.map((t) => t.truckId))];
    const trucks = await this.loadTrucks(truckIds);
    const siteId = this.validateSite(trucks);

    return this.dataSource.transaction(async (manager: EntityManager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [siteId]);

      const firstTicketNumber = await this.claimTicketNumbers(manager, siteId, dto.tickets.length);
      await this.validateNoConflicts(manager, truckIds, dto.tickets.map((t) => t.dispatchedAt));

      return this.insertTickets(manager, dto, siteId, firstTicketNumber);
    });
  }

  /**
   * Ensures no two items in the request share the same truckId and dispatchedAt.
   *
   * @throws BadRequestException on the first detected duplicate
   */
  private validateNoDuplicates(tickets: BulkCreateTicketsDto['tickets']): void {
    const seen = new Set<string>();
    for (const item of tickets) {
      const key = `${item.truckId}:${item.dispatchedAt}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate dispatched time in request: truck ${item.truckId} at ${item.dispatchedAt}`,
        );
      }
      seen.add(key);
    }
  }

  /**
   * Fetches trucks by ID and verifies every requested ID was found.
   *
   * @param truckIds - Deduplicated list of truck IDs from the request
   * @returns The matching Truck entities
   * @throws NotFoundException listing any IDs that could not be resolved
   */
  private async loadTrucks(truckIds: number[]): Promise<Truck[]> {
    const trucks = await this.dataSource.getRepository(Truck).findBy({ id: In(truckIds) });

    if (trucks.length !== truckIds.length) {
      const missing = truckIds.filter((id) => !new Set(trucks.map((t) => t.id)).has(id));
      throw new NotFoundException(`Truck(s) not found: ${missing.join(', ')}`);
    }

    return trucks;
  }

  /**
   * Asserts all trucks belong to the same site and returns that site's ID.
   *
   * A bulk-create request must target a single site so that ticket numbering
   * and the advisory lock are scoped correctly.
   *
   * @param trucks - Truck entities loaded for this request
   * @returns The common siteId
   * @throws BadRequestException if trucks span more than one site
   */
  private validateSite(trucks: Truck[]): number {
    const siteIds = [...new Set(trucks.map((t) => t.siteId))];
    if (siteIds.length > 1) {
      throw new BadRequestException(
        'All tickets in a bulk request must belong to trucks from the same site.',
      );
    }

    return siteIds[0]!;
  }

  /**
   * Atomically reserves `count` sequential ticket numbers for the given site
   * using the `site_ticket_counters` table.
   *
   * A single upsert increments `last_ticket_number` by `count` and returns
   * the first number of the reserved range — O(1) regardless of table size.
   *
   * Must be called inside a transaction after acquiring the advisory lock.
   *
   * @param manager - The active transaction's EntityManager
   * @param siteId  - The site to reserve numbers for
   * @param count   - How many consecutive numbers to reserve
   * @returns The first ticket number of the reserved range
   */
  private async claimTicketNumbers(
    manager: EntityManager,
    siteId: number,
    count: number,
  ): Promise<number> {
    const rows = await manager.query<{ first_ticket_number: number }[]>(
      `INSERT INTO site_ticket_counters (site_id, last_ticket_number)
       VALUES ($1, $2)
       ON CONFLICT (site_id) DO UPDATE
         SET last_ticket_number = site_ticket_counters.last_ticket_number + EXCLUDED.last_ticket_number
       RETURNING (site_ticket_counters.last_ticket_number - $2 + 1) AS first_ticket_number`,
      [siteId, count],
    );

    return Number(rows[0].first_ticket_number);
  }

  /**
   * Checks the database for tickets that already occupy any of the requested
   * truck + dispatchedAt slots and throws a descriptive error if any are found.
   *
   * This is a pre-flight check that surfaces a clean 409 response instead of
   * letting the unique-constraint violation bubble up as a raw database error.
   *
   * @param manager       - The active transaction's EntityManager
   * @param truckIds      - Truck IDs present in the request
   * @param dispatchedAts - Dispatch timestamps present in the request
   * @throws ConflictException listing each conflicting truck + timestamp pair
   */
  private async validateNoConflicts(
    manager: EntityManager,
    truckIds: number[],
    dispatchedAts: string[],
  ): Promise<void> {
    const conflicts = await manager
      .createQueryBuilder(Ticket, 'ticket')
      .select(['ticket.truckId', 'ticket.dispatchedAt'])
      .where('ticket.truckId IN (:...truckIds)', { truckIds })
      .andWhere('ticket.dispatchedAt IN (:...dispatchedAts)', { dispatchedAts })
      .getMany();

    if (conflicts.length > 0) {
      const details = conflicts
        .map((t) => `truck ${t.truckId} at ${t.dispatchedAt.toISOString()}`)
        .join('; ');
      throw new ConflictException(`Ticket(s) already exist: ${details}`);
    }
  }

  /**
   * Builds ticket entities with sequential ticket numbers and persists them in one batch.
   *
   * @param manager           - The active transaction's EntityManager
   * @param dto               - The original bulk-create payload
   * @param siteId            - The resolved site ID shared by all trucks
   * @param firstTicketNumber - The starting ticket number (MAX + 1 for this site)
   * @returns The saved ticket entities
   */
  private async insertTickets(
    manager: EntityManager,
    dto: BulkCreateTicketsDto,
    siteId: number,
    firstTicketNumber: number,
  ): Promise<Ticket[]> {
    const ticketRepo = manager.getRepository(Ticket);
    let nextTicketNumber = firstTicketNumber;

    const entities = dto.tickets.map((item) =>
      ticketRepo.create({
        id: uuidv7(),
        siteId,
        truckId: item.truckId,
        ticketNumber: nextTicketNumber++,
        material: item.material,
        dispatchedAt: new Date(item.dispatchedAt),
        status: TicketStatus.Active,
      }),
    );

    const saved = await ticketRepo.save(entities);
    return ticketRepo.find({
      where: { id: In(saved.map((t) => t.id)) },
      relations: ['site', 'truck'],
    });
  }
}
