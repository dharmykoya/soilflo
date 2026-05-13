import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetTicketsQueryDto } from '../application/get-tickets-query.dto';
import { TicketRepository } from '../domain/ticket.repository.interface';
import { Ticket } from '../domain/ticket.entity';

@Injectable()
export class TypeOrmTicketRepository implements TicketRepository {
  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
  ) {}

  findAll({ page, limit, siteId, startDate, endDate }: GetTicketsQueryDto): Promise<[Ticket[], number]> {
    const qb = this.repo
      .createQueryBuilder('ticket')
      .select([
        'ticket.id',
        'ticket.ticketNumber',
        'ticket.material',
        'ticket.status',
        'ticket.dispatchedAt',
        'site.id',
        'site.name',
        'truck.id',
        'truck.license',
      ])
      .innerJoinAndSelect('ticket.site', 'site')
      .innerJoinAndSelect('ticket.truck', 'truck')
      .orderBy('ticket.dispatchedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (siteId !== undefined) {
      qb.andWhere('ticket.siteId = :siteId', { siteId });
    }
    if (startDate) {
      qb.andWhere('ticket.dispatchedAt >= :startDate', { startDate });
    }
    if (endDate) {
      // Include the full end day by going to midnight of the next day
      qb.andWhere('ticket.dispatchedAt < :endDate', {
        endDate: new Date(new Date(endDate).getTime() + 86_400_000),
      });
    }

    return qb.getManyAndCount();
  }
}
