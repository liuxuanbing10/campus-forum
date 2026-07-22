import { PluginContext, uid, isAdmin, notify } from '@campus-forum/core';
import { createTeamSchema, updateTeamSchema, announcementSchema, TeamRow, MemberRow, AnnouncementRow, genInviteCode } from './schemas.js';

export function registerTeamRoutes(ctx: PluginContext) {
  const { app, db } = ctx;

  async function memberRole(teamId: number, userId: number): Promise<string | null> {
    return (await db.get<{ role: string }>('SELECT role FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', teamId, userId))?.role || null;
  }

  async function isTeamAdmin(teamId: number, userId: number): Promise<boolean> {
    return ['owner', 'admin'].includes((await memberRole(teamId, userId)) || '');
  }

  async function isTeamOwner(teamId: number, userId: number): Promise<boolean> {
    return (await memberRole(teamId, userId)) === 'owner';
  }

  async function withMemberCount(team: any): Promise<any> {
    const mc = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_members WHERE team_id=? AND status=\'approved\'', team.id))?.c || 0;
    const pc = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_content_posts WHERE team_id=?', team.id))?.c || 0;
    return { ...team, member_count: mc, post_count: pc };
  }

  // ══════════════════════════════════════════
  // 分类管理
  // ══════════════════════════════════════════

  app.get('/api/team-categories', async () => {
    const categories = await db.all<any>('SELECT * FROM team_categories ORDER BY sort_order, id');
    return { categories };
  });

  app.post('/api/team-categories', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    if (!(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const { name, icon, sortOrder } = req.body as any;
    if (!name?.trim()) return rep.status(400).send({ error: '分类名不能为空' });
    try {
      await db.run('INSERT INTO team_categories (name, icon, sort_order) VALUES (?,?,?)', name.trim(), icon || null, sortOrder || 0);
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
    const all = await db.all<any>(`SELECT t.*, tm.role FROM teams t JOIN team_members tm ON t.id=tm.team_id WHERE tm.user_id=? AND tm.status='approved' ORDER BY t.created_at DESC`, u);
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
    const all = await db.all<any>(`SELECT t.* FROM teams t JOIN team_favorites tf ON t.id=tf.team_id WHERE tf.user_id=? ORDER BY tf.created_at DESC`, u);
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

    let where = 'WHERE t.is_public=1';
    const params: unknown[] = [];
    if (category) { where += ' AND t.category_id=?'; params.push(category); }

    let orderBy = 'member_count DESC';
    if (sort === 'newest') orderBy = 't.created_at DESC';
    else if (sort === 'name') orderBy = 't.name ASC';
    else if (sort === 'posts') orderBy = 'post_count DESC';

    params.push(limit, (page - 1) * limit);
    const teams = await db.all<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, ...params);
    return { teams, page, limit, sort, category };
  });

  // ══════════════════════════════════════════
  // 搜索团队
  // ══════════════════════════════════════════

  app.get('/api/teams/search', async (req) => {
    const q = ((req.query as any).q || '').trim();
    const category = Number((req.query as any).category) || 0;
    if (!q || q.length < 2) return { teams: [] };

    let where = 'WHERE t.is_public=1 AND t.name LIKE ?';
    const params: unknown[] = [`%${q}%`];
    if (category) { where += ' AND t.category_id=?'; params.push(category); }

    const teams = await db.all<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t ${where} ORDER BY member_count DESC LIMIT 30`, ...params);
    return { teams };
  });

  // ══════════════════════════════════════════
  // 创建团队
  // ══════════════════════════════════════════

  app.post('/api/teams', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const { name, description, avatar, isPublic, maxMembers, categoryId, hideMembers } = createTeamSchema.parse(req.body);
    const existing = await db.get<TeamRow>('SELECT id FROM teams WHERE name=?', name);
    if (existing) return rep.status(409).send({ error: '团队名已存在' });

    let inviteCode = genInviteCode();
    while (await db.get('SELECT id FROM teams WHERE invite_code=?', inviteCode)) inviteCode = genInviteCode();

    await db.run('INSERT INTO teams (name,description,avatar,is_public,creator_id,max_members,category_id,invite_code,hide_members) VALUES (?,?,?,?,?,?,?,?,?)',
      name, description, avatar || null, isPublic ? 1 : 0, userId, maxMembers, categoryId || null, inviteCode, hideMembers ? 1 : 0);
    const team = await db.get<TeamRow>('SELECT * FROM teams ORDER BY id DESC LIMIT 1');
    await db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', team!.id, userId, 'owner', 'approved');
    return { success: true, team };
  });

  // ══════════════════════════════════════════
  // 通过邀请码加入
  // ══════════════════════════════════════════

  app.post('/api/teams/join-by-code', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const { code } = req.body as { code?: string };
    if (!code?.trim()) return rep.status(400).send({ error: '请输入邀请码' });
    const team = await db.get<TeamRow>('SELECT * FROM teams WHERE invite_code=?', code.trim());
    if (!team) return rep.status(404).send({ error: '邀请码无效' });
    const existing = await db.get<{ status: string }>('SELECT status FROM team_members WHERE team_id=? AND user_id=?', team.id, userId);
    if (existing) return rep.status(409).send({ error: existing.status === 'pending' ? '已申请，等待审批' : '你已经是团队成员' });
    const count = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_members WHERE team_id=? AND status=\'approved\'', team.id))!.c;
    if (count >= team.max_members) return rep.status(400).send({ error: '团队人数已满' });
    await db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', team.id, userId, 'member', 'approved');
    await notify(ctx, team.creator_id, 'team_joined', `${(req as any).session?.username || '用户'}通过邀请码加入了「${team.name}」`, team.id, userId);
    return { success: true, teamId: team.id, message: '已加入团队' };
  });

  // ══════════════════════════════════════════
  // 团队详情
  // ══════════════════════════════════════════

  app.get('/api/teams/:id', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await db.get<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.id=?`, id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    if (!team.is_public && !(await memberRole(id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const myRole = u ? await memberRole(id, u) : null;
    const myStatus = u ? (await db.get<{ status: string }>('SELECT status FROM team_members WHERE team_id=? AND user_id=?', id, u))?.status : null;
    const isFavorited = u ? !!(await db.get('SELECT 1 FROM team_favorites WHERE user_id=? AND team_id=?', u, id)) : false;
    team.myRole = myRole;
    team.myApplicationStatus = myRole ? null : myStatus || null;
    team.isFavorited = isFavorited;
    if (!myRole && team.hide_members) {
      team.hide_members_detail = true;
    }
    return team;
  });

  // ══════════════════════════════════════════
  // 更新团队
  // ══════════════════════════════════════════

  app.put('/api/teams/:id', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const team = await db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const data = updateTeamSchema.parse(req.body);
    const sets: string[] = []; const vals: unknown[] = [];
    if (data.name !== undefined) { sets.push('name=?'); vals.push(data.name); }
    if (data.description !== undefined) { sets.push('description=?'); vals.push(data.description); }
    if (data.avatar !== undefined) { sets.push('avatar=?'); vals.push(data.avatar); }
    if (data.isPublic !== undefined) { sets.push('is_public=?'); vals.push(data.isPublic ? 1 : 0); }
    if (data.maxMembers !== undefined) { sets.push('max_members=?'); vals.push(data.maxMembers); }
    if (data.categoryId !== undefined) { sets.push('category_id=?'); vals.push(data.categoryId); }
    if (data.hideMembers !== undefined) { sets.push('hide_members=?'); vals.push(data.hideMembers ? 1 : 0); }
    if (sets.length === 0) return rep.status(400).send({ error: '没有要更新的字段' });
    sets.push("updated_at=datetime('now')");
    vals.push(id);
    await db.run(`UPDATE teams SET ${sets.join(',')} WHERE id=?`, ...vals);
    return { success: true, message: '团队信息已更新' };
  });

  // ══════════════════════════════════════════
  // 重置邀请码
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/reset-invite', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const team = await db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    let code = genInviteCode();
    while (await db.get('SELECT id FROM teams WHERE invite_code=?', code)) code = genInviteCode();
    await db.run('UPDATE teams SET invite_code=?, updated_at=datetime(\'now\') WHERE id=?', code, id);
    return { success: true, inviteCode: code };
  });

  // ══════════════════════════════════════════
  // 删除团队
  // ══════════════════════════════════════════

  app.delete('/api/teams/:id', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const team = await db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (team.creator_id !== userId && !(await isAdmin(db, userId))) return rep.status(403).send({ error: '仅创建者可删除' });
    await db.run('DELETE FROM team_members WHERE team_id=?', id);
    await db.run('DELETE FROM team_posts WHERE team_id=?', id);
    await db.run('DELETE FROM team_announcements WHERE team_id=?', id);
    await db.run('DELETE FROM team_favorites WHERE team_id=?', id);
    await db.run('DELETE FROM teams WHERE id=?', id);
    return { success: true, message: '团队已删除' };
  });

  // ══════════════════════════════════════════
  // 转让所有权
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/transfer', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamOwner(id, userId))) return rep.status(403).send({ error: '仅创建者可转让' });
    const { newOwnerId } = req.body as { newOwnerId?: number };
    if (!newOwnerId) return rep.status(400).send({ error: '请指定新创建者' });
    const target = await db.get<MemberRow>('SELECT * FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', id, newOwnerId);
    if (!target) return rep.status(404).send({ error: '该用户不是团队成员' });
    await db.run('UPDATE team_members SET role=\'member\' WHERE team_id=? AND role=\'owner\'', id);
    await db.run('UPDATE team_members SET role=\'owner\' WHERE team_id=? AND user_id=?', id, newOwnerId);
    await db.run('UPDATE teams SET creator_id=?, updated_at=datetime(\'now\') WHERE id=?', newOwnerId, id);
    const team = await db.get<TeamRow>('SELECT name FROM teams WHERE id=?', id);
    await notify(ctx, newOwnerId, 'team_owner_transfer', `你已成为「${team!.name}」的创建者`, id, userId);
    return { success: true, message: '已转让所有权' };
  });

  // ══════════════════════════════════════════
  // 设置/取消管理员
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/members/:userId/role', async (req, rep) => {
    const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as any).userId);
    if (!(await isTeamOwner(teamId, adminId))) return rep.status(403).send({ error: '仅创建者可设置管理员' });
    const { role } = req.body as { role?: string };
    if (!['admin', 'member'].includes(role || '')) return rep.status(400).send({ error: '无效角色' });
    const target = await db.get<MemberRow>('SELECT * FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', teamId, targetId);
    if (!target) return rep.status(404).send({ error: '成员不存在' });
    if (target.role === 'owner') return rep.status(400).send({ error: '不能修改创建者角色' });
    await db.run('UPDATE team_members SET role=? WHERE team_id=? AND user_id=?', role, teamId, targetId);
    const team = await db.get<TeamRow>('SELECT name FROM teams WHERE id=?', teamId);
    await notify(ctx, targetId, 'team_role_changed', `你在「${team!.name}」的角色已变更为${role === 'admin' ? '管理员' : '成员'}`, teamId, adminId);
    return { success: true, message: '角色已更新' };
  });

  // ══════════════════════════════════════════
  // 收藏/取消收藏
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/favorite', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const team = await db.get<TeamRow>('SELECT id, is_public FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!team.is_public && !(await memberRole(id, userId))) return rep.status(403).send({ error: '这是私密团队' });
    const existing = await db.get('SELECT id FROM team_favorites WHERE user_id=? AND team_id=?', userId, id);
    if (existing) {
      await db.run('DELETE FROM team_favorites WHERE user_id=? AND team_id=?', userId, id);
      return { success: true, favorited: false };
    } else {
      await db.run('INSERT INTO team_favorites (user_id, team_id) VALUES (?,?)', userId, id);
      return { success: true, favorited: true };
    }
  });

  // ══════════════════════════════════════════
  // 团队公告
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/announcements', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await db.get<TeamRow>('SELECT id, is_public FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    if (!team.is_public && !(await memberRole(id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const announcements = await db.all<any>(`SELECT a.*, u.username, u.display_name FROM team_announcements a JOIN users u ON a.author_id=u.id WHERE a.team_id=? ORDER BY a.is_pinned DESC, a.created_at DESC`, id);
    return { announcements };
  });

  app.post('/api/teams/:id/announcements', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '仅管理员可发布公告' });
    const { title, content, isPinned } = announcementSchema.parse(req.body);
    await db.run('INSERT INTO team_announcements (team_id,title,content,author_id,is_pinned) VALUES (?,?,?,?,?)', id, title, content, userId, isPinned ? 1 : 0);
    const members = await db.all<{ user_id: number }>('SELECT user_id FROM team_members WHERE team_id=? AND status=\'approved\'', id);
    const team = await db.get<TeamRow>('SELECT name FROM teams WHERE id=?', id);
    for (const m of members) {
      if (m.user_id !== userId) await notify(ctx, m.user_id, 'team_announcement', `「${team!.name}」发布了新公告：${title}`, id, userId);
    }
    return { success: true, message: '公告已发布' };
  });

  app.delete('/api/teams/:id/announcements/:aid', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const aid = Number((req.params as { aid: string }).aid);
    const ann = await db.get<AnnouncementRow>('SELECT * FROM team_announcements WHERE id=? AND team_id=?', aid, id);
    if (!ann) return rep.status(404).send({ error: '公告不存在' });
    if (!(await isTeamAdmin(id, userId)) && ann.author_id !== userId) return rep.status(403).send({ error: '无权删除' });
    await db.run('DELETE FROM team_announcements WHERE id=?', aid);
    return { success: true, message: '公告已删除' };
  });

  // ══════════════════════════════════════════
  // 团队帖子
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/posts', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const page = Math.max(1, Number((req.query as any).page) || 1);
    const limit = 20;
    const team = await db.get<TeamRow>('SELECT id, is_public FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    if (!team.is_public && !(await memberRole(id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const posts = await db.all<any>(`SELECT p.*, u.username, u.display_name, u.avatar_url FROM team_posts tp JOIN posts p ON tp.post_id=p.id JOIN users u ON p.author_id=u.id WHERE tp.team_id=? ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ? OFFSET ?`, id, limit, (page - 1) * limit);
    return { posts, page, limit };
  });

  app.post('/api/teams/:id/posts', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    if (!(await memberRole(id, userId))) return rep.status(403).send({ error: '仅成员可发帖' });
    const { postId } = req.body as { postId?: number };
    if (!postId) return rep.status(400).send({ error: '请指定帖子' });
    const post = await db.get<{ author_id: number; board_id: number }>('SELECT author_id, board_id FROM posts WHERE id=?', postId);
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    try {
      await db.run('INSERT INTO team_posts (team_id, post_id) VALUES (?,?)', id, postId);
    } catch {
      return rep.status(409).send({ error: '已关联' });
    }
    return { success: true, message: '已添加到团队' };
  });

  app.delete('/api/teams/:id/posts/:postId', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await db.get<{ author_id: number }>('SELECT author_id FROM posts WHERE id=?', postId);
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (!(await isTeamAdmin(id, userId)) && post.author_id !== userId) return rep.status(403).send({ error: '无权移除' });
    await db.run('DELETE FROM team_posts WHERE team_id=? AND post_id=?', id, postId);
    return { success: true, message: '已移除' };
  });

  // ══════════════════════════════════════════
  // 团队独立帖子（team_content_posts）
  // ══════════════════════════════════════════

  app.get('/api/teams/:id/content-posts', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const page = Math.max(1, Number((req.query as any).page) || 1);
    const limit = 20;
    const team = await db.get<TeamRow>('SELECT id, is_public FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const role = u ? await memberRole(id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const posts = await db.all<any>(`
      SELECT p.*, u.username, u.display_name, u.avatar_url, 0 as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id
      WHERE p.team_id=?
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, id, limit, (page - 1) * limit);
    return { posts, page, limit };
  });

  app.post('/api/teams/:id/content-posts', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const role = await memberRole(id, userId);
    if (!role) return rep.status(403).send({ error: '仅成员可发帖' });
    const { title, content, images } = req.body as { title?: string; content?: string; images?: string[] };
    if (!title?.trim()) return rep.status(400).send({ error: '请输入标题' });
    if (!content?.trim()) return rep.status(400).send({ error: '请输入内容' });
    const result = await db.run(
      'INSERT INTO team_content_posts (team_id, title, content, author_id, images) VALUES (?,?,?,?,?)',
      id, title.trim(), content.trim(), userId, images && images.length > 0 ? JSON.stringify(images) : null
    );
    const post = await db.get<any>(`
      SELECT p.*, u.username, u.display_name, u.avatar_url, 0 as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id WHERE p.id=?
    `, result.lastInsertRowid);
    return { success: true, post };
  });

  app.get('/api/teams/:id/content-posts/:postId', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const team = await db.get<TeamRow>('SELECT id, is_public FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const role = u ? await memberRole(id, u) : null;
    if (!team.is_public && !role) return rep.status(403).send({ error: '这是私密团队' });
    const post = await db.get<any>(`
      SELECT p.*, u.username, u.display_name, u.avatar_url, 0 as comment_count
      FROM team_content_posts p JOIN users u ON p.author_id=u.id WHERE p.id=? AND p.team_id=?
    `, postId, id);
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    return post;
  });

  app.put('/api/teams/:id/content-posts/:postId', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await db.get<{ author_id: number }>('SELECT author_id FROM team_content_posts WHERE id=? AND team_id=?', postId, id);
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId && !(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '无权编辑' });
    const { title, content, images, isPinned } = req.body as any;
    const updates: string[] = [];
    const params: unknown[] = [];
    if (title !== undefined) { updates.push('title=?'); params.push(title.trim()); }
    if (content !== undefined) { updates.push('content=?'); params.push(content.trim()); }
    if (images !== undefined) { updates.push('images=?'); params.push(images.length > 0 ? JSON.stringify(images) : null); }
    if (isPinned !== undefined && (await isTeamAdmin(id, userId))) { updates.push('is_pinned=?'); params.push(isPinned ? 1 : 0); }
    if (updates.length === 0) return rep.status(400).send({ error: '没有需要更新的字段' });
    updates.push("updated_at=datetime('now')");
    params.push(postId, id);
    await db.run(`UPDATE team_content_posts SET ${updates.join(',')} WHERE id=? AND team_id=?`, ...params);
    return { success: true, message: '已更新' };
  });

  app.delete('/api/teams/:id/content-posts/:postId', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const postId = Number((req.params as { postId: string }).postId);
    const post = await db.get<{ author_id: number }>('SELECT author_id FROM team_content_posts WHERE id=? AND team_id=?', postId, id);
    if (!post) return rep.status(404).send({ error: '帖子不存在' });
    if (post.author_id !== userId && !(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '无权删除' });
    await db.run('DELETE FROM team_content_posts WHERE id=?', postId);
    return { success: true, message: '已删除' };
  });

  // ══════════════════════════════════════════
  // 成员管理
  // ══════════════════════════════════════════

  app.post('/api/teams/:id/join', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const team = await db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const existing = await db.get<{ status: string }>('SELECT status FROM team_members WHERE team_id=? AND user_id=?', id, userId);
    if (existing) return rep.status(409).send({ error: existing.status === 'pending' ? '已申请，等待审批' : '你已经是团队成员' });
    const count = (await db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_members WHERE team_id=? AND status=\'approved\'', id))!.c;
    if (count >= team.max_members) return rep.status(400).send({ error: '团队人数已满' });
    if (team.is_public) {
      await db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', id, userId, 'member', 'approved');
      await notify(ctx, team.creator_id, 'team_joined', `${(req as any).session?.username || '用户'}加入了你的团队「${team.name}」`, id, userId);
      return { success: true, message: '已加入团队' };
    } else {
      await db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', id, userId, 'member', 'pending');
      const admins = await db.all<{ user_id: number }>('SELECT user_id FROM team_members WHERE team_id=? AND role IN (\'owner\',\'admin\') AND status=\'approved\'', id);
      for (const a of admins) await notify(ctx, a.user_id, 'team_join_request', `${(req as any).session?.username || '用户'}申请加入「${team.name}」`, id, userId);
      return { success: true, message: '已提交申请，等待审批' };
    }
  });

  app.post('/api/teams/:id/leave', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    const member = await db.get<MemberRow>('SELECT * FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', id, userId);
    if (!member) return rep.status(400).send({ error: '你不在该团队中' });
    if (member.role === 'owner') return rep.status(400).send({ error: '创建者不能退出，请先转让或删除团队' });
    await db.run('DELETE FROM team_members WHERE id=?', member.id);
    const team = await db.get<TeamRow>('SELECT name FROM teams WHERE id=?', id);
    await notify(ctx, team!.creator_id, 'team_member_left', `${(req as any).session?.username || '用户'}退出了「${team!.name}」`, id, userId);
    return { success: true, message: '已退出团队' };
  });

  app.get('/api/teams/:id/members', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await db.get<TeamRow>('SELECT id, is_public, hide_members FROM teams WHERE id=?', id);
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = uid(req);
    const isMember = !!(await memberRole(id, u || 0));
    if (!team.is_public && !isMember) return rep.status(403).send({ error: '这是私密团队' });
    if (team.hide_members && !isMember) {
      return { members: [], hidden: true };
    }
    const members = await db.all<any>(`SELECT tm.*, u.username, u.display_name, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=? AND tm.status='approved' ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, tm.joined_at`, id);
    return { members };
  });

  app.get('/api/teams/:id/applications', async (req, rep) => {
    const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamAdmin(id, userId))) return rep.status(403).send({ error: '仅管理员可查看' });
    const applications = await db.all<any>(`SELECT tm.*, u.username, u.display_name, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=? AND tm.status='pending' ORDER BY tm.joined_at DESC`, id);
    return { applications };
  });

  app.put('/api/teams/:id/members/:userId', async (req, rep) => {
    const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as any).userId);
    if (!(await isTeamAdmin(teamId, adminId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const { action } = req.body as { action?: string };
    if (action === 'approve') {
      await db.run('UPDATE team_members SET status=\'approved\' WHERE team_id=? AND user_id=? AND status=\'pending\'', teamId, targetId);
      const team = await db.get<TeamRow>('SELECT name FROM teams WHERE id=?', teamId);
      await notify(ctx, targetId, 'team_join_approved', `你加入「${team!.name}」的申请已通过`, teamId);
      return { success: true, message: '已批准' };
    } else if (action === 'reject') {
      await db.run('DELETE FROM team_members WHERE team_id=? AND user_id=? AND status=\'pending\'', teamId, targetId);
      return { success: true, message: '已拒绝' };
    }
    return rep.status(400).send({ error: 'action 需为 approve 或 reject' });
  });

  app.delete('/api/teams/:id/members/:userId', async (req, rep) => {
    const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as any).userId);
    if (!(await isTeamAdmin(teamId, adminId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const target = await db.get<MemberRow>('SELECT role FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', teamId, targetId);
    if (!target) return rep.status(404).send({ error: '成员不存在' });
    if (target.role === 'owner') return rep.status(403).send({ error: '不能移除创建者' });
    if (target.role === 'admin' && !(await isTeamOwner(teamId, adminId))) return rep.status(403).send({ error: '仅创建者可移除管理员' });
    await db.run('DELETE FROM team_members WHERE team_id=? AND user_id=?', teamId, targetId);
    return { success: true, message: '已移除' };
  });
}
