import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { TicketRepository } from '../domain/ticket.repository.interface';
import { Ticket } from '../domain/ticket.entity';
import { BulkCreateTicketsDto } from './dto/bulk-create-tickets.dto';
import { GetTicketsQueryDto } from './get-tickets-query.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    // DataSource injected for transaction + advisory lock management (used in bulk create)
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: GetTicketsQueryDto): Promise<PaginatedResultDto<Ticket>> {
    const [tickets, total] = await this.ticketRepository.findAll(query);
    return new PaginatedResultDto(tickets, total, query.page, query.limit);
  }

  /**
   * Bulk-creates tickets atomically under a per-site advisory lock.
   * Full implementation in feature/tickets-bulk-create.
   */
  async bulkCreate(_dto: BulkCreateTicketsDto): Promise<Ticket[]> {
    throw new Error('Not implemented — coming in feature/tickets-bulk-create');
  }
}
