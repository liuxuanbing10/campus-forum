// ESLint v9 Flat Config — 校园论坛项目
// 从 .eslintrc.cjs 迁移而来，适配 ESLint v9 的 flat config 格式
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // 全局忽略
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/release/**',
      '**/apk-output/**',
      '**/*.d.ts',
      'packages/client/src/vite-env.d.ts',
      'packages/database/src/sql.js.d.ts',
      '**/capacitor.config.ts',
      '**/vite.config.ts',
      '**/vitest.config.ts',
      '**/postcss.config.js',
      '**/tailwind.config.js',
      '**/*.cjs',
    ],
  },
  // JS 基础规则
  js.configs.recommended,
  // TypeScript 配置（适用于所有 .ts/.tsx 文件）
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // 允许 console（项目大量使用 console.log 进行日志输出）
      'no-console': 'off',
      // TypeScript 项目中由 TS 编译器负责未定义变量检查，
      // ESLint 的 no-undef 对类型引用（如 React.FormEvent）会误报
      'no-undef': 'off',
    },
  },
  // 客户端测试文件配置（使用 jsdom 环境）
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  // 关闭与 Prettier 冲突的规则
  prettierConfig,
];
