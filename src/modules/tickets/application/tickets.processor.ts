import { Logger } from '@nestjs/common';
import { appendErrorLog } from '../../../shared/utils/error-log';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TicketsService } from './tickets.service';
import { BulkCreateTicketsDto } from './dto/bulk-create-tickets.dto';
import { Ticket } from '../domain/ticket.entity';
import { BULK_CREATE_JOB, TICKET_QUEUE_NAME } from './tickets.queue.constants';

/**
 * BullMQ worker that processes async bulk-create jobs from the 'tickets' queue.
 *
 * Each job carries the same `BulkCreateTicketsDto` payload as the synchronous
 * `POST /tickets` endpoint. The processor delegates all business logic to
 * `TicketsService.bulkCreate`, so the advisory lock and counter-upsert
 * behaviour remain identical whether the request arrived synchronously or
 * via the queue.
 *
 * Only registered when `QUEUE_ENABLED=true` (see TicketsModule).
 */
@Processor(TICKET_QUEUE_NAME)
export class TicketsProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketsProcessor.name);

  constructor(private readonly ticketsService: TicketsService) {
    super();
  }

  async process(job: Job<BulkCreateTicketsDto>): Promise<Ticket[]> {
    if (job.name !== BULK_CREATE_JOB) {
      throw new Error(`Unknown job: ${job.name}`);
    }

    this.logger.log(`Processing job ${job.id} (${job.data.tickets.length} ticket(s))`);

    try {
      const result = await this.ticketsService.bulkCreate(job.data);
      this.logger.log(`Job ${job.id} completed — ${result.length} ticket(s) created`);
      return result;
    } catch (err) {
      const error = err as Error;
      const timestamp = new Date().toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      });
      const logLine =
        `[Nest] ${process.pid}  - ${timestamp}   ERROR [TicketsProcessor] ` +
        `Job ${job.id} failed: ${error.message}:\n` +
        `${error.stack ?? error.message}\n` +
        `---\n`;
      try {
        appendErrorLog(logLine);
      } catch {
        // file logging is best-effort
      }
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      throw err;
    }
  }
}
