import { Plugin, PluginContext, uid, isAdmin } from '@campus-forum/core';
import { z } from 'zod';

interface TeamRow { id: number; name: string; description: string; avatar: string | null; is_public: number; creator_id: number; max_members: number; category_id: number | null; invite_code: string | null; hide_members: number; created_at: string; updated_at: string; }
interface MemberRow { id: number; team_id: number; user_id: number; role: string; status: string; username?: string; display_name?: string; avatar_url?: string; joined_at?: string; }
interface AnnouncementRow { id: number; team_id: number; title: string; content: string; author_id: number; is_pinned: number; created_at: string; updated_at: string; }

const createTeamSchema = z.object({
  name: z.string().min(2, '团队名至少 2 个字符').max(30, '团队名最多 30 个字符'),
  description: z.string().max(500, '描述最多 500 字符').default(''),
  avatar: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  maxMembers: z.number().int().min(2).max(200).optional().default(50),
  categoryId: z.number().int().optional(),
  hideMembers: z.boolean().optional().default(false),
});

const updateTeamSchema = z.object({
  name: z.string().min(2).max(30).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().optional(),
  isPublic: z.boolean().optional(),
  maxMembers: z.number().int().min(2).max(200).optional(),
  categoryId: z.number().int().nullable().optional(),
  hideMembers: z.boolean().optional(),
});

const announcementSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  isPinned: z.boolean().optional().default(false),
});

function notify(ctx: PluginContext, userId: number, type: string, msg: string, teamId?: number, fromUserId?: number) {
  try { (ctx as any).createNotification?.(userId, type, msg, null, null, fromUserId, teamId); } catch {}
}

function genInviteCode(): string {
  return Math.random().toString(36).substring(2, 10);
}

export const teamsPlugin: Plugin = {
  manifest: { name: 'teams', version: '0.2.0', description: '社团/团队管理插件', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    function memberRole(teamId: number, userId: number): string | null {
      return db.get<{ role: string }>('SELECT role FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', teamId, userId)?.role || null;
    }

    function isTeamAdmin(teamId: number, userId: number): boolean {
      return ['owner', 'admin'].includes(memberRole(teamId, userId) || '');
    }

    function isTeamOwner(teamId: number, userId: number): boolean {
      return memberRole(teamId, userId) === 'owner';
    }

    function withMemberCount(team: any): any {
      const mc = db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_members WHERE team_id=? AND status=\'approved\'', team.id)?.c || 0;
      const pc = db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_posts WHERE team_id=?', team.id)?.c || 0;
      return { ...team, member_count: mc, post_count: pc };
    }

    // ══════════════════════════════════════════
    // 分类管理
    // ══════════════════════════════════════════

    app.get('/api/team-categories', async () => {
      const categories = db.all<any>('SELECT * FROM team_categories ORDER BY sort_order, id');
      return { categories };
    });

    app.post('/api/team-categories', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      if (!isAdmin(db, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const { name, icon, sortOrder } = req.body as any;
      if (!name?.trim()) return rep.status(400).send({ error: '分类名不能为空' });
      try {
        db.run('INSERT INTO team_categories (name, icon, sort_order) VALUES (?,?,?)', name.trim(), icon || null, sortOrder || 0);
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
      const all = db.all<any>(`SELECT t.*, tm.role FROM teams t JOIN team_members tm ON t.id=tm.team_id WHERE tm.user_id=? AND tm.status='approved' ORDER BY t.created_at DESC`, u);
      const teams = all.map(withMemberCount);
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
      const teams = db.all<any>(`SELECT t.* FROM teams t JOIN team_favorites tf ON t.id=tf.team_id WHERE tf.user_id=? ORDER BY tf.created_at DESC`, u).map(withMemberCount);
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
      const teams = db.all<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_posts WHERE team_id=t.id) as post_count FROM teams t ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, ...params);
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

      const teams = db.all<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_posts WHERE team_id=t.id) as post_count FROM teams t ${where} ORDER BY member_count DESC LIMIT 30`, ...params);
      return { teams };
    });

    // ══════════════════════════════════════════
    // 创建团队
    // ══════════════════════════════════════════

    app.post('/api/teams', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { name, description, avatar, isPublic, maxMembers, categoryId, hideMembers } = createTeamSchema.parse(req.body);
      const existing = db.get<TeamRow>('SELECT id FROM teams WHERE name=?', name);
      if (existing) return rep.status(409).send({ error: '团队名已存在' });

      let inviteCode = genInviteCode();
      while (db.get('SELECT id FROM teams WHERE invite_code=?', inviteCode)) inviteCode = genInviteCode();

      db.run('INSERT INTO teams (name,description,avatar,is_public,creator_id,max_members,category_id,invite_code,hide_members) VALUES (?,?,?,?,?,?,?,?,?)',
        name, description, avatar || null, isPublic ? 1 : 0, userId, maxMembers, categoryId || null, inviteCode, hideMembers ? 1 : 0);
      const team = db.get<TeamRow>('SELECT * FROM teams ORDER BY id DESC LIMIT 1');
      db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', team!.id, userId, 'owner', 'approved');
      return { success: true, team };
    });

    // ══════════════════════════════════════════
    // 通过邀请码加入
    // ══════════════════════════════════════════

    app.post('/api/teams/join-by-code', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { code } = req.body as { code?: string };
      if (!code?.trim()) return rep.status(400).send({ error: '请输入邀请码' });
      const team = db.get<TeamRow>('SELECT * FROM teams WHERE invite_code=?', code.trim());
      if (!team) return rep.status(404).send({ error: '邀请码无效' });
      const existing = db.get<{ status: string }>('SELECT status FROM team_members WHERE team_id=? AND user_id=?', team.id, userId);
      if (existing) return rep.status(409).send({ error: existing.status === 'pending' ? '已申请，等待审批' : '你已经是团队成员' });
      const count = db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_members WHERE team_id=? AND status=\'approved\'', team.id)!.c;
      if (count >= team.max_members) return rep.status(400).send({ error: '团队人数已满' });
      db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', team.id, userId, 'member', 'approved');
      notify(ctx, team.creator_id, 'team_joined', `${(req as any).session?.username || '用户'}通过邀请码加入了「${team.name}」`, team.id, userId);
      return { success: true, teamId: team.id, message: '已加入团队' };
    });

    // ══════════════════════════════════════════
    // 团队详情
    // ══════════════════════════════════════════

    app.get('/api/teams/:id', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const team = db.get<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.id=?`, id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      const u = uid(req);
      if (!team.is_public && !memberRole(id, u || 0)) return rep.status(403).send({ error: '这是私密团队' });
      const myRole = u ? memberRole(id, u) : null;
      const myStatus = u ? db.get<{ status: string }>('SELECT status FROM team_members WHERE team_id=? AND user_id=?', id, u)?.status : null;
      const isFavorited = u ? !!db.get('SELECT 1 FROM team_favorites WHERE user_id=? AND team_id=?', u, id) : false;
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
      const team = db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      if (!isTeamAdmin(id, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
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
      db.run(`UPDATE teams SET ${sets.join(',')} WHERE id=?`, ...vals);
      return { success: true, message: '团队信息已更新' };
    });

    // ══════════════════════════════════════════
    // 重置邀请码
    // ══════════════════════════════════════════

    app.post('/api/teams/:id/reset-invite', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const team = db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      if (!isTeamAdmin(id, userId)) return rep.status(403).send({ error: '仅管理员可操作' });
      let code = genInviteCode();
      while (db.get('SELECT id FROM teams WHERE invite_code=?', code)) code = genInviteCode();
      db.run('UPDATE teams SET invite_code=?, updated_at=datetime(\'now\') WHERE id=?', code, id);
      return { success: true, inviteCode: code };
    });

    // ══════════════════════════════════════════
    // 删除团队
    // ══════════════════════════════════════════

    app.delete('/api/teams/:id', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const team = db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      if (team.creator_id !== userId && !isAdmin(db, userId)) return rep.status(403).send({ error: '仅创建者可删除' });
      db.run('DELETE FROM team_members WHERE team_id=?', id);
      db.run('DELETE FROM team_posts WHERE team_id=?', id);
      db.run('DELETE FROM team_announcements WHERE team_id=?', id);
      db.run('DELETE FROM team_favorites WHERE team_id=?', id);
      db.run('DELETE FROM teams WHERE id=?', id);
      return { success: true, message: '团队已删除' };
    });

    // ══════════════════════════════════════════
    // 转让所有权
    // ══════════════════════════════════════════

    app.post('/api/teams/:id/transfer', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      if (!isTeamOwner(id, userId)) return rep.status(403).send({ error: '仅创建者可转让' });
      const { newOwnerId } = req.body as { newOwnerId?: number };
      if (!newOwnerId) return rep.status(400).send({ error: '请指定新创建者' });
      const target = db.get<MemberRow>('SELECT * FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', id, newOwnerId);
      if (!target) return rep.status(404).send({ error: '该用户不是团队成员' });
      db.run('UPDATE team_members SET role=\'member\' WHERE team_id=? AND role=\'owner\'', id);
      db.run('UPDATE team_members SET role=\'owner\' WHERE team_id=? AND user_id=?', id, newOwnerId);
      db.run('UPDATE teams SET creator_id=?, updated_at=datetime(\'now\') WHERE id=?', newOwnerId, id);
      const team = db.get<TeamRow>('SELECT name FROM teams WHERE id=?', id);
      notify(ctx, newOwnerId, 'team_owner_transfer', `你已成为「${team!.name}」的创建者`, id, userId);
      return { success: true, message: '已转让所有权' };
    });

    // ══════════════════════════════════════════
    // 设置/取消管理员
    // ══════════════════════════════════════════

    app.post('/api/teams/:id/members/:userId/role', async (req, rep) => {
      const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
      const teamId = Number((req.params as { id: string }).id);
      const targetId = Number((req.params as any).userId);
      if (!isTeamOwner(teamId, adminId)) return rep.status(403).send({ error: '仅创建者可设置管理员' });
      const { role } = req.body as { role?: string };
      if (!['admin', 'member'].includes(role || '')) return rep.status(400).send({ error: '无效角色' });
      const target = db.get<MemberRow>('SELECT * FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', teamId, targetId);
      if (!target) return rep.status(404).send({ error: '成员不存在' });
      if (target.role === 'owner') return rep.status(400).send({ error: '不能修改创建者角色' });
      db.run('UPDATE team_members SET role=? WHERE team_id=? AND user_id=?', role, teamId, targetId);
      const team = db.get<TeamRow>('SELECT name FROM teams WHERE id=?', teamId);
      notify(ctx, targetId, 'team_role_changed', `你在「${team!.name}」的角色已变更为${role === 'admin' ? '管理员' : '成员'}`, teamId, adminId);
      return { success: true, message: '角色已更新' };
    });

    // ══════════════════════════════════════════
    // 收藏/取消收藏
    // ══════════════════════════════════════════

    app.post('/api/teams/:id/favorite', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const team = db.get<TeamRow>('SELECT id, is_public FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      if (!team.is_public && !memberRole(id, userId)) return rep.status(403).send({ error: '这是私密团队' });
      const existing = db.get('SELECT id FROM team_favorites WHERE user_id=? AND team_id=?', userId, id);
      if (existing) {
        db.run('DELETE FROM team_favorites WHERE user_id=? AND team_id=?', userId, id);
        return { success: true, favorited: false };
      } else {
        db.run('INSERT INTO team_favorites (user_id, team_id) VALUES (?,?)', userId, id);
        return { success: true, favorited: true };
      }
    });

    // ══════════════════════════════════════════
    // 团队公告
    // ══════════════════════════════════════════

    app.get('/api/teams/:id/announcements', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const team = db.get<TeamRow>('SELECT id, is_public FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      const u = uid(req);
      if (!team.is_public && !memberRole(id, u || 0)) return rep.status(403).send({ error: '这是私密团队' });
      const announcements = db.all<any>(`SELECT a.*, u.username, u.display_name FROM team_announcements a JOIN users u ON a.author_id=u.id WHERE a.team_id=? ORDER BY a.is_pinned DESC, a.created_at DESC`, id);
      return { announcements };
    });

    app.post('/api/teams/:id/announcements', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      if (!isTeamAdmin(id, userId)) return rep.status(403).send({ error: '仅管理员可发布公告' });
      const { title, content, isPinned } = announcementSchema.parse(req.body);
      db.run('INSERT INTO team_announcements (team_id,title,content,author_id,is_pinned) VALUES (?,?,?,?,?)', id, title, content, userId, isPinned ? 1 : 0);
      const members = db.all<{ user_id: number }>('SELECT user_id FROM team_members WHERE team_id=? AND status=\'approved\'', id);
      const team = db.get<TeamRow>('SELECT name FROM teams WHERE id=?', id);
      for (const m of members) {
        if (m.user_id !== userId) notify(ctx, m.user_id, 'team_announcement', `「${team!.name}」发布了新公告：${title}`, id, userId);
      }
      return { success: true, message: '公告已发布' };
    });

    app.delete('/api/teams/:id/announcements/:aid', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const aid = Number((req.params as { aid: string }).aid);
      const ann = db.get<AnnouncementRow>('SELECT * FROM team_announcements WHERE id=? AND team_id=?', aid, id);
      if (!ann) return rep.status(404).send({ error: '公告不存在' });
      if (!isTeamAdmin(id, userId) && ann.author_id !== userId) return rep.status(403).send({ error: '无权删除' });
      db.run('DELETE FROM team_announcements WHERE id=?', aid);
      return { success: true, message: '公告已删除' };
    });

    // ══════════════════════════════════════════
    // 团队帖子
    // ══════════════════════════════════════════

    app.get('/api/teams/:id/posts', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const page = Math.max(1, Number((req.query as any).page) || 1);
      const limit = 20;
      const team = db.get<TeamRow>('SELECT id, is_public FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      const u = uid(req);
      if (!team.is_public && !memberRole(id, u || 0)) return rep.status(403).send({ error: '这是私密团队' });
      const posts = db.all<any>(`SELECT p.*, u.username, u.display_name, u.avatar_url FROM team_posts tp JOIN posts p ON tp.post_id=p.id JOIN users u ON p.author_id=u.id WHERE tp.team_id=? ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ? OFFSET ?`, id, limit, (page - 1) * limit);
      return { posts, page, limit };
    });

    app.post('/api/teams/:id/posts', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      if (!memberRole(id, userId)) return rep.status(403).send({ error: '仅成员可发帖' });
      const { postId } = req.body as { postId?: number };
      if (!postId) return rep.status(400).send({ error: '请指定帖子' });
      const post = db.get<{ author_id: number; board_id: number }>('SELECT author_id, board_id FROM posts WHERE id=?', postId);
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      try {
        db.run('INSERT INTO team_posts (team_id, post_id) VALUES (?,?)', id, postId);
      } catch {
        return rep.status(409).send({ error: '已关联' });
      }
      return { success: true, message: '已添加到团队' };
    });

    app.delete('/api/teams/:id/posts/:postId', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const postId = Number((req.params as { postId: string }).postId);
      const post = db.get<{ author_id: number }>('SELECT author_id FROM posts WHERE id=?', postId);
      if (!post) return rep.status(404).send({ error: '帖子不存在' });
      if (!isTeamAdmin(id, userId) && post.author_id !== userId) return rep.status(403).send({ error: '无权移除' });
      db.run('DELETE FROM team_posts WHERE team_id=? AND post_id=?', id, postId);
      return { success: true, message: '已移除' };
    });

    // ══════════════════════════════════════════
    // 成员管理
    // ══════════════════════════════════════════

    app.post('/api/teams/:id/join', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const team = db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      const existing = db.get<{ status: string }>('SELECT status FROM team_members WHERE team_id=? AND user_id=?', id, userId);
      if (existing) return rep.status(409).send({ error: existing.status === 'pending' ? '已申请，等待审批' : '你已经是团队成员' });
      const count = db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_members WHERE team_id=? AND status=\'approved\'', id)!.c;
      if (count >= team.max_members) return rep.status(400).send({ error: '团队人数已满' });
      if (team.is_public) {
        db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', id, userId, 'member', 'approved');
        notify(ctx, team.creator_id, 'team_joined', `${(req as any).session?.username || '用户'}加入了你的团队「${team.name}」`, id, userId);
        return { success: true, message: '已加入团队' };
      } else {
        db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', id, userId, 'member', 'pending');
        const admins = db.all<{ user_id: number }>('SELECT user_id FROM team_members WHERE team_id=? AND role IN (\'owner\',\'admin\') AND status=\'approved\'', id);
        for (const a of admins) notify(ctx, a.user_id, 'team_join_request', `${(req as any).session?.username || '用户'}申请加入「${team.name}」`, id, userId);
        return { success: true, message: '已提交申请，等待审批' };
      }
    });

    app.post('/api/teams/:id/leave', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const member = db.get<MemberRow>('SELECT * FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', id, userId);
      if (!member) return rep.status(400).send({ error: '你不在该团队中' });
      if (member.role === 'owner') return rep.status(400).send({ error: '创建者不能退出，请先转让或删除团队' });
      db.run('DELETE FROM team_members WHERE id=?', member.id);
      const team = db.get<TeamRow>('SELECT name FROM teams WHERE id=?', id);
      notify(ctx, team!.creator_id, 'team_member_left', `${(req as any).session?.username || '用户'}退出了「${team!.name}」`, id, userId);
      return { success: true, message: '已退出团队' };
    });

    app.get('/api/teams/:id/members', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const team = db.get<TeamRow>('SELECT id, is_public, hide_members FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      const u = uid(req);
      const isMember = !!memberRole(id, u || 0);
      if (!team.is_public && !isMember) return rep.status(403).send({ error: '这是私密团队' });
      if (team.hide_members && !isMember) {
        return { members: [], hidden: true };
      }
      const members = db.all<any>(`SELECT tm.*, u.username, u.display_name, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=? AND tm.status='approved' ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, tm.joined_at`, id);
      return { members };
    });

    app.get('/api/teams/:id/applications', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      if (!isTeamAdmin(id, userId)) return rep.status(403).send({ error: '仅管理员可查看' });
      const applications = db.all<any>(`SELECT tm.*, u.username, u.display_name, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=? AND tm.status='pending' ORDER BY tm.joined_at DESC`, id);
      return { applications };
    });

    app.put('/api/teams/:id/members/:userId', async (req, rep) => {
      const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
      const teamId = Number((req.params as { id: string }).id);
      const targetId = Number((req.params as any).userId);
      if (!isTeamAdmin(teamId, adminId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const { action } = req.body as { action?: string };
      if (action === 'approve') {
        db.run('UPDATE team_members SET status=\'approved\' WHERE team_id=? AND user_id=? AND status=\'pending\'', teamId, targetId);
        const team = db.get<TeamRow>('SELECT name FROM teams WHERE id=?', teamId);
        notify(ctx, targetId, 'team_join_approved', `你加入「${team!.name}」的申请已通过`, teamId);
        return { success: true, message: '已批准' };
      } else if (action === 'reject') {
        db.run('DELETE FROM team_members WHERE team_id=? AND user_id=? AND status=\'pending\'', teamId, targetId);
        return { success: true, message: '已拒绝' };
      }
      return rep.status(400).send({ error: 'action 需为 approve 或 reject' });
    });

    app.delete('/api/teams/:id/members/:userId', async (req, rep) => {
      const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
      const teamId = Number((req.params as { id: string }).id);
      const targetId = Number((req.params as any).userId);
      if (!isTeamAdmin(teamId, adminId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const target = db.get<MemberRow>('SELECT role FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', teamId, targetId);
      if (!target) return rep.status(404).send({ error: '成员不存在' });
      if (target.role === 'owner') return rep.status(403).send({ error: '不能移除创建者' });
      if (target.role === 'admin' && !isTeamOwner(teamId, adminId)) return rep.status(403).send({ error: '仅创建者可移除管理员' });
      db.run('DELETE FROM team_members WHERE team_id=? AND user_id=?', teamId, targetId);
      return { success: true, message: '已移除' };
    });
  },
};

export default teamsPlugin;
