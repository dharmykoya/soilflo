import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { Site } from '../../src/modules/sites/domain/site.entity';
import { Truck } from '../../src/modules/trucks/domain/truck.entity';
import { Ticket } from '../../src/modules/tickets/domain/ticket.entity';
import { SiteTicketCounter } from '../../src/modules/tickets/domain/site-ticket-counter.entity';
import { Material } from '../../src/modules/tickets/domain/material.enum';
import { TicketStatus } from '../../src/modules/tickets/domain/ticket-status.enum';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pastDate = (offsetMs = -60_000) =>
  new Date(Date.now() + offsetMs).toISOString();

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Tickets (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Seed IDs — chosen to avoid clashing with any existing seed data
  const SITE_ID = 9901;
  const TRUCK_A_ID = 9901;
  const TRUCK_B_ID = 9902;
  const TRUCK_OTHER_SITE_ID = 9903;
  const OTHER_SITE_ID = 9902;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    // Clean up in reverse FK order then re-seed
    await dataSource.query(`DELETE FROM site_ticket_counters WHERE site_id IN (${SITE_ID}, ${OTHER_SITE_ID})`);
    await dataSource.query(`DELETE FROM tickets WHERE site_id IN (${SITE_ID}, ${OTHER_SITE_ID})`);
    await dataSource.query(`DELETE FROM trucks WHERE id IN (${TRUCK_A_ID}, ${TRUCK_B_ID}, ${TRUCK_OTHER_SITE_ID})`);
    await dataSource.query(`DELETE FROM sites WHERE id IN (${SITE_ID}, ${OTHER_SITE_ID})`);

    await dataSource.getRepository(Site).save([
      { id: SITE_ID, name: 'E2E Site Alpha', address: '1 Test Rd', description: 'e2e' },
      { id: OTHER_SITE_ID, name: 'E2E Site Beta', address: '2 Test Rd', description: 'e2e' },
    ]);

    await dataSource.getRepository(Truck).save([
      { id: TRUCK_A_ID, license: 'E2E-AAA', siteId: SITE_ID },
      { id: TRUCK_B_ID, license: 'E2E-BBB', siteId: SITE_ID },
      { id: TRUCK_OTHER_SITE_ID, license: 'E2E-OTH', siteId: OTHER_SITE_ID },
    ]);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM site_ticket_counters WHERE site_id IN (${SITE_ID}, ${OTHER_SITE_ID})`);
    await dataSource.query(`DELETE FROM tickets WHERE site_id IN (${SITE_ID}, ${OTHER_SITE_ID})`);
    await dataSource.query(`DELETE FROM trucks WHERE id IN (${TRUCK_A_ID}, ${TRUCK_B_ID}, ${TRUCK_OTHER_SITE_ID})`);
    await dataSource.query(`DELETE FROM sites WHERE id IN (${SITE_ID}, ${OTHER_SITE_ID})`);
    await app.close();
  });

  afterEach(async () => {
    // Clear tickets and counters between tests so ticket numbers are predictable
    await dataSource.query(`DELETE FROM site_ticket_counters WHERE site_id IN (${SITE_ID}, ${OTHER_SITE_ID})`);
    await dataSource.query(`DELETE FROM tickets WHERE site_id IN (${SITE_ID}, ${OTHER_SITE_ID})`);
  });

  // ── POST /tickets ─────────────────────────────────────────────────────────

  describe('POST /tickets', () => {
    it('201 — creates a single ticket and returns it with site name and truck license', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets')
        .send({
          tickets: [{ truckId: TRUCK_A_ID, dispatchedAt: pastDate(), material: 'Soil' }],
        })
        .expect(201);

      expect(res.body.data).toHaveLength(1);
      const ticket = res.body.data[0];
      expect(ticket.ticketNumber).toBe(1);
      expect(ticket.material).toBe(Material.Soil);
      expect(ticket.status).toBe(TicketStatus.Active);
      expect(ticket.siteName).toBe('E2E Site Alpha');
      expect(ticket.truckLicense).toBe('E2E-AAA');
    });

    it('201 — creates multiple tickets with sequential ticket numbers', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets')
        .send({
          tickets: [
            { truckId: TRUCK_A_ID, dispatchedAt: pastDate(-120_000), material: 'Soil' },
            { truckId: TRUCK_B_ID, dispatchedAt: pastDate(-60_000), material: 'Soil' },
          ],
        })
        .expect(201);

      const numbers = res.body.data.map((t: { ticketNumber: number }) => t.ticketNumber).sort((a: number, b: number) => a - b);
      expect(numbers).toEqual([1, 2]);
    });

    it('201 — second batch continues numbering from where the first left off', async () => {
      await request(app.getHttpServer())
        .post('/tickets')
        .send({ tickets: [{ truckId: TRUCK_A_ID, dispatchedAt: pastDate(-300_000), material: 'Soil' }] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/tickets')
        .send({ tickets: [{ truckId: TRUCK_B_ID, dispatchedAt: pastDate(-60_000), material: 'Soil' }] })
        .expect(201);

      expect(res.body.data[0].ticketNumber).toBe(2);
    });

    it('422 — missing required field returns validation error', async () => {
      await request(app.getHttpServer())
        .post('/tickets')
        .send({ tickets: [{ truckId: TRUCK_A_ID, material: 'Soil' }] }) // missing dispatchedAt
        .expect(422);
    });

    it('422 — invalid material enum value', async () => {
      await request(app.getHttpServer())
        .post('/tickets')
        .send({ tickets: [{ truckId: TRUCK_A_ID, dispatchedAt: pastDate(), material: 'Gravel' }] })
        .expect(422);
    });

    it('422 — future dispatchedAt is rejected', async () => {
      const future = new Date(Date.now() + 3_600_000).toISOString();

      await request(app.getHttpServer())
        .post('/tickets')
        .send({ tickets: [{ truckId: TRUCK_A_ID, dispatchedAt: future, material: 'Soil' }] })
        .expect(422);
    });

    it('400 — intra-batch duplicate truck+time is rejected', async () => {
      const time = pastDate();

      await request(app.getHttpServer())
        .post('/tickets')
        .send({
          tickets: [
            { truckId: TRUCK_A_ID, dispatchedAt: time, material: 'Soil' },
            { truckId: TRUCK_A_ID, dispatchedAt: time, material: 'Soil' },
          ],
        })
        .expect(400);
    });

    it('404 — non-existent truckId returns 404', async () => {
      await request(app.getHttpServer())
        .post('/tickets')
        .send({ tickets: [{ truckId: 99999, dispatchedAt: pastDate(), material: 'Soil' }] })
        .expect(404);
    });

    it('400 — trucks from different sites in one batch returns 400', async () => {
      await request(app.getHttpServer())
        .post('/tickets')
        .send({
          tickets: [
            { truckId: TRUCK_A_ID, dispatchedAt: pastDate(-120_000), material: 'Soil' },
            { truckId: TRUCK_OTHER_SITE_ID, dispatchedAt: pastDate(-60_000), material: 'Soil' },
          ],
        })
        .expect(400);
    });

    it('409 — duplicate truck+time already in DB returns 409', async () => {
      const time = pastDate(-120_000);

      await request(app.getHttpServer())
        .post('/tickets')
        .send({ tickets: [{ truckId: TRUCK_A_ID, dispatchedAt: time, material: 'Soil' }] })
        .expect(201);

      await request(app.getHttpServer())
        .post('/tickets')
        .send({ tickets: [{ truckId: TRUCK_A_ID, dispatchedAt: time, material: 'Soil' }] })
        .expect(409);
    });
  });

  // ── GET /tickets ──────────────────────────────────────────────────────────

  describe('GET /tickets', () => {
    beforeEach(async () => {
      // Seed 3 tickets for filter / pagination tests
      await request(app.getHttpServer())
        .post('/tickets')
        .send({
          tickets: [
            { truckId: TRUCK_A_ID, dispatchedAt: '2026-01-10T08:00:00.000Z', material: 'Soil' },
            { truckId: TRUCK_B_ID, dispatchedAt: '2026-02-15T09:00:00.000Z', material: 'Soil' },
            { truckId: TRUCK_A_ID, dispatchedAt: '2026-03-20T10:00:00.000Z', material: 'Soil' },
          ],
        });
    });

    it('200 — returns paginated list with meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: SITE_ID, page: 1, limit: 10 })
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('200 — each ticket has siteName and truckLicense populated', async () => {
      const res = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: SITE_ID, page: 1, limit: 10 })
        .expect(200);

      for (const ticket of res.body.data) {
        expect(ticket.siteName).toBe('E2E Site Alpha');
        expect(typeof ticket.truckLicense).toBe('string');
        expect(ticket.truckLicense.length).toBeGreaterThan(0);
      }
    });

    it('200 — filters by siteId returns only tickets for that site', async () => {
      const res = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: SITE_ID, page: 1, limit: 10 })
        .expect(200);

      expect(res.body.meta.total).toBe(3);
      for (const ticket of res.body.data) {
        expect(ticket.siteName).toBe('E2E Site Alpha');
      }
    });

    it('200 — startDate filter excludes earlier tickets', async () => {
      const res = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: SITE_ID, startDate: '2026-02-01', page: 1, limit: 10 })
        .expect(200);

      expect(res.body.meta.total).toBe(2);
    });

    it('200 — endDate filter excludes later tickets', async () => {
      const res = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: SITE_ID, endDate: '2026-02-28', page: 1, limit: 10 })
        .expect(200);

      expect(res.body.meta.total).toBe(2);
    });

    it('200 — startDate + endDate range returns only tickets within window', async () => {
      const res = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: SITE_ID, startDate: '2026-02-01', endDate: '2026-02-28', page: 1, limit: 10 })
        .expect(200);

      expect(res.body.meta.total).toBe(1);
    });

    it('200 — pagination respects limit and page', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: SITE_ID, page: 1, limit: 2 })
        .expect(200);

      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.meta.totalPages).toBe(2);

      const page2 = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: SITE_ID, page: 2, limit: 2 })
        .expect(200);

      expect(page2.body.data).toHaveLength(1);

      // No overlap between pages
      const ids1 = page1.body.data.map((t: { id: string }) => t.id);
      const ids2 = page2.body.data.map((t: { id: string }) => t.id);
      expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0);
    });

    it('200 — returns empty list when no tickets match the filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/tickets')
        .query({ siteId: OTHER_SITE_ID, page: 1, limit: 10 })
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });
  });
});
