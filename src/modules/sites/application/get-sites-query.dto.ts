import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination-query.dto';

export class GetSitesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by site name or address',
    example: 'Oakland',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
