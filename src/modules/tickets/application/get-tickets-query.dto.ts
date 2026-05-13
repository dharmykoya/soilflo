import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination-query.dto';

export class GetTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter tickets by site ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  siteId?: number;

  @ApiPropertyOptional({
    description: 'Filter tickets dispatched on or after this date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter tickets dispatched on or before this date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
