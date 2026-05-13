import { DataSource } from 'typeorm';
import * as trucksData from '../../../TrucksJSONData.json';
import { Truck } from '../../modules/trucks/domain/truck.entity';

const CHUNK_SIZE = 1_000;

export async function seedTrucks(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Truck);

  const existing = await repo.count();
  if (existing > 0) {
    console.log(`Trucks already seeded (${existing} rows). Skipping.`);
    return;
  }

  const trucks = (trucksData as { id: number; siteId: number; license: string }[]).map((t) =>
    repo.create({ id: t.id, siteId: t.siteId, license: t.license }),
  );
  let inserted = 0;

  for (let i = 0; i < trucks.length; i += CHUNK_SIZE) {
    await repo
      .createQueryBuilder()
      .insert()
      .into(Truck)
      .values(trucks.slice(i, i + CHUNK_SIZE))
      .orIgnore() // ON CONFLICT (id) DO NOTHING — idempotent
      .execute();
    inserted += Math.min(CHUNK_SIZE, trucks.length - i);
    process.stdout.write(`\r  Trucks: ${inserted}/${trucks.length}`);
  }

  console.log(`\n  ✓ Seeded ${inserted} trucks`);
}
