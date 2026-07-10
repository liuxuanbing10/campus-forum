import type { DatabaseAdapter } from '@campus-forum/core';

// ponytail: Turso-backed session store for @fastify/session
// Replaces the default in-memory store so sessions survive across serverless lambda instances

interface SessionData {
  [key: string]: any;
}

// Callback style for @fastify/session Store interface
type Callback = (err?: any) => void;
type CallbackSession = (err: any, result?: SessionData | null) => void;

export class TursoSessionStore {
  private db: DatabaseAdapter;
  private maxAge: number;

  constructor(db: DatabaseAdapter, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    this.db = db;
    this.maxAge = maxAgeMs;
  }

  get(sid: string, callback: CallbackSession): void {
    this.db.get<{ sess: string; expired: string }>(
      'SELECT sess, expired FROM sessions WHERE sid = ?',
      sid,
    ).then(row => {
      if (!row) return callback(null, null);
      // Check expiry
      if (new Date(row.expired) < new Date()) {
        this.db.run('DELETE FROM sessions WHERE sid = ?', sid)
          .then(() => callback(null, null))
          .catch(err => callback(err));
        return;
      }
      try {
        callback(null, JSON.parse(row.sess));
      } catch {
        callback(null, null);
      }
    }).catch(err => callback(err));
  }

  set(sid: string, session: SessionData, callback: Callback): void {
    const expired = new Date(Date.now() + this.maxAge).toISOString();
    const sess = JSON.stringify(session);
    this.db.run(
      'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)',
      sid, sess, expired,
    ).then(() => callback()).catch(err => callback(err));
  }

  destroy(sid: string, callback: Callback): void {
    this.db.run('DELETE FROM sessions WHERE sid = ?', sid)
      .then(() => callback())
      .catch(err => callback(err));
  }
}
