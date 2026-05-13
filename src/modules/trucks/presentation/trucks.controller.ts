import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { PaginatedResultDto, PaginationMetaDto } from '../../../shared/pagination/paginated-result.dto';
import { GetTrucksQueryDto } from '../application/get-trucks-query.dto';
import { TrucksService } from '../application/trucks.service';
import { TruckResponseDto } from './dto/truck-response.dto';

@ApiTags('Trucks')
@ApiExtraModels(PaginatedResultDto, PaginationMetaDto, TruckResponseDto)
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Get()
  @ApiOperation({ summary: 'List all trucks (paginated, filterable by siteId or license search)' })
  @ApiOkResponse({
    description: 'Paginated list of trucks',
    schema: {
      allOf: [
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(TruckResponseDto) },
            },
            meta: { $ref: getSchemaPath(PaginationMetaDto) },
          },
        },
      ],
    },
  })
  async findAll(
    @Query() query: GetTrucksQueryDto,
  ): Promise<PaginatedResultDto<TruckResponseDto>> {
    const result = await this.trucksService.findAll(query);
    return new PaginatedResultDto(
      result.data.map(TruckResponseDto.fromEntity),
      result.meta.total,
      result.meta.page,
      result.meta.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single truck by ID' })
  @ApiOkResponse({ type: TruckResponseDto })
  @ApiNotFoundResponse({ description: 'Truck not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<TruckResponseDto> {
    const truck = await this.trucksService.findById(id);
    return TruckResponseDto.fromEntity(truck);
  }
}
