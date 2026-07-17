import { DatabaseAdapter } from '@campus-forum/core';

export async function initializeSchema(db: DatabaseAdapter): Promise<void> {
  await db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      email TEXT,
      device_code TEXT UNIQUE,
      is_admin INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      banned_until TEXT,
      ban_reason TEXT,
      role TEXT DEFAULT 'user',
      bio TEXT,
      last_active_at TEXT,
      points INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Boards (categories/sections)
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Posts
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      is_anonymous INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      is_pending INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      images TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Comments
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      is_anonymous INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Votes (up/down)
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK(value IN (-1, 1)),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, post_id),
      UNIQUE(user_id, comment_id)
    );

    -- Favorites
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, post_id)
    );

    -- Team categories
    CREATE TABLE IF NOT EXISTS team_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    );

    -- Teams
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      avatar TEXT,
      is_public INTEGER DEFAULT 1,
      creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      max_members INTEGER DEFAULT 50,
      category_id INTEGER REFERENCES team_categories(id),
      invite_code TEXT UNIQUE,
      hide_members INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Team members
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member')),
      status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending','approved','rejected')),
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(team_id, user_id)
    );

    -- Team posts
    CREATE TABLE IF NOT EXISTS team_posts (
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, post_id)
    );

    -- Team announcements
    CREATE TABLE IF NOT EXISTS team_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id),
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Team favorites
    CREATE TABLE IF NOT EXISTS team_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, team_id)
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      related_post_id INTEGER REFERENCES posts(id),
      related_comment_id INTEGER REFERENCES comments(id),
      from_user_id INTEGER REFERENCES users(id),
      is_read INTEGER DEFAULT 0,
      related_team_id INTEGER REFERENCES teams(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Tags
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL REFERENCES posts(id),
      tag_id INTEGER NOT NULL REFERENCES tags(id),
      PRIMARY KEY (post_id, tag_id)
    );

    -- Uploaded images
    CREATE TABLE IF NOT EXISTS uploaded_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      filename TEXT,
      mime_type TEXT NOT NULL,
      data TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Follows
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, followed_id)
    );

    -- OAuth accounts
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(provider, provider_id)
    );

    -- Sessions (for express-session)
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired TEXT NOT NULL
    );
  `);
}

/** 迁移：用 _migrations 表记录已执行的迁移 */
export async function migrateSchema(db: DatabaseAdapter): Promise<void> {
  // 建迁移记录表
  await db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const migrations: [string, string][] = [
    ['add_images', `ALTER TABLE posts ADD COLUMN images TEXT`],
    ['add_is_pinned', `ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0`],
    ['add_is_banned', `ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0`],
    ['add_role', `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`],
    ['add_notifications', `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL, message TEXT NOT NULL,
      related_post_id INTEGER REFERENCES posts(id),
      related_comment_id INTEGER REFERENCES comments(id),
      from_user_id INTEGER REFERENCES users(id),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`],
    ['add_is_private', `ALTER TABLE posts ADD COLUMN is_private INTEGER DEFAULT 0`],
    ['add_email', `ALTER TABLE users ADD COLUMN email TEXT`],
    ['add_team_categories', `CREATE TABLE IF NOT EXISTS team_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    )`],
    ['add_team_category_id', `ALTER TABLE teams ADD COLUMN category_id INTEGER`],
    ['add_team_invite_code', `ALTER TABLE teams ADD COLUMN invite_code TEXT`],
    ['add_team_hide_members', `ALTER TABLE teams ADD COLUMN hide_members INTEGER DEFAULT 0`],
    ['add_team_posts', `CREATE TABLE IF NOT EXISTS team_posts (
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, post_id)
    )`],
    ['add_team_announcements', `CREATE TABLE IF NOT EXISTS team_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id),
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`],
    ['add_team_favorites', `CREATE TABLE IF NOT EXISTS team_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, team_id)
    )`],
    ['add_last_replied_at', `ALTER TABLE posts ADD COLUMN last_replied_at TEXT`],
    ['add_follows', `CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, followed_id)
    )`],
    ['add_reports', `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL CHECK(target_type IN ('post','comment')),
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
      handled_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )`],
    ['add_post_versions', `CREATE TABLE IF NOT EXISTS post_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      title TEXT NOT NULL, content TEXT NOT NULL,
      edited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now'))
    )`],
    ['add_audit_logs', `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL, target_type TEXT, target_id INTEGER,
      detail TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`],
    ['add_points', `ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`],
    ['add_last_active', `ALTER TABLE users ADD COLUMN last_active_at TEXT`],
    ['add_edited_at', `ALTER TABLE comments ADD COLUMN edited_at TEXT`],
    ['add_bio', `ALTER TABLE users ADD COLUMN bio TEXT`],
    ['add_messages', `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_message TEXT, last_message_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user1_id, user2_id)
    )`],
    ['add_messages_table', `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`],
    ['add_oauth', `CREATE TABLE IF NOT EXISTS oauth_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, provider_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(provider, provider_id)
    )`],
    ['add_sensitive_words', `CREATE TABLE IF NOT EXISTS sensitive_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`],
    ['add_is_pending', `ALTER TABLE posts ADD COLUMN is_pending INTEGER DEFAULT 0`],
    ['add_email_verify', `ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`],
    ['add_device_blacklist', `CREATE TABLE IF NOT EXISTS device_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      device_name TEXT,
      reason TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`],
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
    )`],
    ['add_ban_until_reason', `ALTER TABLE users ADD COLUMN banned_until TEXT`],
    ['add_ban_reason', `ALTER TABLE users ADD COLUMN ban_reason TEXT`],
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
    `],
  ];

  for (const [name, sql] of migrations) {
    const done = await db.get<{ id: number }>('SELECT id FROM _migrations WHERE name = ?', name);
    if (done) continue;
    try {
      await db.exec(sql);
      await db.run('INSERT INTO _migrations (name) VALUES (?)', name);
    } catch (err) {
      console.warn(`⚠️  迁移 ${name} 失败（可能已存在）:`, (err as Error).message);
    }
  }
}
