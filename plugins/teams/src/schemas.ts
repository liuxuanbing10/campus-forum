import { z } from 'zod/v4';
import type { TeamRow, MemberRow, AnnouncementRow } from '@campus-forum/core';

export type { TeamRow, MemberRow, AnnouncementRow };

export const createTeamSchema = z.object({
  name: z.string().min(2, '团队名至少 2 个字符').max(30, '团队名最多 30 个字符'),
  description: z.string().max(500, '描述最多 500 字符').default(''),
  avatar: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  maxMembers: z.number().int().min(2).max(200).optional().default(50),
  categoryId: z.number().int().optional(),
  hideMembers: z.boolean().optional().default(false),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(30).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().optional(),
  isPublic: z.boolean().optional(),
  maxMembers: z.number().int().min(2).max(200).optional(),
  categoryId: z.number().int().nullable().optional(),
  hideMembers: z.boolean().optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  isPinned: z.boolean().optional().default(false),
});

export function genInviteCode(): string {
  return Math.random().toString(36).substring(2, 10);
}
