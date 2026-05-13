import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrucksTable1715000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trucks" (
        "id"         INTEGER       NOT NULL,
        "license"    VARCHAR(20)   NOT NULL,
        "site_id"    INTEGER       NOT NULL,
        "created_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "pk_trucks" PRIMARY KEY ("id"),
        CONSTRAINT "fk_trucks_site" FOREIGN KEY ("site_id")
          REFERENCES "sites" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_trucks_site_id" ON "trucks" ("site_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trucks_site_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trucks"`);
  }
}
