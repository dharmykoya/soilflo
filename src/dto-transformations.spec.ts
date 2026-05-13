import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from './shared/pagination/pagination-query.dto';
import { GetTicketsQueryDto } from './modules/tickets/application/get-tickets-query.dto';
import { GetTrucksQueryDto } from './modules/trucks/application/get-trucks-query.dto';
import { BulkCreateTicketsDto } from './modules/tickets/application/dto/bulk-create-tickets.dto';
import { Material } from './modules/tickets/domain/material.enum';

// ---------------------------------------------------------------------------
// PaginationQueryDto
// ---------------------------------------------------------------------------

describe('PaginationQueryDto — @Type transformations', () => {
  it('converts string page and limit to numbers', () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '3', limit: '25' });
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(25);
  });

  it('applies default values when fields are absent', () => {
    const dto = plainToInstance(PaginationQueryDto, {});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// GetTicketsQueryDto
// ---------------------------------------------------------------------------

describe('GetTicketsQueryDto — @Type transformations', () => {
  it('converts string siteId to number', () => {
    const dto = plainToInstance(GetTicketsQueryDto, { siteId: '7' });
    expect(dto.siteId).toBe(7);
  });

  it('preserves string date fields', () => {
    const dto = plainToInstance(GetTicketsQueryDto, {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expect(dto.startDate).toBe('2026-01-01');
    expect(dto.endDate).toBe('2026-12-31');
  });
});

// ---------------------------------------------------------------------------
// GetTrucksQueryDto
// ---------------------------------------------------------------------------

describe('GetTrucksQueryDto — @Type transformations', () => {
  it('converts string siteId to number', () => {
    const dto = plainToInstance(GetTrucksQueryDto, { siteId: '4' });
    expect(dto.siteId).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// BulkCreateTicketsDto — nested @Type transformations
// ---------------------------------------------------------------------------

describe('BulkCreateTicketsDto — @Type transformations', () => {
  it('converts nested ticket items with string truckId to number', () => {
    const dto = plainToInstance(BulkCreateTicketsDto, {
      tickets: [
        {
          truckId: '5',
          dispatchedAt: '2026-01-15T10:00:00.000Z',
          material: Material.Soil,
        },
      ],
    });

    expect(Array.isArray(dto.tickets)).toBe(true);
    expect(dto.tickets[0].truckId).toBe(5);
    expect(dto.tickets[0].material).toBe(Material.Soil);
  });
});
