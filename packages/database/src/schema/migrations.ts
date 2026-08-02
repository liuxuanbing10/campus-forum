import { DatabaseAdapter, createLogger } from '@campus-forum/core';

const logger = createLogger('database:migrate');

/**
 * 迁移定义：[name, upSql, downSql?]
 * - downSql 可选：提供时支持 rollback；不提供则视为不可逆
 * - SQLite ≥ 3.35 支持 ALTER TABLE DROP COLUMN
 */
export const migrations: [string, string, string?][] = [
  ['add_images', `ALTER TABLE posts ADD COLUMN images TEXT`, `ALTER TABLE posts DROP COLUMN images`],
  ['add_is_pinned', `ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0`, `ALTER TABLE posts DROP COLUMN is_pinned`],
  ['add_is_banned', `ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0`, `ALTER TABLE users DROP COLUMN is_banned`],
  ['add_role', `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, `ALTER TABLE users DROP COLUMN role`],
  ['add_notifications', `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, message TEXT NOT NULL,
    related_post_id INTEGER REFERENCES posts(id),
    related_comment_id INTEGER REFERENCES comments(id),
    from_user_id INTEGER REFERENCES users(id),
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS notifications`],
  ['add_is_private', `ALTER TABLE posts ADD COLUMN is_private INTEGER DEFAULT 0`, `ALTER TABLE posts DROP COLUMN is_private`],
  ['add_email', `ALTER TABLE users ADD COLUMN email TEXT`, `ALTER TABLE users DROP COLUMN email`],
  ['add_team_categories', `CREATE TABLE IF NOT EXISTS team_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0
  )`, `DROP TABLE IF EXISTS team_categories`],
  ['add_team_category_id', `ALTER TABLE teams ADD COLUMN category_id INTEGER`, `ALTER TABLE teams DROP COLUMN category_id`],
  ['add_team_invite_code', `ALTER TABLE teams ADD COLUMN invite_code TEXT`, `ALTER TABLE teams DROP COLUMN invite_code`],
  ['add_team_hide_members', `ALTER TABLE teams ADD COLUMN hide_members INTEGER DEFAULT 0`, `ALTER TABLE teams DROP COLUMN hide_members`],
  ['add_team_posts', `CREATE TABLE IF NOT EXISTS team_posts (
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, post_id)
  )`, `DROP TABLE IF EXISTS team_posts`],
  ['add_team_announcements', `CREATE TABLE IF NOT EXISTS team_announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id),
    is_pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS team_announcements`],
  ['add_team_favorites', `CREATE TABLE IF NOT EXISTS team_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, team_id)
  )`, `DROP TABLE IF EXISTS team_favorites`],
  ['add_last_replied_at', `ALTER TABLE posts ADD COLUMN last_replied_at TEXT`, `ALTER TABLE posts DROP COLUMN last_replied_at`],
  ['add_follows', `CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, followed_id)
  )`, `DROP TABLE IF EXISTS follows`],
  ['add_reports', `CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK(target_type IN ('post','comment')),
    target_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
    handled_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS reports`],
  ['add_post_versions', `CREATE TABLE IF NOT EXISTS post_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    title TEXT NOT NULL, content TEXT NOT NULL,
    edited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS post_versions`],
  ['add_audit_logs', `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, target_type TEXT, target_id INTEGER,
    detail TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS audit_logs`],
  ['add_points', `ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`, `ALTER TABLE users DROP COLUMN points`],
  ['add_last_active', `ALTER TABLE users ADD COLUMN last_active_at TEXT`, `ALTER TABLE users DROP COLUMN last_active_at`],
  ['add_edited_at', `ALTER TABLE comments ADD COLUMN edited_at TEXT`, `ALTER TABLE comments DROP COLUMN edited_at`],
  ['add_bio', `ALTER TABLE users ADD COLUMN bio TEXT`, `ALTER TABLE users DROP COLUMN bio`],
  ['add_messages', `CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message TEXT, last_message_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user1_id, user2_id)
  )`, `DROP TABLE IF EXISTS conversations`],
  ['add_messages_table', `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS messages`],
  ['add_oauth', `CREATE TABLE IF NOT EXISTS oauth_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, provider_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(provider, provider_id)
  )`, `DROP TABLE IF EXISTS oauth_accounts`],
  ['add_sensitive_words', `CREATE TABLE IF NOT EXISTS sensitive_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS sensitive_words`],
  ['add_is_pending', `ALTER TABLE posts ADD COLUMN is_pending INTEGER DEFAULT 0`, `ALTER TABLE posts DROP COLUMN is_pending`],
  ['add_email_verify', `ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`, `ALTER TABLE users DROP COLUMN email_verified`],
  ['add_device_blacklist', `CREATE TABLE IF NOT EXISTS device_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    device_name TEXT,
    reason TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`, `DROP TABLE IF EXISTS device_blacklist`],
  ['add_user_devices', `CREATE TABLE IF NOT EXISTS user_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_info TEXT,
    is_active INTEGER DEFAULT 1,
    last_login_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, `DROP TABLE IF EXISTS user_devices`],
  ['add_ban_until_reason', `ALTER TABLE users ADD COLUMN banned_until TEXT`, `ALTER TABLE users DROP COLUMN banned_until`],
  ['add_ban_reason', `ALTER TABLE users ADD COLUMN ban_reason TEXT`, `ALTER TABLE users DROP COLUMN ban_reason`],
  ['add_team_content_posts', `CREATE TABLE IF NOT EXISTS team_content_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_pinned INTEGER DEFAULT 0,
    images TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS team_content_posts`],
  ['add_team_files', `CREATE TABLE IF NOT EXISTS team_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`, `DROP TABLE IF EXISTS team_files`],
  ['add_oss_file_storage', `
    ALTER TABLE team_files ADD COLUMN storage TEXT DEFAULT 'db';
    ALTER TABLE team_files ADD COLUMN oss_key TEXT;
  `, `
    ALTER TABLE team_files DROP COLUMN storage;
    ALTER TABLE team_files DROP COLUMN oss_key;
  `],
  ['add_team_content_comments', `
    CREATE TABLE IF NOT EXISTS team_content_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES team_content_posts(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `, `DROP TABLE IF EXISTS team_content_comments`],
  ['add_performance_indexes', `
    CREATE INDEX IF NOT EXISTS idx_posts_board_id ON posts(board_id);
    CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
    
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
    CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_votes_post_id ON votes(post_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
    
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
  `, `
    DROP INDEX IF EXISTS idx_posts_board_id;
    DROP INDEX IF EXISTS idx_posts_author_id;
    DROP INDEX IF EXISTS idx_posts_created_at;
    DROP INDEX IF EXISTS idx_posts_is_pinned;
    DROP INDEX IF EXISTS idx_comments_post_id;
    DROP INDEX IF EXISTS idx_comments_author_id;
    DROP INDEX IF EXISTS idx_comments_created_at;
    DROP INDEX IF EXISTS idx_votes_post_id;
    DROP INDEX IF EXISTS idx_votes_user_id;
    DROP INDEX IF EXISTS idx_notifications_user_id;
    DROP INDEX IF EXISTS idx_notifications_is_read;
    DROP INDEX IF EXISTS idx_notifications_created_at;
    DROP INDEX IF EXISTS idx_team_members_team_id;
    DROP INDEX IF EXISTS idx_team_members_user_id;
    DROP INDEX IF EXISTS idx_team_members_status;
    DROP INDEX IF EXISTS idx_messages_conversation_id;
    DROP INDEX IF EXISTS idx_messages_sender_id;
    DROP INDEX IF EXISTS idx_messages_created_at;
    DROP INDEX IF EXISTS idx_audit_logs_created_at;
    DROP INDEX IF EXISTS idx_audit_logs_admin_id;
  `],
  ['add_oauth_temp_tokens', `
    CREATE TABLE IF NOT EXISTS oauth_temp_tokens (
      token TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      provider_username TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_temp_tokens_expires ON oauth_temp_tokens(expires_at);
  `, `DROP TABLE IF EXISTS oauth_temp_tokens`],
  ['add_achievements', `
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '🏆',
      category TEXT NOT NULL DEFAULT 'general',
      points INTEGER NOT NULL DEFAULT 10,
      condition_desc TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      unlocked_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, achievement_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
  `, `
    DROP TABLE IF EXISTS user_achievements;
    DROP TABLE IF EXISTS achievements;
  `],
  ['seed_achievements', `
    INSERT OR IGNORE INTO achievements (key, name, description, icon, category, points, condition_desc, sort_order) VALUES
      -- 📝 内容创作
      ('first_post', '初露锋芒', '发表你的第 1 个帖子', '📝', 'content', 10, '发布第 1 个帖子', 1),
      ('ten_posts', '笔耕不辍', '累计发表 10 个帖子', '✍️', 'content', 30, '累计发布 10 个帖子', 2),
      ('fifty_posts', '文思泉涌', '累计发表 50 个帖子', '📚', 'content', 80, '累计发布 50 个帖子', 3),
      ('hundred_posts', '著作等身', '累计发表 100 个帖子', '📖', 'content', 150, '累计发布 100 个帖子', 4),
      ('thousand_posts', '论坛文豪', '累计发表 500 个帖子', '🏅', 'content', 500, '累计发布 500 个帖子', 5),
      -- 💬 社交互动
      ('first_comment', '初次交流', '发表你的第 1 条评论', '💬', 'social', 5, '发布第 1 条评论', 6),
      ('fifty_comments', '活跃分子', '累计发表 50 条评论', '🗣️', 'social', 25, '累计发布 50 条评论', 7),
      ('twohundred_comments', '话题王', '累计发表 200 条评论', '🎯', 'social', 60, '累计发布 200 条评论', 8),
      ('fivehundred_comments', '知无不言', '累计发表 500 条评论', '👑', 'social', 120, '累计发布 500 条评论', 9),
      -- ❤️ 点赞与收藏
      ('hundred_likes', '初具人气', '累计获得 100 个赞', '🔥', 'popularity', 30, '获得 100 个赞', 10),
      ('fivehundred_likes', '人气达人', '累计获得 500 个赞', '⭐', 'popularity', 80, '获得 500 个赞', 11),
      ('thousand_likes', '万人迷', '累计获得 1000 个赞', '🌟', 'popularity', 200, '获得 1000 个赞', 12),
      ('first_favorite', '初识收藏', '收藏第 1 个帖子', '💖', 'popularity', 5, '收藏第 1 个帖子', 13),
      -- 👥 团队协作
      ('first_team', '团队新人', '加入第 1 个团队', '🤝', 'team', 10, '加入第 1 个团队', 14),
      ('create_team', '团队核心', '创建第 1 个团队', '🚀', 'team', 30, '创建第 1 个团队', 15),
      ('five_teams', '社交蝴蝶', '加入 5 个团队', '🦋', 'team', 50, '加入 5 个团队', 16),
      -- 💪 活跃度
      ('seven_day', '初来乍到', '注册满 7 天', '🌱', 'activity', 10, '注册满 7 天', 17),
      ('thirty_day', '常驻居民', '注册满 30 天', '🌿', 'activity', 30, '注册满 30 天', 18),
      ('hundred_day', '论坛元老', '注册满 100 天', '🌳', 'activity', 100, '注册满 100 天', 19),
      ('thousand_views', '阅读达人', '总浏览数达到 1000', '👀', 'activity', 20, '累计 1000 次浏览', 20),
      ('ten_thousand_views', '博学者', '总浏览数达到 10000', '🧠', 'activity', 100, '累计 10000 次浏览', 21),
      -- 🏆 特殊成就
      ('hot_thread', '火钳刘明', '发布一个获得 10+ 评论的帖子', '🔥', 'special', 20, '单帖评论 10+', 22),
      ('viral_post', '一夜爆红', '单帖获得 50+ 赞', '💥', 'special', 80, '单帖点赞 50+', 23),
      ('first_report', '论坛守护者', '成功举报违规内容', '🛡️', 'special', 10, '举报并处理违规', 24);
  `, `DELETE FROM achievements WHERE key IN ('first_post','ten_posts','fifty_posts','hundred_posts','thousand_posts','first_comment','fifty_comments','twohundred_comments','fivehundred_comments','hundred_likes','fivehundred_likes','thousand_likes','first_favorite','first_team','create_team','five_teams','seven_day','thirty_day','hundred_day','thousand_views','ten_thousand_views','hot_thread','viral_post','first_report')`],
  ['add_repeatable_achievements', `
    -- 为成就表添加重复区间与上限字段
    ALTER TABLE achievements ADD COLUMN repeat_interval INTEGER DEFAULT 0;
    ALTER TABLE achievements ADD COLUMN max_repeats INTEGER DEFAULT 0;

    -- 为用户成就表添加重复计数
    ALTER TABLE user_achievements ADD COLUMN repeat_count INTEGER DEFAULT 1;

    -- 可重复成就：每 N 个单位触发一次，有上限
    INSERT OR IGNORE INTO achievements (key, name, description, icon, category, points, condition_desc, sort_order, repeat_interval, max_repeats) VALUES
      ('repeat_posts',   '发帖狂人',   '每累计 100 个帖子自动获得（可重复）', '📈', 'content',    50,  '每 100 帖', 25, 100, 99),
      ('repeat_comments','评论先锋',   '每累计 200 条评论自动获得（可重复）', '📊', 'social',     40,  '每 200 评', 26, 200, 99),
      ('repeat_likes',   '人气超新星', '每累计 500 个赞自动获得（可重复）',   '💫', 'popularity', 100, '每 500 赞', 27, 500, 99);
  `, `
    DELETE FROM achievements WHERE key IN ('repeat_posts','repeat_comments','repeat_likes');
    ALTER TABLE user_achievements DROP COLUMN repeat_count;
    ALTER TABLE achievements DROP COLUMN max_repeats;
    ALTER TABLE achievements DROP COLUMN repeat_interval;
  `],
  ['setup_role_system', `
    -- 设置现有 admin 为 superadmin，其余为 user
    UPDATE users SET role='superadmin' WHERE is_admin=1 AND (role IS NULL OR role='user' OR role='admin');
    UPDATE users SET role='user' WHERE role IS NULL OR role='';
    -- 确保 is_banned=1 的用户角色为 banned
    UPDATE users SET role='banned' WHERE is_banned=1 AND role!='superadmin';
  `],
  ['add_image_service_columns', `
    ALTER TABLE uploaded_images ADD COLUMN storage TEXT DEFAULT 'db';
    ALTER TABLE uploaded_images ADD COLUMN width INTEGER;
    ALTER TABLE uploaded_images ADD COLUMN height INTEGER;
    ALTER TABLE uploaded_images ADD COLUMN thumb_filename TEXT;
  `, `
    ALTER TABLE uploaded_images DROP COLUMN thumb_filename;
    ALTER TABLE uploaded_images DROP COLUMN height;
    ALTER TABLE uploaded_images DROP COLUMN width;
    ALTER TABLE uploaded_images DROP COLUMN storage;
  `],
];

/** 迁移：用 _migrations 表记录已执行的迁移 */
export async function migrateSchema(db: DatabaseAdapter): Promise<void> {
  // 建迁移记录表
  await db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  for (const [name, upSql] of migrations) {
    const done = await db.get<{ id: number }>('SELECT id FROM _migrations WHERE name = ?', name);
    if (done) continue;
    try {
      await db.exec(upSql);
    } catch (err) {
      // 基表（tables.ts 的 TABLES_SQL）已包含这些列时，增量迁移的
      // ALTER TABLE ... ADD COLUMN 会因「duplicate column」失败，属幂等场景，
      // 视为已应用；其它错误（如表不存在、语法错误）仍应抛出。
      const msg = (err as Error)?.message ?? String(err);
      if (!/duplicate column/i.test(msg)) throw err;
      logger.debug(`迁移 ${name} 跳过（列已存在，幂等）`);
    }
    // 无论是否幂等跳过，都记录为已执行，避免每次启动重复尝试
    await db.run('INSERT OR IGNORE INTO _migrations (name) VALUES (?)', name);
  }
}

/**
 * 回滚最近 N 条迁移（默认 1 条）。
 * 按 _migrations 表中的 id 倒序执行 down SQL。
 * 若某条迁移没有 down SQL，则跳过并警告。
 */
export async function rollbackSchema(db: DatabaseAdapter, steps = 1): Promise<string[]> {
  const applied = await db.all<{ id: number; name: string }>(
    'SELECT id, name FROM _migrations ORDER BY id DESC LIMIT ?', steps,
  );
  if (applied.length === 0) {
    logger.info('没有可回滚的迁移');
    return [];
  }

  const rolledBack: string[] = [];
  for (const { name } of applied) {
    const migration = migrations.find(([n]) => n === name);
    if (!migration) {
      logger.warn(`迁移 "${name}" 在代码中不存在，跳过`);
      continue;
    }
    const downSql = migration[2];
    if (!downSql) {
      logger.warn(`迁移 "${name}" 没有 down SQL（不可逆），跳过`);
      continue;
    }
    try {
      await db.exec(downSql);
      await db.run('DELETE FROM _migrations WHERE name = ?', name);
      rolledBack.push(name);
      logger.info(`✓ 已回滚: ${name}`);
    } catch (err) {
      logger.error(`✗ 回滚 "${name}" 失败: ${(err as Error).message}`);
      throw err;
    }
  }
  return rolledBack;
}
