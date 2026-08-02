import { requireAuth, isAdmin, notify } from '@campus-forum/core';
import { createTeamSchema, updateTeamSchema, TeamRow, MemberRow, genInviteCode } from '../schemas.js';
import { isTeamAdmin, isTeamOwner, memberRole } from '../guards.js';
import type { TeamsContext } from './context.js';

export function registerCrudRoutes(tc: TeamsContext) {
  const { ctx, db, kdb, q } = tc;
  const app = ctx.app;

  // ─── 创建团队 ───
  app.post('/api/teams', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
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

  // ─── 通过邀请码加入 ───
  app.post('/api/teams/join-by-code', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
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
    await notify(ctx, team.creator_id, 'team_joined', `${req.session?.username || '用户'}通过邀请码加入了「${team.name}」`, undefined, undefined, userId, team.id);
    return { success: true, teamId: team.id, message: '已加入团队' };
  });

  // ─── 团队详情 ───
  app.get('/api/teams/:id', async (req, rep) => {
    const id = Number((req.params as { id: string }).id);
    const team = await kdb.sql<Record<string, unknown>>`SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id=t.id AND status='approved') as member_count, (SELECT COUNT(*) FROM team_content_posts WHERE team_id=t.id) as post_count FROM teams t WHERE t.id=${id}`;
    const t = team[0];
    if (!t) return rep.status(404).send({ error: '团队不存在' });
    const u = req.userId;
    if (!t.is_public && !(await memberRole(db, id, u || 0))) return rep.status(403).send({ error: '这是私密团队' });
    const myRole = u ? await memberRole(db, id, u) : null;
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

  // ─── 更新团队 ───
  app.put('/api/teams/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').selectAll().where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!(await isTeamAdmin(db, id, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
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

  // ─── 重置邀请码 ───
  app.post('/api/teams/:id/reset-invite', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').selectAll().where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!(await isTeamAdmin(db, id, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
    let code = genInviteCode();
    while (await q()!.selectFrom('teams').select('id').where('invite_code', '=', code).executeTakeFirst()) code = genInviteCode();
    await q()!.updateTable('teams')
      .set({ invite_code: code, updated_at: new Date().toISOString() })
      .where('id', '=', id)
      .execute();
    return { success: true, inviteCode: code };
  });

  // ─── 删除团队 ───
  app.delete('/api/teams/:id', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
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

  // ─── 转让所有权 ───
  app.post('/api/teams/:id/transfer', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    if (!(await isTeamOwner(db, id, userId))) return rep.status(403).send({ error: '仅创建者可转让' });
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

  // ─── 收藏/取消收藏 ───
  app.post('/api/teams/:id/favorite', { preHandler: [requireAuth] }, async (req, rep) => {
    const userId = req.userId!;
    const id = Number((req.params as { id: string }).id);
    const team = await q()!.selectFrom('teams').select(['id', 'is_public']).where('id', '=', id).executeTakeFirst() as TeamRow | undefined;
    if (!team) return rep.status(404).send({ error: '团队不存在' });
    if (!team.is_public && !(await memberRole(db, id, userId))) return rep.status(403).send({ error: '这是私密团队' });
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
}
