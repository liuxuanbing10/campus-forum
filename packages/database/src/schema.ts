// Re-export from schema modules (single public entry for the database package)
export { initializeSchema, migrateSchema, migrations } from './schema/index.js';
