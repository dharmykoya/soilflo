import { ApiProperty } from '@nestjs/swagger';
import { Truck } from '../../domain/truck.entity';

export class TruckResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'kdd7yh' })
  license!: string;

  @ApiProperty({ example: 1, description: 'ID of the site this truck belongs to' })
  siteId!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(truck: Truck): TruckResponseDto {
    const dto = new TruckResponseDto();
    dto.id = truck.id;
    dto.license = truck.license;
    dto.siteId = truck.siteId;
    dto.createdAt = truck.createdAt;
    dto.updatedAt = truck.updatedAt;
    return dto;
  }
}
