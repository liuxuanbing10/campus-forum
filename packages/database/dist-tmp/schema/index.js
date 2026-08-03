import { TABLES_SQL } from './tables.js';
export async function initializeSchema(db) {
    await db.exec(TABLES_SQL);
}
export { migrateSchema, migrations } from './migrations.js';
//# sourceMappingURL=index.js.map