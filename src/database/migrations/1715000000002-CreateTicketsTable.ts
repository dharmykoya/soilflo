import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketsTable1715000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id"            UUID          NOT NULL,
        "site_id"       INTEGER       NOT NULL,
        "truck_id"      INTEGER       NOT NULL,
        "ticket_number" INTEGER       NOT NULL,
        "material"      VARCHAR(20)   NOT NULL CHECK ("material" IN ('Soil')),
        "status"        VARCHAR(20)   NOT NULL DEFAULT 'active',
        "dispatched_at" TIMESTAMPTZ   NOT NULL,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_tickets"
          PRIMARY KEY ("id"),
        CONSTRAINT "fk_tickets_site"
          FOREIGN KEY ("site_id") REFERENCES "sites" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_tickets_truck"
          FOREIGN KEY ("truck_id") REFERENCES "trucks" ("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_tickets_truck_dispatched"
          UNIQUE ("truck_id", "dispatched_at"),
        CONSTRAINT "uq_tickets_site_ticket_number"
          UNIQUE ("site_id", "ticket_number")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tickets_site_id"     ON "tickets" ("site_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_dispatched_at" ON "tickets" ("dispatched_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_dispatched_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_site_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets"`);
  }
}
