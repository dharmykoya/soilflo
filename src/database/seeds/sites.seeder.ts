import { DataSource } from 'typeorm';
import * as sitesData from '../../../SitesJSONData.json';
import { Site } from '../../modules/sites/domain/site.entity';

const CHUNK_SIZE = 1_000;

export async function seedSites(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Site);

  const existing = await repo.count();
  if (existing > 0) {
    console.log(`Sites already seeded (${existing} rows). Skipping.`);
    return;
  }

  const sites = (sitesData as Site[]).map((s) => repo.create(s));
  let inserted = 0;

  for (let i = 0; i < sites.length; i += CHUNK_SIZE) {
    await repo
      .createQueryBuilder()
      .insert()
      .into(Site)
      .values(sites.slice(i, i + CHUNK_SIZE))
      .orIgnore() // ON CONFLICT (id) DO NOTHING — idempotent
      .execute();
    inserted += Math.min(CHUNK_SIZE, sites.length - i);
    process.stdout.write(`\r  Sites: ${inserted}/${sites.length}`);
  }

  console.log(`\n  ✓ Seeded ${inserted} sites`);
}
