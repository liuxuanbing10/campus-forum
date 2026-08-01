import { Plugin, PluginContext } from '@campus-forum/core';
import { registerAuthRoutes } from './auth.js';
import { registerOauthRoutes } from './oauth.js';
import { registerAvatarRoutes } from './avatar.js';
import { registerDeviceRoutes } from './device.js';
import { registerBanRoutes } from './ban.js';

// ── 引入 ./types.ts 以触发 Fastify session 类型扩展（全局生效） ──
import './types.js';

export const authPlugin: Plugin = {
  manifest: {
    name: 'auth',
    version: '0.3.0',
    description: '用户认证插件（含设备码绑定）',
    author: 'campus-forum',
  },

  apply(ctx: PluginContext) {
    // ponytail: ban middleware must register last so the other routes exist first
    registerAuthRoutes(ctx);
    registerOauthRoutes(ctx);
    registerAvatarRoutes(ctx);
    registerDeviceRoutes(ctx);
    registerBanRoutes(ctx);
  },
};

export default authPlugin;
