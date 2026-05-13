import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSitesTable1715000000000 implements MigrationInterface {
  name = 'CreateSitesTable1715000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sites" (
        "id"          INTEGER       NOT NULL,
        "name"        VARCHAR(255)  NOT NULL,
        "address"     VARCHAR(500)  NOT NULL,
        "description" TEXT          NOT NULL,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ,
        CONSTRAINT "PK_sites" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sites"`);
  }
}
