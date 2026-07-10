import { Plugin, PluginContext } from '@campus-forum/core';
import { registerTeamRoutes } from './handlers.js';

export const teamsPlugin: Plugin = {
  manifest: { name: 'teams', version: '0.2.0', description: '社团/团队管理插件', author: 'campus-forum' },

  apply(ctx: PluginContext) {
    registerTeamRoutes(ctx);
  },
};

export default teamsPlugin;
