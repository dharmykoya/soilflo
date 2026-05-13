import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSiteTicketCountersTable1715000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "site_ticket_counters" (
        "site_id"            INTEGER   NOT NULL,
        "last_ticket_number" BIGINT    NOT NULL DEFAULT 0,
        CONSTRAINT "pk_site_ticket_counters" PRIMARY KEY ("site_id"),
        CONSTRAINT "fk_site_ticket_counters_site"
          FOREIGN KEY ("site_id") REFERENCES "sites" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "site_ticket_counters"`);
  }
}
