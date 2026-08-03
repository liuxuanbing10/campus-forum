import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
let __dirname;
try {
    __dirname = path.dirname(fileURLToPath(import.meta.url));
}
catch {
    __dirname = process.cwd();
}
import { createClient as createHttpClient } from '@libsql/client/http';
// 将 libsql 返回行中的 BigInt 转为 number（避免 JSON 序列化报错）
function normalizeRow(row) {
    if (!row)
        return undefined;
    const result = {};
    for (const key of Object.keys(row)) {
        const val = row[key];
        result[key] = typeof val === 'bigint' ? Number(val) : val;
    }
    return result;
}
function normalizeRows(rows) {
    return rows.map(normalRow => normalizeRow(normalRow));
}
// 将多语句 SQL 拆分成单条语句（去掉 -- 注释，按 ; 分割，忽略字符串内的 ;）
function splitSql(sql) {
    const lines = sql.split('\n').filter(l => !l.trim().startsWith('--'));
    const cleaned = lines.join('\n');
    const stmts = [];
    let current = '';
    let inString = false;
    for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch === "'")
            inString = !inString;
        if (ch === ';' && !inString) {
            if (current.trim())
                stmts.push(current.trim());
            current = '';
        }
        else {
            current += ch;
        }
    }
    if (current.trim())
        stmts.push(current.trim());
    return stmts;
}
export class LibSQLAdapter {
    client;
    constructor(client) {
        this.client = client;
    }
    static async create(dbPath) {
        const tursoUrl = process.env.TURSO_DATABASE_URL;
        const tursoToken = process.env.TURSO_AUTH_TOKEN;
        let client;
        if (tursoUrl) {
            client = createHttpClient({ url: tursoUrl, authToken: tursoToken });
        }
        else {
            const { createClient } = await import('@libsql/client');
            const resolvedPath = dbPath || process.env.DATABASE_PATH || path.join(__dirname, '../../data/forum.db');
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            client = createClient({ url: `file:${resolvedPath}` });
        }
        return new LibSQLAdapter(client);
    }
    async get(sql, ...params) {
        const result = await this.client.execute({ sql, args: params });
        return normalizeRow(result.rows[0]);
    }
    async all(sql, ...params) {
        const result = await this.client.execute({ sql, args: params });
        return normalizeRows(result.rows);
    }
    async run(sql, ...params) {
        const result = await this.client.execute({ sql, args: params });
        return {
            lastInsertRowid: result.lastInsertRowid ?? 0,
            changes: result.rowsAffected ?? 0,
        };
    }
    async exec(sql) {
        // 先尝试 executeMultiple（本地 file: 模式更快）
        // 失败则拆分成单条语句逐个执行（兼容远程 Turso HTTP API）
        try {
            await this.client.executeMultiple(sql);
        }
        catch {
            for (const stmt of splitSql(sql)) {
                if (stmt.trim())
                    await this.client.execute(stmt);
            }
        }
    }
    // @libsql/client 的 Client 没有 prepare 方法，用 execute 模拟 PreparedStatement
    prepare(sql) {
        const client = this.client;
        return {
            get: async (...params) => {
                const result = await client.execute({ sql, args: params });
                return normalizeRow(result.rows[0]);
            },
            all: async (...params) => {
                const result = await client.execute({ sql, args: params });
                return normalizeRows(result.rows);
            },
            run: async (...params) => {
                const result = await client.execute({ sql, args: params });
                return {
                    lastInsertRowid: result.lastInsertRowid ?? 0,
                    changes: result.rowsAffected ?? 0,
                };
            },
        };
    }
    close() {
        this.client.close();
    }
}
export async function createDatabase(dbPath) {
    return LibSQLAdapter.create(dbPath);
}
export { initializeSchema } from './schema.js';
export { seedData } from './seed.js';
export { migrateSchema, migrations } from './schema.js';
export { KyselyAdapter, createKyselyDatabase, kyselyQuery } from './kysely-adapter.js';
//# sourceMappingURL=index.js.map