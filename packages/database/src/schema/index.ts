import { DatabaseAdapter } from '@campus-forum/core';
import { TABLES_SQL } from './tables.js';

export async function initializeSchema(db: DatabaseAdapter): Promise<void> {
  await db.exec(TABLES_SQL);
}

export { migrateSchema, migrations } from './migrations.js';
