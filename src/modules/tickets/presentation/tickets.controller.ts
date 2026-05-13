import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import {
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
import { TicketResponseDto } from './dto/ticket-response.dto';

@ApiTags('Tickets')
@ApiExtraModels(PaginatedResultDto, PaginationMetaDto, TicketResponseDto)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk-create tickets for a truck (atomic, advisory-locked per site)' })
  @ApiCreatedResponse({ type: [TicketResponseDto] })
  async bulkCreate(@Body() dto: BulkCreateTicketsDto): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketsService.bulkCreate(dto);
    return tickets.map(TicketResponseDto.fromEntity);
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
