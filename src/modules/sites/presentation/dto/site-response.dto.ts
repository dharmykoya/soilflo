import { ApiProperty } from '@nestjs/swagger';
import { Site } from '../../domain/site.entity';

export class SiteResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ZILCH' })
  name!: string;

  @ApiProperty({ example: '947 Aviation Road, Kapowsin, Connecticut, 9733' })
  address!: string;

  @ApiProperty({
    example: 'Consequat amet officia sit ex elit adipisicing culpa.',
  })
  description!: string;

  static fromEntity(site: Site): SiteResponseDto {
    const dto = new SiteResponseDto();
    dto.id = site.id;
    dto.name = site.name;
    dto.address = site.address;
    dto.description = site.description;
    return dto;
  }
}
