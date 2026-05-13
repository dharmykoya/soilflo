import { Body, Controller, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiAcceptedResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { PaginatedResultDto, PaginationMetaDto } from '../../../shared/pagination/paginated-result.dto';
import { BulkCreateTicketsDto } from '../application/dto/bulk-create-tickets.dto';
import { GetTicketsQueryDto } from '../application/get-tickets-query.dto';
import { TicketsService } from '../application/tickets.service';
import { TicketsQueueService } from '../application/tickets.queue.service';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { CreateJobResponseDto, JobStatusResponseDto } from './dto/job-response.dto';

@ApiTags('Tickets')
@ApiExtraModels(PaginatedResultDto, PaginationMetaDto, TicketResponseDto)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly ticketsQueueService: TicketsQueueService,
  ) {}

  /**
   * When QUEUE_ENABLED=true  → enqueues the job and returns 202 + { jobId }.
   *                             Poll GET /tickets/jobs/:jobId for the result.
   * When QUEUE_ENABLED=false → creates tickets synchronously and returns 201 + ticket array.
   */
  @Post()
  @ApiOperation({
    summary: 'Bulk-create tickets for a truck',
    description:
      'Synchronous by default (201 + created tickets).\n\n' +
      'When `QUEUE_ENABLED=true` the request is enqueued and returns 202 + `{ jobId }` immediately. ' +
      'Poll `GET /tickets/jobs/:jobId` to retrieve the result.',
  })
  @ApiCreatedResponse({ type: [TicketResponseDto], description: 'Tickets created (sync path)' })
  @ApiAcceptedResponse({ type: CreateJobResponseDto, description: 'Job enqueued (queue path)' })
  async bulkCreate(
    @Body() dto: BulkCreateTicketsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TicketResponseDto[] | CreateJobResponseDto> {
    if (this.ticketsQueueService.isEnabled()) {
      console.log('QUEUE_ENABLED=true — enqueuing bulk-create job');
      res.status(HttpStatus.OK);
      return this.ticketsQueueService.enqueue(dto);
    }

    res.status(HttpStatus.CREATED);
    const tickets = await this.ticketsService.bulkCreate(dto);
    return tickets.map(TicketResponseDto.fromEntity);
  }

  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Get the status and result of an enqueued bulk-create job',
    description: 'Only meaningful when `QUEUE_ENABLED=true`.',
  })
  @ApiOkResponse({ type: JobStatusResponseDto })
  async getJobStatus(@Param('jobId') jobId: string): Promise<JobStatusResponseDto> {
    return this.ticketsQueueService.getStatus(jobId);
  }

  @Get()
  @ApiOperation({ summary: 'List all tickets (filterable by site and date range)' })
  @ApiOkResponse({
    description: 'Paginated list of tickets',
    schema: {
      allOf: [
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(TicketResponseDto) },
            },
            meta: { $ref: getSchemaPath(PaginationMetaDto) },
          },
        },
      ],
    },
  })
  async findAll(
    @Query() query: GetTicketsQueryDto,
  ): Promise<PaginatedResultDto<TicketResponseDto>> {
    const result = await this.ticketsService.findAll(query);
    return new PaginatedResultDto(
      result.data.map(TicketResponseDto.fromEntity),
      result.meta.total,
      result.meta.page,
      result.meta.limit,
    );
  }
}

