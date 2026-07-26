import { Plugin, PluginContext } from '@campus-forum/core';
import { KyselyAdapter } from '@campus-forum/database';
import { registerTeamRoutes } from './handlers.js';

export const teamsPlugin: Plugin = {
  manifest: { name: 'teams', version: '0.2.0', description: '社团/团队管理插件', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    const kdb = ctx.db as KyselyAdapter;
    const q = kdb.query?.bind(kdb);
    registerTeamRoutes(ctx);
  },
};

export default teamsPlugin;
