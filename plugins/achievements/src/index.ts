import { Plugin, PluginContext, uid } from '@campus-forum/core';

interface AchievementRow {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  condition_desc: string;
  sort_order: number;
}

interface UserAchievementRow {
  id: number;
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
}

// ── 成就命中检查 ──────────────────────────────

async function checkAndAward(
  ctx: PluginContext,
  userId: number,
  achievementKey: string,
): Promise<{ newlyUnlocked: boolean; achievement?: AchievementRow }> {
  const { db } = ctx;

  // 找到成就定义
  const ach = await db.get<AchievementRow>(
    'SELECT * FROM achievements WHERE key = ?', achievementKey,
  );
  if (!ach) return { newlyUnlocked: false };

  // 检查是否已获得
  const existing = await db.get<UserAchievementRow>(
    'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
    userId, ach.id,
  );
  if (existing) return { newlyUnlocked: false };

  // 条件判断
  let met = false;

  switch (achievementKey) {
    // ── 内容创作 ──
    case 'first_post': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM posts WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 1;
      break;
    }
    case 'ten_posts': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM posts WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 10;
      break;
    }
    case 'fifty_posts': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM posts WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 50;
      break;
    }
    case 'hundred_posts': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM posts WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 100;
      break;
    }
    case 'thousand_posts': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM posts WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 500;
      break;
    }

    // ── 社交互动 ──
    case 'first_comment': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM comments WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 1;
      break;
    }
    case 'fifty_comments': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM comments WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 50;
      break;
    }
    case 'twohundred_comments': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM comments WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 200;
      break;
    }
    case 'fivehundred_comments': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM comments WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 500;
      break;
    }

    // ── 点赞 ──
    case 'hundred_likes': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM votes WHERE value=1 AND post_id IN (SELECT id FROM posts WHERE author_id=?)', userId);
      met = (c?.c ?? 0) >= 100;
      break;
    }
    case 'fivehundred_likes': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM votes WHERE value=1 AND post_id IN (SELECT id FROM posts WHERE author_id=?)', userId);
      met = (c?.c ?? 0) >= 500;
      break;
    }
    case 'thousand_likes': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM votes WHERE value=1 AND post_id IN (SELECT id FROM posts WHERE author_id=?)', userId);
      met = (c?.c ?? 0) >= 1000;
      break;
    }

    // ── 收藏 ──
    case 'first_favorite': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM favorites WHERE user_id=?', userId);
      met = (c?.c ?? 0) >= 1;
      break;
    }

    // ── 团队 ──
    case 'first_team': {
      const c = await db.get<{ c: number }>(
        "SELECT COUNT(*) as c FROM team_members WHERE user_id=? AND status='approved'", userId,
      );
      met = (c?.c ?? 0) >= 1;
      break;
    }
    case 'create_team': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM teams WHERE creator_id=?', userId);
      met = (c?.c ?? 0) >= 1;
      break;
    }
    case 'five_teams': {
      const c = await db.get<{ c: number }>(
        "SELECT COUNT(*) as c FROM team_members WHERE user_id=? AND status='approved'", userId,
      );
      met = (c?.c ?? 0) >= 5;
      break;
    }

    // ── 活跃度 ──
    case 'seven_day': {
      const user = await db.get<{ created_at: string }>('SELECT created_at FROM users WHERE id=?', userId);
      if (user) {
        const days = (Date.now() - new Date(user.created_at + 'Z').getTime()) / 86400000;
        met = days >= 7;
      }
      break;
    }
    case 'thirty_day': {
      const user = await db.get<{ created_at: string }>('SELECT created_at FROM users WHERE id=?', userId);
      if (user) {
        const days = (Date.now() - new Date(user.created_at + 'Z').getTime()) / 86400000;
        met = days >= 30;
      }
      break;
    }
    case 'hundred_day': {
      const user = await db.get<{ created_at: string }>('SELECT created_at FROM users WHERE id=?', userId);
      if (user) {
        const days = (Date.now() - new Date(user.created_at + 'Z').getTime()) / 86400000;
        met = days >= 100;
      }
      break;
    }
    case 'thousand_views': {
      const c = await db.get<{ c: number }>('SELECT COALESCE(SUM(view_count),0) as c FROM posts WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 1000;
      break;
    }
    case 'ten_thousand_views': {
      const c = await db.get<{ c: number }>('SELECT COALESCE(SUM(view_count),0) as c FROM posts WHERE author_id=?', userId);
      met = (c?.c ?? 0) >= 10000;
      break;
    }

    // ── 特殊成就 ──
    case 'hot_thread': {
      const post = await db.get<{ c: number }>(
        'SELECT COUNT(*) as c FROM posts WHERE author_id=? AND id IN (SELECT post_id FROM comments GROUP BY post_id HAVING COUNT(*)>=10)',
        userId,
      );
      met = (post?.c ?? 0) >= 1;
      break;
    }
    case 'viral_post': {
      const post = await db.get<{ c: number }>(
        'SELECT COUNT(*) as c FROM posts WHERE author_id=? AND id IN (SELECT post_id FROM votes WHERE value=1 GROUP BY post_id HAVING COUNT(*)>=50)',
        userId,
      );
      met = (post?.c ?? 0) >= 1;
      break;
    }
    case 'first_report': {
      const c = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM reports WHERE reporter_id=?', userId);
      met = (c?.c ?? 0) >= 1;
      break;
    }
  }

  if (!met) return { newlyUnlocked: false };

  // 授予成就
  await db.run(
    'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
    userId, ach.id,
  );

  // 发放积分奖励
  await db.run('UPDATE users SET points=COALESCE(points,0)+? WHERE id=?', ach.points, userId);

  // 发送通知
  try {
    await (ctx as any).createNotification?.(
      userId,
      'achievement',
      `🎉 解锁成就「${ach.name}」！获得 ${ach.points} 积分奖励`,
    );
  } catch { /* 通知非必需 */ }

  return { newlyUnlocked: true, achievement: ach };
}

// ── 批量检查所有成就（用户触发操作时调用）────

async function checkAllAchievements(ctx: PluginContext, userId: number) {
  const { db } = ctx;
  const all = await db.all<AchievementRow>('SELECT * FROM achievements ORDER BY sort_order');
  const results: { achievement: AchievementRow }[] = [];

  for (const ach of all) {
    const existing = await db.get<UserAchievementRow>(
      'SELECT id FROM user_achievements WHERE user_id=? AND achievement_id=?',
      userId, ach.id,
    );
    if (existing) continue;
    const result = await checkAndAward(ctx, userId, ach.key);
    if (result.newlyUnlocked && result.achievement) {
      results.push({ achievement: result.achievement });
    }
  }

  return results;
}

// ── 路由注册 ──────────────────────────────

export function registerAchievementRoutes(ctx: PluginContext) {
  const { app, db } = ctx;

  // 获取全部成就列表（含用户解锁状态）
  app.get('/api/achievements', async (req) => {
    const u = uid(req);
    const all = await db.all<AchievementRow>('SELECT * FROM achievements ORDER BY sort_order');

    if (!u) {
      return { achievements: all.map(a => ({ ...a, unlocked: false, unlocked_at: null })) };
    }

    const unlocked = await db.all<UserAchievementRow>(
      'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id=?', u,
    );
    const unlockedMap = new Map(unlocked.map(u => [u.achievement_id, u.unlocked_at]));

    return {
      achievements: all.map(a => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlocked_at: unlockedMap.get(a.id) || null,
      })),
    };
  });

  // 获取用户成就统计
  app.get('/api/achievements/stats', async (req) => {
    const totalRow = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM achievements');
    const totalPointsRow = await db.get<{ c: number }>('SELECT COALESCE(SUM(points),0) as c FROM achievements');

    const u = uid(req);
    if (!u) {
      return {
        total: totalRow?.c ?? 0,
        unlocked: 0,
        totalPoints: totalPointsRow?.c ?? 0,
        earnedPoints: 0,
        userPoints: 0,
      };
    }

    const unlockedRow = await db.get<{ c: number }>(
      'SELECT COUNT(*) as c FROM user_achievements WHERE user_id=?', u,
    );
    const pointsRow = await db.get<{ c: number }>(
      'SELECT COALESCE(SUM(a.points),0) as c FROM user_achievements ua JOIN achievements a ON ua.achievement_id=a.id WHERE ua.user_id=?',
      u,
    );
    const userRow = await db.get<{ points: number }>('SELECT points FROM users WHERE id=?', u);

    return {
      total: totalRow?.c ?? 0,
      unlocked: unlockedRow?.c ?? 0,
      totalPoints: totalPointsRow?.c ?? 0,
      earnedPoints: pointsRow?.c ?? 0,
      userPoints: userRow?.points ?? 0,
    };
  });

  // 手动检查成就（由其他操作触发）
  app.post('/api/achievements/check', async (req, rep) => {
    const u = uid(req);
    if (!u) return rep.status(401).send({ error: '请先登录' });
    const results = await checkAllAchievements(ctx, u);
    return { unlocked: results };
  });

  // 检查特定成就（供前端操作后调用）
  app.post('/api/achievements/check/:key', async (req, rep) => {
    const u = uid(req);
    if (!u) return rep.status(401).send({ error: '请先登录' });
    const { key } = req.params as { key: string };
    const result = await checkAndAward(ctx, u, key);
    return result;
  });
}

export const achievementsPlugin: Plugin = {
  manifest: {
    name: 'achievements',
    version: '1.0.0',
    description: '成就/等级系统',
    author: 'campus-forum',
  },
  apply(ctx: PluginContext) {
    registerAchievementRoutes(ctx);
  },
};

export default achievementsPlugin;
