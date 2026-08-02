import { z } from 'zod/v4';

// ── 类型定义 ──────────────────────────────────
export interface PostListItem {
  id: number; title: string; content: string; board_id: number; is_anonymous: number; is_pinned: number; is_private: number;
  images: string | null; created_at: string; author_name: string; board_name: string;
  like_count: number; comment_count: number; view_count: number; is_favorited: number;
}
export interface PostDetail extends PostListItem {
  author_id: number; updated_at: string; my_vote: number;
}

// ── Zod Schema ────────────────────────────────
export const createPostSchema = z.object({
  title: z.string().min(2, '标题至少 2 个字符').max(100, '标题最多 100 个字符'),
  content: z.string().min(1, '内容不能为空'),
  boardId: z.number().int().positive('请选择版块'),
  isAnonymous: z.boolean().optional().default(false),
  isPrivate: z.boolean().optional().default(false),
  images: z.array(z.string()).max(9, '最多 9 张图片').optional(),
});

export const updatePostSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  content: z.string().min(1).optional(),
  boardId: z.number().int().positive().optional(),
  isAnonymous: z.boolean().optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, '评论不能为空').max(1000, '评论不能超过 1000 字'),
  parentId: z.number().int().positive().optional(),
  isAnonymous: z.boolean().optional().default(false),
});

export const voteSchema = z.object({
  postId: z.number().int().positive().optional(),
  commentId: z.number().int().positive().optional(),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
}).refine(d => d.postId || d.commentId, { message: '请指定帖子或评论' });

export const favoriteSchema = z.object({ postId: z.number().int().positive('请指定帖子') });
export const boardSchema = z.object({ name: z.string().min(1, '版块名称不能为空'), description: z.string().optional(), icon: z.string().optional() });
export const uploadSchema = z.object({ image: z.string().min(1, '请提供图片数据'), filename: z.string().optional() });
export const paginationSchema = z.object({ page: z.coerce.number().int().positive().max(100).optional().default(1), boardId: z.coerce.number().int().positive().optional(), sort: z.enum(['latest', 'hot', 'replied']).optional().default('latest') });

// ── 工具函数 ──────────────────────────────────
export function parseMentions(text: string): string[] {
  return [...text.matchAll(/@(\w{2,20})/g)].map(m => m[1]);
}

// ── SQL 构建 ──────────────────────────────────
export function buildPostListSql(opts: {
  withContent?: boolean;
  withFavorites?: boolean;
  extraFields?: string[];
  fromOverride?: string;
  where?: string;
  orderBy?: string;
  limit?: boolean;
}) {
  const fields = [
    'p.id', 'p.title', 'p.board_id', 'p.is_anonymous', 'p.is_pinned', 'p.is_private', 'p.created_at',
    opts.withContent ? 'p.content' : '',
    'p.view_count',
    `CASE WHEN p.is_anonymous=1 THEN '匿名用户' ELSE u.username END as author_name`,
    'u.role as author_role',
    'b.name as board_name',
    'COALESCE(v.like_count,0) as like_count',
    'COALESCE(c.comment_count,0) as comment_count',
    opts.withFavorites ? `CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited` : '',
    ...(opts.extraFields || []),
  ].filter(Boolean).join(',');
  const from = opts.fromOverride || 'posts p';
  const joins = `JOIN users u ON p.author_id=u.id JOIN boards b ON p.board_id=b.id
         LEFT JOIN (SELECT post_id,COUNT(*) as like_count FROM votes WHERE value=1 GROUP BY post_id) v ON v.post_id=p.id
         LEFT JOIN (SELECT post_id,COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id=p.id`;
  const favoritesJoin = opts.withFavorites
    ? `\n         LEFT JOIN favorites f ON f.post_id=p.id AND f.user_id=?`
    : '';
  const where = opts.where ? ` ${opts.where}` : '';
  const orderBy = opts.orderBy ? ` ${opts.orderBy}` : '';
  const limitClause = opts.limit ? ' LIMIT ? OFFSET ?' : '';
  return `SELECT ${fields}\n         FROM ${from} ${joins}${favoritesJoin}${where}${orderBy}${limitClause}`;
}
