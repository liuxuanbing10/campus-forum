import type { Plugin } from '@campus-forum/core';
import { defaultTheme, type ThemeTokens } from './tokens.js';

export const themeDefaultPlugin: Plugin = {
  manifest: {
    name: 'theme-default',
    version: '0.1.0',
    description: '默认白色主题 — teal 绿主色 + 衬线文艺字体',
    author: 'campus-forum',
  },

  apply(ctx) {
    const { config } = ctx;

    // 注册主题 token 到配置，供客户端加载
    config.set('theme', defaultTheme);

    // 暴露主题注册 API（前端通过此端点获取可用主题列表）
    ctx.app.get('/api/theme', async () => {
      return { current: 'default', themes: [{ name: 'default', label: '默认白色', description: '纯白背景，teal 绿主色调，衬线文艺字体' }] };
    });

    ctx.app.get('/api/theme/tokens', async () => {
      return defaultTheme;
    });

    console.log('[theme-default] 已注册默认主题');
  },
};

export type { ThemeTokens };
export { defaultTheme };
export default themeDefaultPlugin;
