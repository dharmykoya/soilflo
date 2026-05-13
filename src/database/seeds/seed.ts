import { AppDataSource } from '../data-source';
import { seedSites } from './sites.seeder';
import { seedTrucks } from './trucks.seeder';

async function run(): Promise<void> {
  console.log('Initialising database connection…');
  await AppDataSource.initialize();

  console.log('Running migrations…');
  await AppDataSource.runMigrations();

  console.log('Seeding sites…');
  await seedSites(AppDataSource);

  console.log('Seeding trucks…');
  await seedTrucks(AppDataSource);

  await AppDataSource.destroy();
  console.log('Done.');
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
