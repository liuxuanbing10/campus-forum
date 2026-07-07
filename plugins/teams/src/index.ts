import { Plugin, PluginContext, uid, isAdmin } from '@campus-forum/core';
import { z } from 'zod';

interface TeamRow { id: number; name: string; description: string; avatar: string | null; is_public: number; creator_id: number; max_members: number; created_at: string; updated_at: string; }
interface MemberRow { id: number; team_id: number; user_id: number; role: string; status: string; username?: string; joined_at?: string; }
interface Stats { member_count: number; post_count: number; }

const createTeamSchema = z.object({
  name: z.string().min(2, '团队名至少 2 个字符').max(30, '团队名最多 30 个字符'),
  description: z.string().max(500, '描述最多 500 字符').default(''),
  avatar: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  maxMembers: z.number().int().min(2).max(200).optional().default(50),
});

const updateTeamSchema = z.object({
  name: z.string().min(2).max(30).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().optional(),
  isPublic: z.boolean().optional(),
  maxMembers: z.number().int().min(2).max(200).optional(),
});

function notify(ctx: PluginContext, userId: number, type: string, msg: string, teamId?: number, fromUserId?: number) {
  try { (ctx as any).createNotification?.(userId, type, msg, null, null, fromUserId, teamId); } catch {}
}

export const teamsPlugin: Plugin = {
  manifest: { name: 'teams', version: '0.1.0', description: '社团/团队管理插件', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { app, db } = ctx;

    function memberRole(teamId: number, userId: number): string | null {
      return db.get<{ role: string }>('SELECT role FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', teamId, userId)?.role || null;
    }

    function isTeamAdmin(teamId: number, userId: number): boolean {
      return ['owner', 'admin'].includes(memberRole(teamId, userId) || '');
    }

    // ─── 我的团队 ───
    app.get('/api/teams/my', async (req) => {
      const u = uid(req); if (!u) return { teams: [] };
      return { teams: db.all<any>(`SELECT t.*, tm.role FROM teams t JOIN team_members tm ON t.id=tm.team_id WHERE tm.user_id=? AND tm.status='approved' ORDER BY t.created_at DESC`, u) };
    });

    // ─── 团队列表 ───
    app.get('/api/teams', async (req) => {
      const page = Math.max(1, Number((req.query as any).page) || 1);
      const limit = 20;
      const teams = db.all<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count FROM teams t WHERE t.is_public=1 ORDER BY member_count DESC LIMIT ? OFFSET ?`, limit, (page - 1) * limit);
      return { teams, page, limit };
    });

    // ─── 搜索团队 ───
    app.get('/api/teams/search', async (req) => {
      const q = ((req.query as any).q || '').trim();
      if (!q || q.length < 2) return { teams: [] };
      const teams = db.all<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count FROM teams t WHERE t.is_public=1 AND t.name LIKE ? ORDER BY member_count DESC LIMIT 20`, `%${q}%`);
      return { teams };
    });

    // ─── 创建团队 ───
    app.post('/api/teams', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const { name, description, avatar, isPublic, maxMembers } = createTeamSchema.parse(req.body);
      const existing = db.get<TeamRow>('SELECT id FROM teams WHERE name=?', name);
      if (existing) return rep.status(409).send({ error: '团队名已存在' });
      db.run('INSERT INTO teams (name,description,avatar,is_public,creator_id,max_members) VALUES (?,?,?,?,?,?)', name, description, avatar || null, isPublic ? 1 : 0, userId, maxMembers);
      const team = db.get<TeamRow>('SELECT * FROM teams ORDER BY id DESC LIMIT 1');
      db.run('INSERT INTO team_members (team_id,user_id,role,status) VALUES (?,?,?,?)', team!.id, userId, 'owner', 'approved');
      return { success: true, team };
    });

    // ─── 团队详情 ───
    app.get('/api/teams/:id', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const team = db.get<any>(`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count FROM teams t WHERE t.id=?`, id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      const u = uid(req);
      if (!team.is_public && !memberRole(id, u || 0)) return rep.status(403).send({ error: '这是私密团队' });
      const myRole = u ? memberRole(id, u) : null;
      const myStatus = u ? db.get<{ status: string }>('SELECT status FROM team_members WHERE team_id=? AND user_id=?', id, u)?.status : null;
      team.myRole = myRole;
      team.myApplicationStatus = myRole ? null : myStatus || null;
      return team;
    });

    // ─── 更新团队 ───
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
      if (sets.length === 0) return rep.status(400).send({ error: '没有要更新的字段' });
      sets.push("updated_at=datetime('now')");
      vals.push(id);
      db.run(`UPDATE teams SET ${sets.join(',')} WHERE id=?`, ...vals);
      return { success: true, message: '团队信息已更新' };
    });

    // ─── 删除团队 ───
    app.delete('/api/teams/:id', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      const team = db.get<TeamRow>('SELECT * FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      if (team.creator_id !== userId && !isAdmin(db, userId)) return rep.status(403).send({ error: '仅创建者可删除' });
      db.run('DELETE FROM team_members WHERE team_id=?', id);
      db.run('DELETE FROM teams WHERE id=?', id);
      return { success: true, message: '团队已删除' };
    });

    // ─── 统计 ───
    app.get('/api/teams/:id/stats', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      const team = db.get<TeamRow>('SELECT id FROM teams WHERE id=?', id);
      if (!team) return rep.status(404).send({ error: '团队不存在' });
      const memberCount = db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_members WHERE team_id=? AND status=\'approved\'', id)!.c;
      const pendingCount = db.get<{ c: number }>('SELECT COUNT(*) as c FROM team_members WHERE team_id=? AND status=\'pending\'', id)!.c;
      return { memberCount, pendingCount };
    });

    // ══════════════════════════════════════════
    // 成员管理
    // ══════════════════════════════════════════

    // ─── 申请加入 ───
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

    // ─── 退出团队 ───
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

    // ─── 成员列表 ───
    app.get('/api/teams/:id/members', async (req, rep) => {
      const id = Number((req.params as { id: string }).id);
      if (!db.get('SELECT id FROM teams WHERE id=?', id)) return rep.status(404).send({ error: '团队不存在' });
      const members = db.all<any>(`SELECT tm.*, u.username FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=? AND tm.status='approved' ORDER BY tm.role, tm.joined_at`, id);
      return { members };
    });

    // ─── 待审批列表 ───
    app.get('/api/teams/:id/applications', async (req, rep) => {
      const userId = uid(req); if (!userId) return rep.status(401).send({ error: '请先登录' });
      const id = Number((req.params as { id: string }).id);
      if (!isTeamAdmin(id, userId)) return rep.status(403).send({ error: '仅管理员可查看' });
      const applications = db.all<any>(`SELECT tm.*, u.username FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=? AND tm.status='pending' ORDER BY tm.joined_at DESC`, id);
      return { applications };
    });

    // ─── 审批/移除成员 ───
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

    // ─── 移除成员 ───
    app.delete('/api/teams/:id/members/:userId', async (req, rep) => {
      const adminId = uid(req); if (!adminId) return rep.status(401).send({ error: '请先登录' });
      const teamId = Number((req.params as { id: string }).id);
      const targetId = Number((req.params as any).userId);
      if (!isTeamAdmin(teamId, adminId)) return rep.status(403).send({ error: '仅管理员可操作' });
      const target = db.get<MemberRow>('SELECT role FROM team_members WHERE team_id=? AND user_id=? AND status=\'approved\'', teamId, targetId);
      if (!target) return rep.status(404).send({ error: '成员不存在' });
      if (['owner', 'admin'].includes(target.role) && !isAdmin(db, adminId)) return rep.status(403).send({ error: '不能移除管理员' });
      db.run('DELETE FROM team_members WHERE team_id=? AND user_id=?', teamId, targetId);
      return { success: true, message: '已移除' };
    });
  },
};

export default teamsPlugin;
