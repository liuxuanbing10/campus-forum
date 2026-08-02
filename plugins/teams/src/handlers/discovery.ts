import type { TeamsContext } from './context.js';

export function registerDiscoveryRoutes(tc: TeamsContext) {
  const { ctx, kdb } = tc;
  const app = ctx.app;

  // ─── 我的团队 ───
  app.get('/api/teams/my', async (req) => {
    const u = req.userId; if (!u) return { teams: [], owned: [], adminOf: [], memberOf: [] };
    const all = await kdb.sql<Record<string, unknown>>`SELECT t.*, tm.role, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t JOIN team_members tm ON t.id=tm.team_id WHERE tm.user_id=${u} AND tm.status='approved' ORDER BY t.created_at DESC`;
    const teams = all;
    return {
      teams,
      owned: teams.filter((t: any) => t.role === 'owner'),
      adminOf: teams.filter((t: any) => t.role === 'admin'),
      memberOf: teams.filter((t: any) => t.role === 'member'),
    };
  });

  // ─── 我收藏的团队 ───
  app.get('/api/teams/favorites', async (req) => {
    const u = req.userId; if (!u) return { teams: [] };
    const all = await kdb.sql<Record<string, unknown>>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t JOIN team_favorites tf ON t.id=tf.team_id WHERE tf.user_id=${u} ORDER BY tf.created_at DESC`;
    const teams = all;
    return { teams };
  });

  // ─── 团队列表（支持分类、排序） ───
  app.get('/api/teams', async (req) => {
    const page = Math.max(1, Number((req.query as Record<string, string>).page) || 1);
    const limit = 20;
    const category = Number((req.query as Record<string, string>).category) || 0;
    const sort = ((req.query as Record<string, string>).sort || 'popular') as string;
    const offset = (page - 1) * limit;

    let orderByCol: string;
    if (sort === 'newest') orderByCol = 't.created_at DESC';
    else if (sort === 'name') orderByCol = 't.name ASC';
    else if (sort === 'posts') orderByCol = 'post_count DESC';
    else orderByCol = 'member_count DESC';

    const teams = category
      ? await kdb.sql<Record<string, unknown>>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.is_public=1 AND t.category_id=${category} ORDER BY ${orderByCol} LIMIT ${limit} OFFSET ${offset}`
      : await kdb.sql<Record<string, unknown>>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.is_public=1 ORDER BY ${orderByCol} LIMIT ${limit} OFFSET ${offset}`;
    return { teams, page, limit, sort, category };
  });

  // ─── 搜索团队 ───
  app.get('/api/teams/search', async (req) => {
    const kw = ((req.query as Record<string, string>).q || '').trim();
    const category = Number((req.query as Record<string, string>).category) || 0;
    if (!kw || kw.length < 2) return { teams: [] };

    const likePattern = `%${kw}%`;
    const teams = category
      ? await kdb.sql<Record<string, unknown>>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.is_public=1 AND t.name LIKE ${likePattern} AND t.category_id=${category} ORDER BY member_count DESC LIMIT 30`
      : await kdb.sql<Record<string, unknown>>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.is_public=1 AND t.name LIKE ${likePattern} ORDER BY member_count DESC LIMIT 30`;
    return { teams };
  });
}
