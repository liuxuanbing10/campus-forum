/**
 * KyselyAdapter · 基于 kysely 的 DatabaseAdapter 实现
 * - get/all/run/exec/prepare 与 LibSQLAdapter 完全兼容（用 libsql/client 执行）
 * - 额外提供 query() 方法，返回 Kysely 实例供插件使用类型安全查询构造器
 * - 支持 kysely 的 selectFrom/insertInto/updateTable/deleteFrom 链式 API
 * - 支持 kysely 的 sql`...` 模板标签（自动参数化）
 *
 * 用法：
 *   import { createKyselyDatabase } from '@campus-forum/database';
 *   const db = await createKyselyDatabase();
 *
 *   // 兼容模式（与 LibSQLAdapter 一样）
 *   await db.run('INSERT INTO posts (...) VALUES (?, ?)', ...);
 *
 *   // 类型安全模式（kysely 链式 API）
 *   const posts = await db.query()
 *     .selectFrom('posts')
 *     .selectAll()
 *     .where('is_pinned', '=', 1)
 *     .execute();
 */
import { Kysely } from 'kysely';
import type { DatabaseAdapter, PreparedStatement, RunResult } from '@campus-forum/core';
type AnyDB = Record<string, unknown>;
export declare class KyselyAdapter implements DatabaseAdapter {
    private kysely;
    private libsqlClient;
    private bs3?;
    private constructor();
    /**
     * 创建 KyselyAdapter
     * - 优先用 Turso 远程数据库
     * - 否则用本地 SQLite 文件
     */
    static create(dbPath?: string): Promise<KyselyAdapter>;
    get<T>(sqlText: string, ...params: unknown[]): Promise<T | undefined>;
    all<T>(sqlText: string, ...params: unknown[]): Promise<T[]>;
    run(sqlText: string, ...params: unknown[]): Promise<RunResult>;
    exec(sqlText: string): Promise<void>;
    prepare<T>(sqlText: string): PreparedStatement<T>;
    /**
     * 获取 Kysely 实例，用类型安全的链式 API 查询
     * @example
     * const posts = await db.query()
     *   .selectFrom('posts')
     *   .select(['id', 'title', 'created_at'])
     *   .where('is_pinned', '=', 1)
     *   .orderBy('created_at', 'desc')
     *   .limit(20)
     *   .execute();
     */
    query(): Kysely<AnyDB>;
    /**
     * sql 模板标签（自动参数化，防 SQL 注入）
     * 用 libsql/client 直接执行，参数通过 ? 占位符传入
     * @example
     * const rows = await db.sql`SELECT * FROM posts WHERE id = ${postId}`;
     */
    sql<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
    close(): Promise<void>;
}
/**
 * 创建 KyselyAdapter 实例
 */
export declare function createKyselyDatabase(dbPath?: string): Promise<KyselyAdapter>;
/**
 * 从 DatabaseAdapter 取出 KyselyAdapter 并绑定 query 方法。
 * 替代插件中的 `const kdb = db as KyselyAdapter; const q = kdb.query?.bind(kdb);` 样板。
 * 返回的 kdb 保留 sql/exec/all/run 等兼容接口，q 是绑定的 Kysely 链式查询构造器。
 */
export declare function kyselyQuery(db: DatabaseAdapter): {
    kdb: KyselyAdapter;
    q: () => Kysely<AnyDB>;
};
export {};
//# sourceMappingURL=kysely-adapter.d.ts.map