import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Ticket } from './domain/ticket.entity';
import { SiteTicketCounter } from './domain/site-ticket-counter.entity';
import { TicketRepository } from './domain/ticket.repository.interface';
import { TypeOrmTicketRepository } from './infrastructure/typeorm-ticket.repository';
import { TicketsService } from './application/tickets.service';
import { TicketsProcessor } from './application/tickets.processor';
import { TicketsQueueService } from './application/tickets.queue.service';
import { TicketsController } from './presentation/tickets.controller';
import { TICKET_QUEUE_NAME } from './application/tickets.queue.constants';

// Conditionally wire BullMQ — when QUEUE_ENABLED=false (e.g. in tests or dev
// without Redis) the queue module and processor are simply omitted, so no
// Redis connection is ever attempted.
const QUEUE_ENABLED = process.env['QUEUE_ENABLED'] === 'true';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, SiteTicketCounter]),
    ...(QUEUE_ENABLED ? [BullModule.registerQueue({ name: TICKET_QUEUE_NAME })] : []),
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketsQueueService,
    { provide: TicketRepository, useClass: TypeOrmTicketRepository },
    ...(QUEUE_ENABLED ? [TicketsProcessor] : []),
  ],
})
export class TicketsModule {}
