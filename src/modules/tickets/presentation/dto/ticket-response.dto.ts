import { ApiProperty } from '@nestjs/swagger';
import { Material } from '../../domain/material.enum';
import { TicketStatus } from '../../domain/ticket-status.enum';
import { Ticket } from '../../domain/ticket.entity';

export class TicketResponseDto {
  @ApiProperty({ example: '01900000-0000-7000-8000-000000000000' })
  id!: string;

  @ApiProperty({ example: 42 })
  ticketNumber!: number;

  @ApiProperty({ enum: Material, example: Material.Soil })
  material!: Material;

  @ApiProperty({ example: '2024-06-15T10:30:00.000Z' })
  dispatchedAt!: Date;

  @ApiProperty({ example: 'Oakland Construction Site', description: 'Name of the site' })
  siteName!: string;

  @ApiProperty({ example: 'kdd7yh', description: 'License plate of the truck' })
  truckLicense!: string;

  @ApiProperty({ enum: TicketStatus, example: TicketStatus.Active })
  status!: TicketStatus;

  static fromEntity(ticket: Ticket): TicketResponseDto {
    const dto = new TicketResponseDto();
    dto.id = ticket.id;
    dto.ticketNumber = ticket.ticketNumber;
    dto.material = ticket.material;
    dto.status = ticket.status;
    dto.dispatchedAt = ticket.dispatchedAt;
    dto.siteName = ticket.site?.name ?? '';
    dto.truckLicense = ticket.truck?.license ?? '';
    return dto;
  }
}
