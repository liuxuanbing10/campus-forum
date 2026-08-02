import { Plugin, PluginContext, ImageService } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';
import type { PostsContext, CacheService } from './context.js';
import { registerBoardRoutes } from './routes/boards.js';
import { registerPostRoutes } from './routes/posts.js';
import { registerCommentRoutes } from './routes/comments.js';
import { registerVoteRoutes } from './routes/votes.js';
import { registerFavoriteRoutes } from './routes/favorites.js';
import { registerUploadRoutes } from './routes/upload.js';
import { registerTagRoutes } from './routes/tags.js';
import { registerAdminRoutes } from './routes/admin.js';

// Re-export types for backward compatibility
export type { PostListItem, PostDetail } from './schemas.js';

export const postsPlugin: Plugin = {
  manifest: { name: 'posts', version: '0.6.0', description: '帖子管理 + zod 校验 + ImageService(sharp) + CacheService', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const { db } = ctx;
    const { kdb, q } = kyselyQuery(db);

    let imageService: ImageService | null = null;
    let cacheService: CacheService | null = null;
    try { imageService = ctx.getService<ImageService>('imageService'); } catch { /* 未注册时降级 */ }
    try { cacheService = ctx.getService<CacheService>('cacheService'); } catch { /* 未注册时降级 */ }

    const pc: PostsContext = { ctx, db, kdb, q, imageService, cacheService };

    registerBoardRoutes(pc);
    registerPostRoutes(pc);
    registerCommentRoutes(pc);
    registerVoteRoutes(pc);
    registerFavoriteRoutes(pc);
    registerUploadRoutes(pc);
    registerTagRoutes(pc);
    registerAdminRoutes(pc);
  },
};

export default postsPlugin;
