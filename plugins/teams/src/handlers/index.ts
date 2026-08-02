import { PluginContext } from '@campus-forum/core';
import { kyselyQuery } from '@campus-forum/database';
import type { TeamsContext } from './context.js';
import { registerCategoryRoutes } from './categories.js';
import { registerDiscoveryRoutes } from './discovery.js';
import { registerCrudRoutes } from './crud.js';
import { registerMemberRoutes } from './members.js';
import { registerContentRoutes } from './content.js';
import { registerFileRoutes } from './files.js';

export function registerTeamRoutes(ctx: PluginContext) {
  const { db } = ctx;
  const { kdb, q } = kyselyQuery(db);

  const tc: TeamsContext = { ctx, db, kdb, q };

  registerCategoryRoutes(tc);
  registerDiscoveryRoutes(tc);
  registerCrudRoutes(tc);
  registerMemberRoutes(tc);
  registerContentRoutes(tc);
  registerFileRoutes(tc);
}
