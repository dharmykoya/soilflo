import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the correct env file depending on NODE_ENV
const envFile =
  process.env['NODE_ENV'] === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['POSTGRES_HOST'] ?? 'localhost',
  port: Number(process.env['POSTGRES_PORT'] ?? 5432),
  username: process.env['POSTGRES_USER'] ?? 'soilflo',
  password: process.env['POSTGRES_PASSWORD'] ?? 'soilflo',
  database: process.env['POSTGRES_DB'] ?? 'soilflo',
  entities: [path.join(__dirname, '../modules/**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: process.env['NODE_ENV'] === 'development',
});
