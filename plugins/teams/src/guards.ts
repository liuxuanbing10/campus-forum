import type { DatabaseAdapter, FastifyRequest, FastifyReply } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';

// 团队权限逻辑（从 handlers.ts 抽取，集中维护，便于复用与测试）
export async function memberRole(db: DatabaseAdapter, teamId: number, userId: number): Promise<string | null> {
  const { q } = kyselyQuery(db);
  const row = await q()!.selectFrom('team_members')
    .select('role')
    .where('team_id', '=', teamId)
    .where('user_id', '=', userId)
    .where('status', '=', 'approved')
    .executeTakeFirst() as { role: string } | undefined;
  return row?.role || null;
}

export async function isTeamAdmin(db: DatabaseAdapter, teamId: number, userId: number): Promise<boolean> {
  return ['owner', 'admin'].includes((await memberRole(db, teamId, userId)) || '');
}

export async function isTeamOwner(db: DatabaseAdapter, teamId: number, userId: number): Promise<boolean> {
  return (await memberRole(db, teamId, userId)) === 'owner';
}

function parseTeamId(req: FastifyRequest): number | null {
  const raw = (req.params as Record<string, string>).id;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// preHandler 工厂：必须是团队成员
export function requireTeamMember(db: DatabaseAdapter) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = req.userId;
    const teamId = parseTeamId(req);
    if (!userId) {
      reply.code(401).send({ error: '请先登录' });
      return;
    }
    if (!teamId) {
      reply.code(400).send({ error: '无效的团队 ID' });
      return;
    }
    const role = await memberRole(db, teamId, userId);
    if (!role) reply.code(403).send({ error: '你不是该团队成员' });
  };
}

// preHandler 工厂：必须是团队管理员或拥有者
export function requireTeamAdmin(db: DatabaseAdapter) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = req.userId;
    const teamId = parseTeamId(req);
    if (!userId) {
      reply.code(401).send({ error: '请先登录' });
      return;
    }
    if (!teamId) {
      reply.code(400).send({ error: '无效的团队 ID' });
      return;
    }
    const role = await memberRole(db, teamId, userId);
    if (role !== 'owner' && role !== 'admin') {
      reply.code(403).send({ error: '仅团队管理员可操作' });
    }
  };
}
