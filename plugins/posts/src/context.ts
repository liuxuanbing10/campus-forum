import type { PluginContext, DatabaseAdapter, ImageService } from '@campus-forum/core';
import type { KyselyAdapter } from '@campus-forum/database';

export interface CacheService {
  wrap<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T>;
  invalidate(pattern: string): Promise<number>;
}

export interface PostsContext {
  ctx: PluginContext;
  db: DatabaseAdapter;
  kdb: KyselyAdapter;
  q: () => ReturnType<KyselyAdapter['query']>;
  imageService: ImageService | null;
  cacheService: CacheService | null;
}
