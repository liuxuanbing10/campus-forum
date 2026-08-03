import { DatabaseAdapter } from '@campus-forum/core';
export declare const migrations: [string, string][];
/** 迁移：用 _migrations 表记录已执行的迁移 */
export declare function migrateSchema(db: DatabaseAdapter): Promise<void>;
//# sourceMappingURL=migrations.d.ts.map