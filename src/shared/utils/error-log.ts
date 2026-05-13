import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');
const ERROR_LOG = join(LOG_DIR, 'error.log');

export function appendErrorLog(entry: string): void {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(ERROR_LOG, entry + '\n');
}
