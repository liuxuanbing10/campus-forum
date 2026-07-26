import type { Redis as RedisType } from 'ioredis';

/**
 * 缓存服务 · 基于 ioredis + lru-cache 双层缓存
 * - 优先用 Redis（若配置了 REDIS_URL）
 * - 否则降级为进程内 LRU 缓存
 * - 提供 get/set/del/invalidate 等 API
 * - 支持 JSON 序列化、TTL、批量删除
 * 
 * 注：lru-cache 以动态 import 方式加载，兼容 v10/v11
 */
export class CacheService {
  private redis: RedisType | null = null;
  private _lru: any = null;  // 懒加载 LRUCache 实例
  private prefix: string;
  private lruReady = false;

  constructor(opts?: {
    redisUrl?: string;
    prefix?: string;
    maxKeys?: number;
    ttlDefault?: number;
  }) {
    this.prefix = opts?.prefix || 'cf:';
    this.initLru(opts);

    // 尝试连接 Redis
    const url = opts?.redisUrl || process.env.REDIS_URL;
    if (url) {
      try {
        const RedisCtor = require('ioredis') as typeof import('ioredis');
        this.redis = new RedisCtor.default(url, {
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
          lazyConnect: false,
        });
        this.redis.on('error', (err: Error) => {
          console.warn('⚠️  Redis 连接错误，降级为 LRU 缓存:', err.message);
          this.redis?.disconnect();
          this.redis = null;
        });
        this.redis.on('connect', () => {
          console.log('✓ CacheService 已连接 Redis');
        });
      } catch (err) {
        console.warn('⚠️  ioredis 不可用，使用 LRU 缓存:', (err as Error).message);
        this.redis = null;
      }
    }
  }

  private initLru(opts?: { maxKeys?: number; ttlDefault?: number }): void {
    try {
      // 动态导入 lru-cache，兼容 v10/v11
      const LRUMod = require('lru-cache');
      const LRUCacheClass = LRUMod.LRUCache || LRUMod.default || LRUMod;
      this._lru = new LRUCacheClass({
        max: opts?.maxKeys ?? 500,
        ttl: (opts?.ttlDefault ?? 300) * 1000,
      });
      this.lruReady = true;
    } catch (err) {
      console.warn('⚠️  lru-cache 不可用，缓存降级为空实现:', (err as Error).message);
      this._lru = null;
      this.lruReady = false;
    }
  }

  private get lru(): any {
    return this._lru;
  }

  private key(k: string): string {
    return `${this.prefix}${k}`;
  }

  /**
   * 读取字符串
   */
  async get(key: string): Promise<string | null> {
    const k = this.key(key);
    if (this.redis) {
      try {
        return await this.redis.get(k);
      } catch {
        // Redis 出错，降级 LRU
      }
    }
    return this.lru.get(k) ?? null;
  }

  /**
   * 读取并反序列化 JSON
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * 写入字符串
   * @param ttl 秒；不传则用默认
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const k = this.key(key);
    const t = ttl ?? 300;
    if (this.redis) {
      try {
        await this.redis.set(k, value, 'EX', t);
        return;
      } catch {
        // 降级 LRU
      }
    }
    this.lru.set(k, value, { ttl: t * 1000 });
  }

  /**
   * 写入 JSON
   */
  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  /**
   * 删除单个 key
   */
  async del(key: string): Promise<void> {
    const k = this.key(key);
    if (this.redis) {
      try {
        await this.redis.del(k);
      } catch {}
    }
    this.lru.delete(k);
  }

  /**
   * 按 pattern 批量删除（如 "posts:*"）
   * 仅删除当前 prefix 下的匹配 key
   */
  async invalidate(pattern: string): Promise<number> {
    let count = 0;
    const fullPattern = this.key(pattern);

    if (this.redis) {
      try {
        const keys = await this.redis.keys(fullPattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          count += keys.length;
        }
      } catch {}
    }

    // LRU 也清掉匹配的
    const lruPattern = fullPattern.replace(/\*/g, '');
    for (const k of this.lru.keys()) {
      if (pattern.endsWith('*')) {
        if (k.startsWith(lruPattern)) {
          this.lru.delete(k);
          count++;
        }
      } else if (k === fullPattern) {
        this.lru.delete(k);
        count++;
      }
    }

    return count;
  }

  /**
   * 缓存包装：先查缓存，未命中则调用 loader 并缓存结果
   */
  async wrap<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.getJSON<T>(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    await this.setJSON(key, fresh, ttl);
    return fresh;
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.lru.clear();
  }

  /**
   * 是否使用 Redis
   */
  isUsingRedis(): boolean {
    return this.redis !== null;
  }
}
