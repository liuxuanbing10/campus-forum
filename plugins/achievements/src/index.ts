import { Plugin, PluginContext, uid } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

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
  repeat_interval: number;
  max_repeats: number;
}

interface UserAchievementRow {
  id: number;
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
  repeat_count: number;
}

// ── 成就命中检查 ──────────────────────────────

async function checkAndAward(
  ctx: PluginContext,
  userId: number,
  achievementKey: string,
): Promise<{ newlyUnlocked: boolean; achievement?: AchievementRow }> {
  const { db } = ctx;
  const { kdb, q } = kyselyQuery(db);

  // 找到成就定义
  const ach = await q()!.selectFrom('achievements').selectAll().where('key', '=', achievementKey).executeTakeFirst() as AchievementRow | undefined;
  if (!ach) return { newlyUnlocked: false };

  // ── 可重复成就 ──
  if (ach.repeat_interval > 0) {
    // 查询当前已获得的次数
    const existingRows = await kdb.sql<{ id: number; repeat_count: number }>`SELECT id, COALESCE(repeat_count,0) as repeat_count FROM user_achievements WHERE user_id = ${userId} AND achievement_id = ${ach.id}`;
    const existing = existingRows[0];
    const totalAwarded = existing?.repeat_count || 0;

    // 计算总计数
    let totalCount = 0;
    switch (achievementKey) {
      case 'repeat_posts': {
        const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${userId}`;
        totalCount = rows[0]?.c ?? 0;
        break;
      }
      case 'repeat_comments': {
        const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM comments WHERE author_id = ${userId}`;
        totalCount = rows[0]?.c ?? 0;
        break;
      }
      case 'repeat_likes': {
        const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM votes WHERE value=1 AND post_id IN (SELECT id FROM posts WHERE author_id = ${userId})`;
        totalCount = rows[0]?.c ?? 0;
        break;
      }
    }

    const expectedTimes = Math.min(
      Math.floor(totalCount / ach.repeat_interval),
      ach.max_repeats,
    );

    if (expectedTimes > totalAwarded) {
      const timesToAward = expectedTimes - totalAwarded;
      const newTotal = expectedTimes;
      if (existing) {
        await q()!.updateTable('user_achievements').set({ repeat_count: newTotal }).where('id', '=', existing.id).execute();
      } else {
        await q()!.insertInto('user_achievements').values({ user_id: userId, achievement_id: ach.id, repeat_count: newTotal }).execute();
      }
      await kdb.sql<unknown>`UPDATE users SET points=COALESCE(points,0)+${ach.points * timesToAward} WHERE id=${userId}`;
      // 发送通知
      try {
        await (ctx as any).createNotification?.(
          userId,
          'achievement',
          `🎉 成就「${ach.name}」×${timesToAward}！获得 ${ach.points * timesToAward} 积分`,
        );
      } catch { /* 通知非必需 */ }
      return { newlyUnlocked: true, achievement: ach };
    }
    return { newlyUnlocked: false };
  }

  // ── 一次性成就 ──
  const existing = await q()!.selectFrom('user_achievements').select('id').where('user_id', '=', userId).where('achievement_id', '=', ach.id).executeTakeFirst() as UserAchievementRow | undefined;
  if (existing) return { newlyUnlocked: false };

  // 条件判断
  let met = false;

  switch (achievementKey) {
    // ── 内容创作 ──
    case 'first_post': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 1;
      break;
    }
    case 'ten_posts': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 10;
      break;
    }
    case 'fifty_posts': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 50;
      break;
    }
    case 'hundred_posts': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 100;
      break;
    }
    case 'thousand_posts': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 500;
      break;
    }

    // ── 社交互动 ──
    case 'first_comment': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM comments WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 1;
      break;
    }
    case 'fifty_comments': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM comments WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 50;
      break;
    }
    case 'twohundred_comments': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM comments WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 200;
      break;
    }
    case 'fivehundred_comments': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM comments WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 500;
      break;
    }

    // ── 点赞 ──
    case 'hundred_likes': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM votes WHERE value=1 AND post_id IN (SELECT id FROM posts WHERE author_id = ${userId})`;
      met = (rows[0]?.c ?? 0) >= 100;
      break;
    }
    case 'fivehundred_likes': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM votes WHERE value=1 AND post_id IN (SELECT id FROM posts WHERE author_id = ${userId})`;
      met = (rows[0]?.c ?? 0) >= 500;
      break;
    }
    case 'thousand_likes': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM votes WHERE value=1 AND post_id IN (SELECT id FROM posts WHERE author_id = ${userId})`;
      met = (rows[0]?.c ?? 0) >= 1000;
      break;
    }

    // ── 收藏 ──
    case 'first_favorite': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM favorites WHERE user_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 1;
      break;
    }

    // ── 团队 ──
    case 'first_team': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM team_members WHERE user_id = ${userId} AND status = 'approved'`;
      met = (rows[0]?.c ?? 0) >= 1;
      break;
    }
    case 'create_team': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM teams WHERE creator_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 1;
      break;
    }
    case 'five_teams': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM team_members WHERE user_id = ${userId} AND status = 'approved'`;
      met = (rows[0]?.c ?? 0) >= 5;
      break;
    }

    // ── 活跃度 ──
    case 'seven_day': {
      const userRows = await kdb.sql<{ created_at: string }>`SELECT created_at FROM users WHERE id = ${userId}`;
      const user = userRows[0];
      if (user) {
        const days = (Date.now() - new Date(user.created_at + 'Z').getTime()) / 86400000;
        met = days >= 7;
      }
      break;
    }
    case 'thirty_day': {
      const userRows = await kdb.sql<{ created_at: string }>`SELECT created_at FROM users WHERE id = ${userId}`;
      const user = userRows[0];
      if (user) {
        const days = (Date.now() - new Date(user.created_at + 'Z').getTime()) / 86400000;
        met = days >= 30;
      }
      break;
    }
    case 'hundred_day': {
      const userRows = await kdb.sql<{ created_at: string }>`SELECT created_at FROM users WHERE id = ${userId}`;
      const user = userRows[0];
      if (user) {
        const days = (Date.now() - new Date(user.created_at + 'Z').getTime()) / 86400000;
        met = days >= 100;
      }
      break;
    }
    case 'thousand_views': {
      const rows = await kdb.sql<{ c: number }>`SELECT COALESCE(SUM(view_count),0) as c FROM posts WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 1000;
      break;
    }
    case 'ten_thousand_views': {
      const rows = await kdb.sql<{ c: number }>`SELECT COALESCE(SUM(view_count),0) as c FROM posts WHERE author_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 10000;
      break;
    }

    // ── 特殊成就 ──
    case 'hot_thread': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${userId} AND id IN (SELECT post_id FROM comments GROUP BY post_id HAVING COUNT(*) >= 10)`;
      met = (rows[0]?.c ?? 0) >= 1;
      break;
    }
    case 'viral_post': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM posts WHERE author_id = ${userId} AND id IN (SELECT post_id FROM votes WHERE value=1 GROUP BY post_id HAVING COUNT(*) >= 50)`;
      met = (rows[0]?.c ?? 0) >= 1;
      break;
    }
    case 'first_report': {
      const rows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM reports WHERE reporter_id = ${userId}`;
      met = (rows[0]?.c ?? 0) >= 1;
      break;
    }
  }

  if (!met) return { newlyUnlocked: false };

  // 授予成就
  await q()!.insertInto('user_achievements').values({ user_id: userId, achievement_id: ach.id }).execute();

  // 发放积分奖励
  await kdb.sql<unknown>`UPDATE users SET points=COALESCE(points,0)+${ach.points} WHERE id=${userId}`;

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
  const { kdb, q } = kyselyQuery(db);

  const all = await q()!.selectFrom('achievements').selectAll().orderBy('sort_order').execute() as AchievementRow[];
  const results: { achievement: AchievementRow }[] = [];

  for (const ach of all) {
    const existing = await q()!.selectFrom('user_achievements').select('id').where('user_id', '=', userId).where('achievement_id', '=', ach.id).executeTakeFirst() as UserAchievementRow | undefined;
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
  const { kdb, q } = kyselyQuery(db);

  // 获取全部成就列表（含用户解锁状态）
  app.get('/api/achievements', async (req) => {
    const u = uid(req);
    const all = await q()!.selectFrom('achievements').selectAll().orderBy('sort_order').execute() as AchievementRow[];

    if (!u) {
      return { achievements: all.map(a => ({ ...a, unlocked: false, unlocked_at: null })) };
    }

    // 🛡️ 管理员自动全成就
    const userRow = await q()!.selectFrom('users').select('is_admin').where('id', '=', u).executeTakeFirst() as { is_admin: number } | undefined;
    if (userRow?.is_admin) {
      for (const ach of all) {
        if (ach.repeat_interval > 0) {
          // 管理员可重复成就：单行 max_repeats
          const existing = await q()!.selectFrom('user_achievements').select('id').where('user_id', '=', u).where('achievement_id', '=', ach.id).executeTakeFirst() as { id: number } | undefined;
          if (existing) {
            const oldRow = await kdb.sql<{ repeat_count: number }>`SELECT COALESCE(repeat_count,0) AS repeat_count FROM user_achievements WHERE id = ${existing.id}`;
            const oldCount = oldRow[0]?.repeat_count || 0;
            if (oldCount < ach.max_repeats) {
              await q()!.updateTable('user_achievements').set({ repeat_count: ach.max_repeats }).where('id', '=', existing.id).execute();
              await kdb.sql<unknown>`UPDATE users SET points=COALESCE(points,0)+${ach.points * (ach.max_repeats - oldCount)} WHERE id=${u}`;
            }
          } else {
            await q()!.insertInto('user_achievements').values({ user_id: u, achievement_id: ach.id, repeat_count: ach.max_repeats }).execute();
            await kdb.sql<unknown>`UPDATE users SET points=COALESCE(points,0)+${ach.points * ach.max_repeats} WHERE id=${u}`;
          }
        } else {
          const existing = await q()!.selectFrom('user_achievements').select('id').where('user_id', '=', u).where('achievement_id', '=', ach.id).executeTakeFirst() as UserAchievementRow | undefined;
          if (!existing) {
            await q()!.insertInto('user_achievements').values({ user_id: u, achievement_id: ach.id }).execute();
            await kdb.sql<unknown>`UPDATE users SET points=COALESCE(points,0)+${ach.points} WHERE id=${u}`;
          }
        }
      }
    }

    const unlocked = await kdb.sql<any>`SELECT ua.achievement_id, ua.unlocked_at, ua.repeat_count FROM user_achievements ua WHERE ua.user_id = ${u}`;
    const unlockedMap = new Map<number, { unlocked_at: string; repeat_count: number }>();
    for (const ua of unlocked) {
      const prev = unlockedMap.get(ua.achievement_id);
      unlockedMap.set(ua.achievement_id, {
        unlocked_at: ua.unlocked_at,
        repeat_count: (prev?.repeat_count || 0) + (ua.repeat_count || 1),
      });
    }

    return {
      achievements: all.map(a => {
        const ua = unlockedMap.get(a.id);
        const isRepeat = a.repeat_interval > 0;
        return {
          ...a,
          unlocked: !!ua,
          unlocked_at: ua?.unlocked_at || null,
          repeat_count: ua?.repeat_count || 0,
          max_repeats: a.max_repeats,
          repeat_interval: a.repeat_interval,
        };
      }),
    };
  });

  // 获取用户成就统计
  app.get('/api/achievements/stats', async (req) => {
    const totalRows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM achievements`;
    const totalRow = totalRows[0];
    const totalPointsRows = await kdb.sql<{ c: number }>`SELECT COALESCE(SUM(points),0) as c FROM achievements`;
    const totalPointsRow = totalPointsRows[0];

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

    // 🛡️ 管理员自动全成就
    const userRow = await q()!.selectFrom('users').select('is_admin').where('id', '=', u).executeTakeFirst() as { is_admin: number } | undefined;
    if (userRow?.is_admin) {
      const all = await q()!.selectFrom('achievements').selectAll().execute() as AchievementRow[];
      for (const ach of all) {
        const existing = await q()!.selectFrom('user_achievements').select('id').where('user_id', '=', u).where('achievement_id', '=', ach.id).executeTakeFirst() as UserAchievementRow | undefined;
        if (!existing) {
          await q()!.insertInto('user_achievements').values({ user_id: u, achievement_id: ach.id }).execute();
          await kdb.sql<unknown>`UPDATE users SET points=COALESCE(points,0)+${ach.points} WHERE id=${u}`;
        }
      }
    }

    const unlockedRows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM user_achievements WHERE user_id = ${u}`;
    const unlockedRow = unlockedRows[0];
    const pointsRows = await kdb.sql<{ c: number }>`SELECT COALESCE(SUM(a.points),0) as c FROM user_achievements ua JOIN achievements a ON ua.achievement_id = a.id WHERE ua.user_id = ${u}`;
    const pointsRow = pointsRows[0];
    const userPointsRow = await q()!.selectFrom('users').select('points').where('id', '=', u).executeTakeFirst() as { points: number } | undefined;

    return {
      total: totalRow?.c ?? 0,
      unlocked: unlockedRow?.c ?? 0,
      totalPoints: totalPointsRow?.c ?? 0,
      earnedPoints: pointsRow?.c ?? 0,
      userPoints: userPointsRow?.points ?? 0,
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