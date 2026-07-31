import { PluginContext, uid, isAdmin, requireAuth, notify } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';
import { createTeamSchema, updateTeamSchema, announcementSchema, TeamRow, MemberRow, AnnouncementRow, genInviteCode } from './schemas.js';
import { generateOssKey, getUploadUrl, getDownloadUrl, deleteObject } from './oss.js';

export function registerTeamRoutes(ctx: PluginContext) {
  const { app, db } = ctx;
  const { kdb, q } = kyselyQuery(db);

  async function memberRole(teamId: number, userId: number): Promise<string | null> {
    const row = await q()!.selectFrom('team_members')
      .select('role')
      .where('team_id', '=', teamId)
      .where('user_id', '=', userId)
      .where('status', '=', 'approved')
      .executeTakeFirst() as { role: string } | undefined;
    return row?.role || null;
  }

  async function isTeamAdmin(teamId: number, userId: number): Promise<boolean> {
    return ['owner', 'admin'].includes((await memberRole(teamId, userId)) || '');
  }

  async function isTeamOwner(teamId: number, userId: number): Promise<boolean> {
    return (await memberRole(teamId, userId)) === 'owner';
  }

  async function withMemberCount(team: any): Promise<any> {
    const mcRows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM team_members WHERE team_id=${team.id} AND status='approved'`;
    const mc = mcRows[0]?.c || 0;
    const pcRows = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM team_content_posts WHERE team_id=${team.id}`;
    const pc = pcRows[0]?.c || 0;
    return { ...team, member_count: mc, post_count: pc };
  }

  // ══════════════════════════════════════════
  // 分类管理
  // ══════════════════════════════════════════

  app.get('/api/team-categories', async () => {
    const categories = await q()!.selectFrom('team_categories')
      .selectAll()
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc')
      .execute();
    return { categories };
  });

  app.post('/api/team-categories', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const { name, icon, sortOrder } = req.body as any;
    if (!name?.trim()) return rep.status(400).send({ error: '分类名不能为空' });
    try {
      await q()!.insertInto('team_categories')
        .values({ name: name.trim(), icon: icon || null, sort_order: sortOrder || 0 })
        .execute();
      return { success: true };
    } catch {
      return rep.status(409).send({ error: '分类名已存在' });
    }
  });

  // ══════════════════════════════════════════
  // 我的团队
  // ══════════════════════════════════════════

  app.get('/api/teams/my', async (req) => {
    const u = uid(req); if (!u) return { teams: [], owned: [], adminOf: [], memberOf: [] };
    const all = await kdb.sql<any>`SELECT t.*, tm.role FROM teams t JOIN team_members tm ON t.id=tm.team_id WHERE tm.user_id=${u} AND tm.status='approved' ORDER BY t.created_at DESC`;
    const teams = await Promise.all(all.map(withMemberCount));
    return {
      teams,
      owned: teams.filter((t: any) => t.role === 'owner'),
      adminOf: teams.filter((t: any) => t.role === 'admin'),
      memberOf: teams.filter((t: any) => t.role === 'member'),
    };
  });

  // ══════════════════════════════════════════
  // 我收藏的团队
  // ══════════════════════════════════════════

  app.get('/api/teams/favorites', async (req) => {
    const u = uid(req); if (!u) return { teams: [] };
    const all = await kdb.sql<any>`SELECT t.* FROM teams t JOIN team_favorites tf ON t.id=tf.team_id WHERE tf.user_id=${u} ORDER BY tf.created_at DESC`;
    const teams = await Promise.all(all.map(withMemberCount));
    return { teams };
  });

  // ══════════════════════════════════════════
  // 团队列表（支持分类、排序）
  // ══════════════════════════════════════════

  app.get('/api/teams', async (req) => {
    const page = Math.max(1, Number((req.query as any).page) || 1);
    const limit = 20;
    const category = Number((req.query as any).category) || 0;
    const sort = ((req.query as any).sort || 'popular') as string;
    const offset = (page - 1) * limit;

    let orderByCol: string;
    if (sort === 'newest') orderByCol = 't.created_at DESC';
    else if (sort === 'name') orderByCol = 't.name ASC';
    else if (sort === 'posts') orderByCol = 'post_count DESC';
    else orderByCol = 'member_count DESC';

    const teams = category
      ? await kdb.sql<any>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.is_public=1 AND t.category_id=${category} ORDER BY ${orderByCol} LIMIT ${limit} OFFSET ${offset}`
      : await kdb.sql<any>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.is_public=1 ORDER BY ${orderByCol} LIMIT ${limit} OFFSET ${offset}`;
    return { teams, page, limit, sort, category };
  });

  // ══════════════════════════════════════════
  // 搜索团队
  // ══════════════════════════════════════════

  app.get('/api/teams/search', async (req) => {
    const kw = ((req.query as any).q || '').trim();
    const category = Number((req.query as any).category) || 0;
    if (!kw || kw.length < 2) return { teams: [] };

    const likePattern = `%${kw}%`;
    const teams = category
      ? await kdb.sql<any>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.is_public=1 AND t.name LIKE ${likePattern} AND t.category_id=${category} ORDER BY member_count DESC LIMIT 30`
      : await kdb.sql<any>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.is_public=1 AND t.name LIKE ${likePattern} ORDER BY member_count DESC LIMIT 30`;
    return { teams };
  });

  // ══════════════════════════════════════════
  // 创建团队
  // ══════════════════════════════════════════

  app.post('/api/teams', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const { name, description, avatar, isPublic, maxMembers, categoryId, hideMembers } = createTeamSchema.parse(req.body);
    const existing = await q()!.selectFrom('teams').select('id').where('name', '=', name).executeTakeFirst();
    if (existing) return rep.status(409).send({ error: '团队名已存在' });

    let inviteCode = genInviteCode();
    while (await q()!.selectFrom('teams').select('id').where('invite_code', '=', inviteCode).executeTakeFirst()) inviteCode = genInviteCode();

    await q()!.insertInto('teams')
      .values({
        name, description: description || '', avatar: avatar || null,
        is_public: isPublic ? 1 : 0, creator_id: userId,
        max_members: maxMembers, category_id: categoryId || null,
        invite_code: inviteCode, hide_members: hideMembers ? 1 : 0,
      })
      .execute();
    const team = await q()!.selectFrom('teams').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirst() as TeamRow | undefined;
    if (team) {
      await q()!.insertInto('team_members')
        .values({ team_id: team.id, user_id: userId, role: 'owner', status: 'approved' })
        .execute();
    }
    return { success: true, team };
  });

  // ══════════════════════════════════════════
  // 通过邀请码加入
  // ══════════════════════════════════════════

  app.post('/api/teams/join-by-code', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const { code } = req.body as { code?: string };
    if (!code?.trim()) return rep.status(400).send({ error: '请输入邀请码' });
    const team = await q()!.selectFrom('teams').selectAll().where('invite_code', '=', code.trim()).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '邀请码无效' });
    const existing = await q()!.selectFrom('team_members')
      .select('status')
      .where('team_id', '=', team.id)
      .where('user_id', '=', userId)
      .executeTakeFirst() as { status: string } | undefined;
    if (existing) return rep.status(409).send({ error: existing.status === 'pending' ? '已申请，等待审批' : '你已经是团队成员' });
    const countRow = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM team_members WHERE team_id=${team.id} AND status='approved'`;
    const count = countRow[0]?.c || 0;
    if (count >= team.max_members) return rep.status(400).send({ error: '团队人数已满' });
    await q()!.insertInto('team_members')
      .values({ team_id: team.id, user_id: userId, role: 'member', status: 'approved' })
      .execute();
    await notify(ctx, team.creator_id, 'team_joined', `${(req as any).session?.username || '用户'}通过邀请码加入了「${team.name}」`, undefined, undefined, userId, team.id);
    return { success: true, teamId: team.id, message: '已加入团队' };
  });

  // ══════════════════════════════════════════
  // 团队详情
  // ══════════════════════════════════════════

  app.get('/api/teams/:id', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await kdb.sql<any>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.id=${id}`;
    const t = team[0];
    if (!t) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    if (!t.is_public && !(await memberRole(id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const myRole = u ? await memberRole(id, u) : null;
    const myStatus = u ? await q()!.selectFrom('team_members')
      .select('status')
      .where('team_id', '=', id)
      .where('user_id', '=', u)
      .executeTakeFirst() as { status: string } | undefined : null;
    const isFavorited = u ? !!(await q()!.selectFrom('team_favorites')
      .select('id')
      .where('user_id', '=', u)
      .where('team_id', '=', id)
      .executeTakeFirst()) : false;
    t.myRole = myRole;
    t.myApplicationStatus = myRole ? null : myStatus?.status || null;
    t.isFavorited = isFavorited;
    if (!myRole && t.hide_members) {
      t.hide_members_detail = true;
    }
    return t;
  });

  // ══════════════════════════════════════════
  // 更新团队
  // ══════════════════════════════════════════

  app.put('/api/teams/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').selectAll().where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const data = updateTeamSchema.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.avatar !== undefined) updates.avatar = data.avatar;
    if (data.isPublic !== undefined) updates.is_public = data.isPublic ? 1 : 0;
    if (data.maxMembers !== undefined) updates.max_members = data.maxMembers;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId;
    if (data.hideMembers !== undefined) updates.hide_members = data.hideMembers ? 1 : 0;
    if (Object.keys(updates).length === 0) return rep.status(400).send({ error: '没有要更新的字段' });
    updates.updated_at = new Date().toISOString();
    await q()!.updateTable('teams').set(updates).where('id', '=', id).execute();
    return { success: true, message: '团队信息已更新' };
  });

  // ══════════════════════════════════════════
  // 重置邀请码
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/reset-invite', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').selectAll().where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    let code = genInviteCode();
    while (await q()!.selectFrom('teams').select('id').where('invite_code', '=', code).executeTakeFirst()) code = genInviteCode();
    await q()!.updateTable('teams')
      .set({ invite_code: code, updated_at: new Date().toISOString() })
      .where('id', '=', id)
      .execute();
    return { success: true, inviteCode: code };
  });

  // ══════════════════════════════════════════
  // 删除团队
  // ══════════════════════════════════════════

  app.delete('/api/teams/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').selectAll().where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (team.creator_id !== userId && !(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅创建者可删除' });
    await q()!.deleteFrom('team_members').where('team_id', '=', id).execute();
    await q()!.deleteFrom('team_posts').where('team_id', '=', id).execute();
    await q()!.deleteFrom('team_announcements').where('team_id', '=', id).execute();
    await q()!.deleteFrom('team_favorites').where('team_id', '=', id).execute();
    await q()!.deleteFrom('teams').where('id', '=', id).execute();
    return { success: true, message: '团队已删除' };
  });

  // ══════════════════════════════════════════
  // 转让所有权
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/transfer', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamOwner(id, userId))) return rep.status(403).send({ error: '仅创建者可转让' });
    const { newOwnerId } = req.body as { newOwnerId?: number };
    if (!newOwnerId) return rep.status(400).send({ error: '请指定新创建者' });
    const target = await q()!.selectFrom('team_members')
      .selectAll()
      .where('team_id', '=', id)
      .where('user_id', '=', newOwnerId)
      .where('status', '=', 'approved')
      .executeTakeFirst() as MemberRow | undefined;
    if (!target) return rep.status(404).send({ error: '该用户不是团队成员' });
    await q()!.updateTable('team_members').set({ role: 'member' }).where('team_id', '=', id).where('role', '=', 'owner').execute();
    await q()!.updateTable('team_members').set({ role: 'owner' }).where('team_id', '=', id).where('user_id', '=', newOwnerId).execute();
    await q()!.updateTable('teams').set({ creator_id: newOwnerId, updated_at: new Date().toISOString() }).where('id', '=', id).execute();
    const team = await q()!.selectFrom('teams').select('name').where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    await notify(ctx, newOwnerId, 'team_owner_transfer', `你已成为「${team!.name}」的创建者`, undefined, undefined, userId, id);
    return { success: true, message: '已转让所有权' };
  });

  // ══════════════════════════════════════════
  // 设置/取消管理员
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/members/:userId/role', { preHandler: [requireAuth] }, async (req, rep) => {
    const adminId = (req as any).userId as number;
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as any).userId);
    if (!(await isTeamOwner(teamId, adminId))) return rep.status(403).send({ error: '仅创建者可设置管理员' });
    const { role } = req.body as { role?: string };
    if (!['admin', 'member'].includes(role || '')) return rep.status(400).send({ error: '无效角色' });
    const target = await q()!.selectFrom('team_members')
      .selectAll()
      .where('team_id', '=', teamId)
      .where('user_id', '=', targetId)
      .where('status', '=', 'approved')
      .executeTakeFirst() as MemberRow | undefined;
    if (!target) return rep.status(404).send({ error: '成员不存在' });
    if (target.role === 'owner') return rep.status(400).send({ error: '不能修改创建者角色' });
    await q()!.updateTable('team_members').set({ role }).where('team_id', '=', teamId).where('user_id', '=', targetId).execute();
    const team = await q()!.selectFrom('teams').select('name').where('id', '=', teamId).executeTakeFirst() as TeamRow | undefined;
    await notify(ctx, targetId, 'team_role_changed', `你在「${team!.name}」的角色已变更为${role === 'admin' ? '管理员' : '成员'}`, undefined, undefined, adminId, teamId);
    return { success: true, message: '角色已更新' };
  });

  // ══════════════════════════════════════════
  // 收藏/取消收藏
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/favorite', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!team.is_public && !(await memberRole(id, userId))) return rep.status(403).send({ error: '这是私密团队' });
    const existing = await q()!.selectFrom('team_favorites')
      .select('id')
      .where('user_id', '=', userId)
      .where('team_id', '=', id)
      .executeTakeFirst();
    if (existing) {
      await q()!.deleteFrom('team_favorites').where('user_id', '=', userId).where('team_id', '=', id).execute();
      return { success: true, favorited: false };
    } else {
      await q()!.insertInto('team_favorites').values({ user_id: userId, team_id: id }).execute();
      return { success: true, favorited: true };
    }
  });

  // ══════════════════════════════════════════
  // 团队公告
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/announcements', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    if (!team.is_public && !(await memberRole(id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const announcements = await kdb.sql<any>`SELECT a.*, u.username, u.display_name FROM team_announcements a JOIN users u ON a.author_id=u.id WHERE a.team_id=${id} ORDER BY a.is_pinned DESC, a.created_at DESC`;
    return { announcements };
  });

  app.post('/api/teams/:id/announcements', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '仅管理员可发布公告' });
    const { title, content, isPinned } = announcementSchema.parse(req.body);
    await q()!.insertInto('team_announcements')
      .values({ team_id: id, title, content, author_id: userId, is_pinned: isPinned ? 1 : 0 })
      .execute();
    const members = await kdb.sql<{ user_id: number }>`SELECT user_id FROM team_members WHERE team_id=${id} AND status='approved'`;
    const team = await q()!.selectFrom('teams').select('name').where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    for (const m of members) {
      if (m.user_id !== userId) await notify(ctx, m.user_id, 'team_announcement', `「${team!.name}」发布了新公告：${title}`, undefined, undefined, userId, id);
    }
    return { success: true, message: '公告已发布' };
  });

  app.delete('/api/teams/:id/announcements/:aid', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const aid = Number((req.params as { aid: string }).aid);
    const ann = await q()!.selectFrom('team_announcements').selectAll().where('id', '=', aid).where('team_id', '=', id).executeTakeFirst() as AnnouncementRow | undefined;
    if (!ann) return rep.status(404).send({ error: '公告不存在' });
    if (!(await isTeamAdmin(id, userId)) && ann.author_id !== userId) return rep.status(403).send({ error: '无权删除' });
    await q()!.deleteFrom('team_announcements').where('id', '=', aid).execute();
    return { success: true, message: '公告已删除' };
  });

  // ══════════════════════════════════════════
  // 团队帖子
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/posts', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const page = Math.max(1, Number((req.query as any).page) || 1);
    const limit = 20;
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    if (!team.is_public && !(await memberRole(id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const posts = await kdb.sql<any>`SELECT p.*, u.username, u.display_name, u.avatar_url FROM team_posts tp JOIN posts p ON tp.post_id=p.id JOIN users u ON p.author_id=u.id WHERE tp.team_id=${id} AND p.is_pending=0 ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    return { posts, page, limit };
  });

  app.post('/api/teams/:id/posts', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    if (!(await memberRole(id, userId))) return rep.status(403).send({ error: '仅成员可发帖' });
    const { postId } = req.body as { postId?: number };
    if (!postId) return rep.status(400).send({ error: '请指定帖子' });
    const post = await q()!.selectFrom('posts').select(['author_id', 'board_id']).where('id', '=', postId).executeTakeFirst() as { author_id: number; board_id: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    try {
      await q()!.insertInto('team_posts').values({ team_id: id, post_id: postId }).execute();
    } catch {
      return rep.status(409).send({ error: '已关联' });
    }
    return { success: true, message: '已添加到团队' };
  });

  app.delete('/api/teams/:id/posts/:postId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await q()!.selectFrom('posts').select('author_id').where('id', '=', postId).executeTakeFirst() as { author_id: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (!(await isTeamAdmin(id, userId)) && post.author_id !== userId) return rep.status(403).send({ error: '无权移除' });
    await q()!.deleteFrom('team_posts').where('team_id', '=', id).where('post_id', '=', postId).execute();
    return { success: true, message: '已移除' };
  });

  // ══════════════════════════════════════════
  // 团队独立帖子（team_content_posts）
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/content-posts', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const page = Math.max(1, Number((req.query as any).page) || 1);
    const limit = 20;
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const role = u ? await memberRole(id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const posts = await kdb.sql<any>`
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM team_content_comments WHERE post_id=p.id) as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id
      WHERE p.team_id=${id}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    return { posts, page, limit };
  });

  app.post('/api/teams/:id/content-posts', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const role = await memberRole(id, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可发帖' });
    const { title, content, images } = req.body as { title?: string; content?: string; images?: string[] };
    if (!title?.trim()) return rep.status(400).send({ error: '请输入标题' });
    if (!content?.trim()) return rep.status(400).send({ error: '请输入内容' });
    const result = await q()!.insertInto('team_content_posts')
      .values({
        team_id: id, title: title.trim(), content: content.trim(),
        author_id: userId, images: images && images.length > 0 ? JSON.stringify(images) : null,
      })
      .executeTakeFirst();
    const newId = Number(result?.insertId ?? 0);
    const post = await kdb.sql<any>`
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM team_content_comments WHERE post_id=p.id) as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id WHERE p.id=${newId}`;
    return { success: true, post: post[0] };
  });

  app.get('/api/teams/:id/content-posts/:postId', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const role = u ? await memberRole(id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const post = await kdb.sql<any>`
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM team_content_comments WHERE post_id=p.id) as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id WHERE p.id=${postId} AND p.team_id=${id}`;
    if (!post[0]) return rep.status(404).send({ error: '帖子不存在' });
    return post[0];
  });

  app.put('/api/teams/:id/content-posts/:postId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await q()!.selectFrom('team_content_posts')
      .select('author_id')
      .where('id', '=', postId)
      .where('team_id', '=', id)
      .executeTakeFirst() as { author_id: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId && !(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '无权编辑' });
    const { title, content, images, isPinned } = req.body as any;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (images !== undefined) updates.images = images.length > 0 ? JSON.stringify(images) : null;
    if (isPinned !== undefined && (await isTeamAdmin(id, userId))) updates.is_pinned = isPinned ? 1 : 0;
    if (Object.keys(updates).length === 0) return rep.status(400).send({ error: '没有需要更新的字段' });
    updates.updated_at = new Date().toISOString();
    await q()!.updateTable('team_content_posts').set(updates).where('id', '=', postId).where('team_id', '=', id).execute();
    return { success: true, message: '已更新' };
  });

  app.delete('/api/teams/:id/content-posts/:postId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await q()!.selectFrom('team_content_posts')
      .select('author_id')
      .where('id', '=', postId)
      .where('team_id', '=', id)
      .executeTakeFirst() as { author_id: number } | undefined;
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId && !(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '无权删除' });
    await q()!.deleteFrom('team_content_posts').where('id', '=', postId).execute();
    return { success: true, message: '已删除' };
  });

  // ══════════════════════════════════════════
  // 团队内容评论
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/content-posts/:postId/comments', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const role = u ? await memberRole(id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const comments = await kdb.sql<any>`
      SELECT c.id, c.post_id, c.author_id, c.content, c.created_at,
        u.username, u.display_name, u.avatar_url
      FROM team_content_comments c JOIN users u ON c.author_id=u.id
      WHERE c.post_id=${postId} ORDER BY c.created_at ASC`;
    return { comments };
  });

  app.post('/api/teams/:id/content-posts/:postId/comments', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const role = await memberRole(id, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可评论' });
    const { content } = req.body as { content?: string };
    if (!content?.trim()) return rep.status(400).send({ error: '内容不能为空' });
    const result = await q()!.insertInto('team_content_comments')
      .values({ post_id: postId, author_id: userId, content: content.trim() })
      .executeTakeFirst();
    const newId = Number(result?.insertId ?? 0);
    const comment = await kdb.sql<any>`
      SELECT c.id, c.post_id, c.author_id, c.content, c.created_at,
        u.username, u.display_name, u.avatar_url
      FROM team_content_comments c JOIN users u ON c.author_id=u.id WHERE c.id=${newId}`;
    return { success: true, comment: comment[0] };
  });

  app.delete('/api/teams/:id/content-posts/:postId/comments/:commentId', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = (req as any).userId as number;
    const id = Number((req.params as { id: string }).id);
    const commentId = Number((req.params as { commentId: string }).commentId);
    const comment = await q()!.selectFrom('team_content_comments').select('author_id').where('id', '=', commentId).executeTakeFirst() as { author_id: number } | undefined;
    if (!comment) return rep.status(404).send({ error: '评论不存在' });
    if (comment.author_id !== userId && !(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '无权删除' });
    await q()!.deleteFrom('team_content_comments').where('id', '=', commentId).execute();
    return { success: true, message: '已删除' };
  });

  // ══════════════════════════════════════════
  // OSS 签名 URL（前端直传用）
  // ══════════════════════════════════════════

  app.post('/api/oss/upload-url', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const { teamId, name } = req.body as { teamId?: number; name?: string };
    if (!teamId || !name) return rep.status(400).send({ error: '参数不足' });
    const role = await memberRole(teamId, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可上传' });
    const ossKey = generateOssKey(teamId, name);
    const uploadUrl = await getUploadUrl(ossKey);
    return { uploadUrl, ossKey };
  });

  app.get('/api/oss/sign-url', async (req, rep) => {
    const key = (req.query as any).key as string;
    if (!key) return rep.status(400).send({ error: '缺少 key' });
    try {
      const downloadUrl = await getDownloadUrl(key);
      return { downloadUrl };
    } catch (err: any) {
      return rep.status(500).send({ error: err.message || '获取签名 URL 失败' });
    }
  });

  // ══════════════════════════════════════════
  // 团队文件
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/files', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const role = u ? await memberRole(id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const files = await kdb.sql<any>`
      SELECT f.id, f.team_id, f.author_id, f.name, f.original_name, f.mime_type, f.size, f.created_at, f.storage, f.oss_key,
        u.username, u.display_name
      FROM team_files f JOIN users u ON f.author_id=u.id
      WHERE f.team_id=${id} ORDER BY f.created_at DESC`;
    return { files };
  });

  app.post('/api/teams/:id/files', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const role = await memberRole(id, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可上传文件' });
    const { name, mimeType, size, ossKey } = req.body as { name?: string; mimeType?: string; size?: number; ossKey?: string; data?: string };
    if (!name?.trim()) return rep.status(400).send({ error: '文件名不能为空' });

    let storage = 'oss';
    let finalData: string | null = null;
    let finalOssKey: string | null = ossKey || null;
    let finalSize = size || 0;

    if (ossKey) {
      storage = 'oss';
      finalOssKey = ossKey;
    } else {
      const body = req.body as any;
      if (body.data) {
        storage = 'db';
        finalData = body.data;
        finalSize = Math.round((finalData!.length * 3) / 4);
        if (finalSize > 50 * 1024 * 1024) return rep.status(400).send({ error: '文件不能超过 50MB' });
      } else {
        return rep.status(400).send({ error: '请提供文件数据或 OSS key' });
      }
    }

    const result = await q()!.insertInto('team_files')
      .values({
        team_id: id, author_id: userId, name: name.trim(), original_name: name.trim(),
        mime_type: mimeType || 'application/octet-stream', size: finalSize,
        data: finalData || '', storage, oss_key: finalOssKey,
      })
      .executeTakeFirst();
    const newId = Number(result?.insertId ?? 0);
    const file = await kdb.sql<any>`
      SELECT f.id, f.team_id, f.author_id, f.name, f.original_name, f.mime_type, f.size, f.created_at, f.storage, f.oss_key,
        u.username, u.display_name
      FROM team_files f JOIN users u ON f.author_id=u.id WHERE f.id=${newId}`;
    return { success: true, file: file[0] };
  });

  app.delete('/api/teams/:id/files/:fileId', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const fileId = Number((req.params as { fileId: string }).fileId);
    const file = await q()!.selectFrom('team_files')
      .select(['author_id', 'storage', 'oss_key'])
      .where('id', '=', fileId)
      .where('team_id', '=', id)
      .executeTakeFirst() as { author_id: number; storage?: string; oss_key?: string } | undefined;
    if (!file) return rep.status(404).send({ error: '文件不存在' });
    if (file.author_id !== userId && !(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '无权删除' });
    if (file.storage === 'oss' && file.oss_key) {
      try { await deleteObject(file.oss_key); } catch { /* ignore OSS errors */ }
    }
    await q()!.deleteFrom('team_files').where('id', '=', fileId).execute();
    return { success: true, message: '已删除' };
  });

  app.get('/api/teams/:id/files/:fileId/download', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const fileId = Number((req.params as { fileId: string }).fileId);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const role = u ? await memberRole(id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const file = await q()!.selectFrom('team_files').selectAll().where('id', '=', fileId).where('team_id', '=', id).executeTakeFirst() as any;
    if (!file) return rep.status(404).send({ error: '文件不存在' });

    if (file.storage === 'oss' && file.oss_key) {
      const url = await getDownloadUrl(file.oss_key, 3600);
      return rep.redirect(url);
    }

    const buf = Buffer.from(file.data, 'base64');
    rep.header('Content-Type', file.mime_type);
    rep.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    rep.header('Content-Length', buf.length);
    return rep.send(buf);
  });

  // ══════════════════════════════════════════
  // 成员管理
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/join', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').selectAll().where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const existing = await q()!.selectFrom('team_members')
      .select('status')
      .where('team_id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst() as { status: string } | undefined;
    if (existing) return rep.status(409).send({ error: existing.status === 'pending' ? '已申请，等待审批' : '你已经是团队成员' });
    const countRow = await kdb.sql<{ c: number }>`SELECT COUNT(*) as c FROM team_members WHERE team_id=${id} AND status='approved'`;
    const count = countRow[0]?.c || 0;
    if (count >= team.max_members) return rep.status(400).send({ error: '团队人数已满' });
    if (team.is_public) {
      await q()!.insertInto('team_members')
        .values({ team_id: id, user_id: userId, role: 'member', status: 'approved' })
        .execute();
      await notify(ctx, team.creator_id, 'team_joined', `${(req as any).session?.username || '用户'}加入了你的团队「${team.name}」`, undefined, undefined, userId, id);
      return { success: true, message: '已加入团队' };
    } else {
      await q()!.insertInto('team_members')
        .values({ team_id: id, user_id: userId, role: 'member', status: 'pending' })
        .execute();
      const admins = await kdb.sql<{ user_id: number }>`SELECT user_id FROM team_members WHERE team_id=${id} AND role IN ('owner','admin') AND status='approved'`;
      for (const a of admins) await notify(ctx, a.user_id, 'team_join_request', `${(req as any).session?.username || '用户'}申请加入「${team.name}」`, undefined, undefined, userId, id);
      return { success: true, message: '已提交申请，等待审批' };
    }
  });

  app.post('/api/teams/:id/leave', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const member = await q()!.selectFrom('team_members')
      .selectAll()
      .where('team_id', '=', id)
      .where('user_id', '=', userId)
      .where('status', '=', 'approved')
      .executeTakeFirst() as MemberRow | undefined;
    if (!member) return rep.status(400).send({ error: '你不在该团队中' });
    if (member.role === 'owner') return rep.status(400).send({ error: '创建者不能退出，请先转让或删除团队' });
    await q()!.deleteFrom('team_members').where('id', '=', member.id).execute();
    const team = await q()!.selectFrom('teams').select('name').where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    await notify(ctx, team!.creator_id, 'team_member_left', `${(req as any).session?.username || '用户'}退出了「${team!.name}」`, undefined, undefined, userId, id);
    return { success: true, message: '已退出团队' };
  });

  app.get('/api/teams/:id/members', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public', 'hide_members']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const isMember = !!(await memberRole(id, u || 0));
    if (!team.is_public && !isMember) return rep.status(403).send({ error: '这是私密团队' });
    if (team.hide_members && !isMember) {
      return { members: [], hidden: true };
    }
    const members = await kdb.sql<any>`SELECT tm.*, u.username, u.display_name, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=${id} AND tm.status='approved' ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, tm.joined_at`;
    return { members };
  });

  app.get('/api/teams/:id/applications', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '仅管理员可查看' });
    const applications = await kdb.sql<any>`SELECT tm.*, u.username, u.display_name, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=${id} AND tm.status='pending' ORDER BY tm.joined_at DESC`;
    return { applications };
  });

  app.put('/api/teams/:id/members/:userId', async (req, rep) => {
    const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as any).userId);
    if (!(await isTeamAdmin(teamId, adminId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const { action } = req.body as { action?: string };
    if (action === 'approve') {
      await q()!.updateTable('team_members')
        .set({ status: 'approved' })
        .where('team_id', '=', teamId)
        .where('user_id', '=', targetId)
        .where('status', '=', 'pending')
        .execute();
      const team = await q()!.selectFrom('teams').select('name').where('id', '=', teamId).executeTakeFirst() as TeamRow | undefined;
      await notify(ctx, targetId, 'team_join_approved', `你加入「${team!.name}」的申请已通过`, undefined, undefined, undefined, teamId);
      return { success: true, message: '已批准' };
    } else if (action === 'reject') {
      await q()!.deleteFrom('team_members')
        .where('team_id', '=', teamId)
        .where('user_id', '=', targetId)
        .where('status', '=', 'pending')
        .execute();
      return { success: true, message: '已拒绝' };
    }
    return rep.status(400).send({ error: 'action 需为 approve 或 reject' });
  });

  app.delete('/api/teams/:id/members/:userId', async (req, rep) => {
    const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as any).userId);
    if (!(await isTeamAdmin(teamId, adminId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const target = await q()!.selectFrom('team_members')
      .select('role')
      .where('team_id', '=', teamId)
      .where('user_id', '=', targetId)
      .where('status', '=', 'approved')
      .executeTakeFirst() as MemberRow | undefined;
    if (!target) return rep.status(404).send({ error: '成员不存在' });
    if (target.role === 'owner') return rep.status(403).send({ error: '不能移除创建者' });
    if (target.role === 'admin' && !(await isTeamOwner(teamId, adminId))) return rep.status(403).send({ error: '仅创建者可移除管理员' });
    await q()!.deleteFrom('team_members').where('team_id', '=', teamId).where('user_id', '=', targetId).execute();
    return { success: true, message: '已移除' };
  });
}