import { GetTicketsQueryDto } from '../application/get-tickets-query.dto';
import { Ticket } from './ticket.entity';

export abstract class TicketRepository {
  abstract findAll(query: GetTicketsQueryDto): Promise<[Ticket[], number]>;
}
