import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000,
    pool: 'forks',
    include: ['tests/**/*.test.ts'],
    env: {
      // Prevent buildApp from auto-starting the server on import
      VERCEL: '1',
      SESSION_SECRET: 'test-session-secret-at-least-32-chars!!',
    },
  },
  resolve: {
    alias: {
      // Workspace packages point to source (no dist/ in dev/test)
      '@campus-forum/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@campus-forum/database': path.resolve(__dirname, 'packages/database/src/index.ts'),
      '@campus-forum/server': path.resolve(__dirname, 'packages/server/src/index.ts'),
      '@campus-forum/plugin-auth': path.resolve(__dirname, 'plugins/auth/src/index.ts'),
    },
  },
});
