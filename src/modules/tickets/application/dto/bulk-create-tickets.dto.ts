import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateTicketItemDto } from './create-ticket-item.dto';

export class BulkCreateTicketsDto {
  @ApiProperty({
    type: [CreateTicketItemDto],
    description: 'One or more tickets to create in a single atomic operation',
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTicketItemDto)
  tickets!: CreateTicketItemDto[];
}
