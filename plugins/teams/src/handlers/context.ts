import type { PluginContext, DatabaseAdapter } from '@campus-forum/core';
import type { KyselyAdapter } from '@campus-forum/database';

export interface TeamsContext {
  ctx: PluginContext;
  db: DatabaseAdapter;
  kdb: KyselyAdapter;
  q: () => ReturnType<KyselyAdapter['query']>;
}
