import { DatabaseAdapter } from '@campus-forum/core';

export function initializeSchema(db: DatabaseAdapter): void {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      device_code TEXT UNIQUE,
      is_admin INTEGER DEFAULT 0,
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
      author_id INTEGER NOT NULL REFERENCES users(id),
      board_id INTEGER NOT NULL REFERENCES boards(id),
      is_anonymous INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      images TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Comments
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id),
      post_id INTEGER NOT NULL REFERENCES posts(id),
      parent_id INTEGER REFERENCES comments(id),
      is_anonymous INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Votes (up/down)
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      post_id INTEGER REFERENCES posts(id),
      comment_id INTEGER REFERENCES comments(id),
      value INTEGER NOT NULL CHECK(value IN (-1, 1)),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, post_id),
      UNIQUE(user_id, comment_id)
    );

    -- Favorites
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      post_id INTEGER NOT NULL REFERENCES posts(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, post_id)
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

    -- Sessions (for express-session)
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired TEXT NOT NULL
    );
  `);
}
