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
import { GetSitesQueryDto } from '../application/get-sites-query.dto';
import { SitesService } from '../application/sites.service';
import { SiteResponseDto } from './dto/site-response.dto';

@ApiTags('Sites')
@ApiExtraModels(PaginatedResultDto, PaginationMetaDto, SiteResponseDto)
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'List all sites (paginated)' })
  @ApiOkResponse({
    description: 'Paginated list of sites',
    schema: {
      allOf: [
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(SiteResponseDto) },
            },
            meta: { $ref: getSchemaPath(PaginationMetaDto) },
          },
        },
      ],
    },
  })
  async findAll(
    @Query() query: GetSitesQueryDto,
  ): Promise<PaginatedResultDto<SiteResponseDto>> {
    const result = await this.sitesService.findAll(query);
    return new PaginatedResultDto(
      result.data.map(SiteResponseDto.fromEntity),
      result.meta.total,
      result.meta.page,
      result.meta.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single site by ID' })
  @ApiOkResponse({ type: SiteResponseDto })
  @ApiNotFoundResponse({ description: 'Site not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<SiteResponseDto> {
    const site = await this.sitesService.findById(id);
    return SiteResponseDto.fromEntity(site);
  }
}

