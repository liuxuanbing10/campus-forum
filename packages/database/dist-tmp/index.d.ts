import { DatabaseAdapter, PreparedStatement, RunResult } from '@campus-forum/core';
export declare class LibSQLAdapter implements DatabaseAdapter {
    private client;
    private constructor();
    static create(dbPath?: string): Promise<LibSQLAdapter>;
    get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
    all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
    run(sql: string, ...params: unknown[]): Promise<RunResult>;
    exec(sql: string): Promise<void>;
    prepare<T>(sql: string): PreparedStatement<T>;
    close(): void;
}
export declare function createDatabase(dbPath?: string): Promise<LibSQLAdapter>;
export { initializeSchema } from './schema.js';
export { seedData } from './seed.js';
export { migrateSchema, migrations } from './schema.js';
export { KyselyAdapter, createKyselyDatabase, kyselyQuery } from './kysely-adapter.js';
//# sourceMappingURL=index.d.ts.map