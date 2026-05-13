import { TicketResponseDto } from './ticket-response.dto';
import { Ticket } from '../../domain/ticket.entity';
import { Site } from '../../../sites/domain/site.entity';
import { Truck } from '../../../trucks/domain/truck.entity';
import { Material } from '../../domain/material.enum';
import { TicketStatus } from '../../domain/ticket-status.enum';

const makeTicket = (): Ticket => {
  const site = new Site();
  site.id = 10;
  site.name = 'Oakland Site';

  const truck = new Truck();
  truck.id = 1;
  truck.license = 'XYZ-999';

  const t = new Ticket();
  t.id = 'uuid-abc';
  t.siteId = 10;
  t.truckId = 1;
  t.ticketNumber = 5;
  t.material = Material.Soil;
  t.status = TicketStatus.Active;
  t.dispatchedAt = new Date('2026-03-15T10:00:00Z');
  t.site = site;
  t.truck = truck;
  return t;
};

describe('TicketResponseDto.fromEntity', () => {
  it('maps all fields from a fully-populated Ticket entity', () => {
    const ticket = makeTicket();
    const dto = TicketResponseDto.fromEntity(ticket);

    expect(dto.id).toBe('uuid-abc');
    expect(dto.ticketNumber).toBe(5);
    expect(dto.material).toBe(Material.Soil);
    expect(dto.status).toBe(TicketStatus.Active);
    expect(dto.dispatchedAt).toEqual(new Date('2026-03-15T10:00:00Z'));
    expect(dto.siteName).toBe('Oakland Site');
    expect(dto.truckLicense).toBe('XYZ-999');
  });

  it('falls back to empty string when site relation is missing', () => {
    const ticket = makeTicket();
    ticket.site = undefined as unknown as Site;

    const dto = TicketResponseDto.fromEntity(ticket);

    expect(dto.siteName).toBe('');
  });

  it('falls back to empty string when truck relation is missing', () => {
    const ticket = makeTicket();
    ticket.truck = undefined as unknown as Truck;

    const dto = TicketResponseDto.fromEntity(ticket);

    expect(dto.truckLicense).toBe('');
  });
});
