import { requireAuth, notify } from '@campus-forum/core';
import { TeamRow, MemberRow } from '../schemas.js';
import { isTeamAdmin, isTeamOwner, memberRole } from '../guards.js';
import type { TeamsContext } from './context.js';

export function registerMemberRoutes(tc: TeamsContext) {
  const { ctx, db, kdb, q } = tc;
  const app = ctx.app;

  // ─── 加入团队 ───
  app.post('/api/teams/:id/join', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
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
      await notify(ctx, team.creator_id, 'team_joined', `${req.session?.username || '用户'}加入了你的团队「${team.name}」`, undefined, undefined, userId, id);
      return { success: true, message: '已加入团队' };
    } else {
      await q()!.insertInto('team_members')
        .values({ team_id: id, user_id: userId, role: 'member', status: 'pending' })
        .execute();
      const admins = await kdb.sql<{ user_id: number }>`SELECT user_id FROM team_members WHERE team_id=${id} AND role IN ('owner','admin') AND status='approved'`;
      for (const a of admins) await notify(ctx, a.user_id, 'team_join_request', `${req.session?.username || '用户'}申请加入「${team.name}」`, undefined, undefined, userId, id);
      return { success: true, message: '已提交申请，等待审批' };
    }
  });

  // ─── 退出团队 ───
  app.post('/api/teams/:id/leave', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
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
    await notify(ctx, team!.creator_id, 'team_member_left', `${req.session?.username || '用户'}退出了「${team!.name}」`, undefined, undefined, userId, id);
    return { success: true, message: '已退出团队' };
  });

  // ─── 成员列表 ───
  app.get('/api/teams/:id/members', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public', 'hide_members']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    const isMember = !!(await memberRole(db, id, u || 0));
    if (!team.is_public && !isMember) return rep.status(403).send({ error: '这是私密团队' });
    if (team.hide_members && !isMember) {
      return { members: [], hidden: true };
    }
    const members = await kdb.sql<Record<string, unknown>>`SELECT tm.*, u.username, u.display_name, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=${id} AND tm.status='approved' ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, tm.joined_at`;
    return { members };
  });

  // ─── 申请列表 ───
  app.get('/api/teams/:id/applications', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamAdmin(db, id, userId))) return rep.status(403).send({ error: '仅管理员可查看' });
    const applications = await kdb.sql<Record<string, unknown>>`SELECT tm.*, u.username, u.display_name, u.avatar_url FROM team_members tm JOIN users u ON tm.user_id=u.id WHERE tm.team_id=${id} AND tm.status='pending' ORDER BY tm.joined_at DESC`;
    return { applications };
  });

  // ─── 审批申请 ───
  app.put('/api/teams/:id/members/:userId', { preHandler: [requireAuth] }, async (req, rep) => {
    const adminId = req.userId!;
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as { userId: string }).userId);
    if (!(await isTeamAdmin(db, teamId, adminId))) return rep.status(403).send({ error: '仅管理员可操作' });
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

  // ─── 设置/取消管理员 ───
  app.post('/api/teams/:id/members/:userId/role', { preHandler: [requireAuth] }, async (req, rep) => {
    const adminId = req.userId!;
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as { userId: string }).userId);
    if (!(await isTeamOwner(db, teamId, adminId))) return rep.status(403).send({ error: '仅创建者可设置管理员' });
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

  // ─── 移除成员 ───
  app.delete('/api/teams/:id/members/:userId', { preHandler: [requireAuth] }, async (req, rep) => {
    const adminId = req.userId!;
    const teamId = Number((req.params as { id: string }).id);
    const targetId = Number((req.params as { userId: string }).userId);
    if (!(await isTeamAdmin(db, teamId, adminId))) return rep.status(403).send({ error: '仅管理员可操作' });
    const target = await q()!.selectFrom('team_members')
      .select('role')
      .where('team_id', '=', teamId)
      .where('user_id', '=', targetId)
      .where('status', '=', 'approved')
      .executeTakeFirst() as MemberRow | undefined;
    if (!target) return rep.status(404).send({ error: '成员不存在' });
    if (target.role === 'owner') return rep.status(403).send({ error: '不能移除创建者' });
    if (target.role === 'admin' && !(await isTeamOwner(db, teamId, adminId))) return rep.status(403).send({ error: '仅创建者可移除管理员' });
    await q()!.deleteFrom('team_members').where('team_id', '=', teamId).where('user_id', '=', targetId).execute();
    return { success: true, message: '已移除' };
  });
}
