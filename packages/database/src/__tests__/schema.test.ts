import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createDatabase, initializeSchema, migrateSchema } from '@campus-forum/database';
import { migrations } from '../schema/migrations.js';

let db: Awaited<ReturnType<typeof createDatabase>>;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forum-schema-test-'));
const dbPath = path.join(tmpDir, 'schema.db');

// 基础表（由 tables.ts 的 TABLES_SQL 创建）
const BASE_TABLES = [
  'users', 'boards', 'posts', 'comments', 'votes', 'favorites',
  'team_categories', 'teams', 'team_members', 'team_posts',
  'team_content_posts', 'team_announcements', 'team_favorites', 'team_files',
  'team_content_comments', 'notifications', 'tags', 'post_tags',
  'uploaded_images', 'follows', 'oauth_accounts', 'sessions',
];

// 增量迁移创建的表（migrations.ts）
const MIGRATION_TABLES = [
  'reports', 'post_versions', 'audit_logs', 'conversations', 'messages',
  'sensitive_words', 'device_blacklist', 'user_devices', 'oauth_temp_tokens',
  'achievements', 'user_achievements',
];

async function tableList(): Promise<string[]> {
  const rows = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  );
  return rows.map(r => r.name);
}

beforeAll(async () => {
  db = await createDatabase(dbPath);
  // 首次：初始化基础 schema + 执行迁移
  await initializeSchema(db);
  await migrateSchema(db);
  // 二次：验证幂等性（重复执行不应报错或产生重复表）
  await migrateSchema(db);
});

afterAll(async () => {
  try { db.close(); } catch {}
  await new Promise(r => setTimeout(r, 200));
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

describe('数据库 Schema 引导', () => {
  it('基础表（tables.ts 真相源）全部存在', async () => {
    const tables = await tableList();
    for (const t of BASE_TABLES) {
      expect(tables, `缺少基础表 ${t}`).toContain(t);
    }
  });

  it('增量迁移创建的表全部存在', async () => {
    const tables = await tableList();
    for (const t of MIGRATION_TABLES) {
      expect(tables, `缺少迁移表 ${t}`).toContain(t);
    }
  });

  it('迁移幂等：_migrations 记录数稳定且表格集合不变', async () => {
    const first = await tableList();
    // 第三次执行，模拟重复启动
    await migrateSchema(db);
    const second = await tableList();
    expect(second.sort()).toEqual(first.sort());

    const recorded = await db.all<{ name: string }>('SELECT name FROM _migrations');
    // 不应有重复迁移记录
    const names = recorded.map(m => m.name);
    expect(new Set(names).size).toBe(names.length);
    // 全部迁移均应被记录（幂等后无遗漏），数量与 migrations 定义一致
    expect(names.length).toBe(migrations.length);
  });

  it('notifications 表包含 related_team_id 列（tables.ts 与迁移一致）', async () => {
    const cols = await db.all<{ name: string }>('PRAGMA table_info(notifications)');
    const colNames = cols.map(c => c.name);
    expect(colNames).toContain('related_team_id');
  });

  it('users 表包含迁移追加的关键列', async () => {
    const cols = await db.all<{ name: string }>('PRAGMA table_info(users)');
    const colNames = cols.map(c => c.name);
    for (const c of ['role', 'is_banned', 'banned_until', 'ban_reason', 'points', 'email_verified', 'bio']) {
      expect(colNames, `users 缺少列 ${c}`).toContain(c);
    }
  });
});
