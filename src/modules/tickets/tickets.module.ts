import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './domain/ticket.entity';
import { SiteTicketCounter } from './domain/site-ticket-counter.entity';
import { TicketRepository } from './domain/ticket.repository.interface';
import { TypeOrmTicketRepository } from './infrastructure/typeorm-ticket.repository';
import { TicketsService } from './application/tickets.service';
import { TicketsController } from './presentation/tickets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, SiteTicketCounter])],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    {
      provide: TicketRepository,
      useClass: TypeOrmTicketRepository,
    },
  ],
})
export class TicketsModule {}
