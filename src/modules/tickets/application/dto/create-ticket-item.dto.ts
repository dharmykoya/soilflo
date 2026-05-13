import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { Material } from '../../domain/material.enum';

export class CreateTicketItemDto {
  @ApiProperty({ description: 'ID of the truck dispatching the load', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  truckId!: number;

  @ApiProperty({
    description: 'Dispatch timestamp (ISO 8601). Cannot be a future date.',
    example: '2024-06-15T10:30:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  dispatchedAt!: string;

  @ApiProperty({ enum: Material, example: Material.Soil })
  @IsEnum(Material)
  material!: Material;
}
