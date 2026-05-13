import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination-query.dto';

export class GetTrucksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter trucks by site ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  siteId?: number;

  @ApiPropertyOptional({
    description: 'Search by license plate (case-insensitive partial match)',
    example: 'kdd',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  search?: string;
}
