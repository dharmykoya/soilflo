/**
 * Must be the FIRST import in main.ts.
 *
 * TypeScript compiles `import` statements to CommonJS `require()` calls that
 * execute in source order. By importing this file first, dotenv is configured
 * before any NestJS module files are evaluated — ensuring that module-level
 * constants such as `QUEUE_ENABLED` read the correct `.env` values.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

const envFile = process.env['NODE_ENV'] === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
