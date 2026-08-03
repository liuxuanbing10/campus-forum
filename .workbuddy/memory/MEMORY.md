# campus-forum 项目长期记忆

## 项目概况
十三境论坛（campus-forum）：面向学生的校园论坛，npm/pnpm monorepo。4 packages（core/server/database/client）+ 13 个功能插件。技术栈：React 19 + Fastify 5 + LibSQL/Kysely + Zustand 5 + React Router 7 + Vite + Tailwind + Tiptap 3 + sharp/bullmq/ioredis/nodemailer/ws + JWT + Capacitor（Android/iOS/鸿蒙）。生产部署 47.121.137.231，PM2 + nginx 反代，SQLite 数据库。

## 代码规范（CONTRIBUTING.md）
TypeScript 严格模式；2 空格缩进；单引号；中文注释；camelCase 变量/函数；PascalCase 类型/接口。约定式提交（feat/fix/docs/...）。每个功能模块独立插件，必须导出 `Plugin` 接口。

## 重要提醒
- 仓库内 `REFACTORING-PLAN.md`（2026-07-22 代码审计）**已于 2026-08-02 删除**：其结论已过时，所列 P0/P1/P2 多数已在后续提交修复。分析时一律以实际代码为准。
- `pnpm-workspace.yaml` 已于 2026-08-02 删除，npm workspaces 为单一真相源，无并存配置债务。
- `SimpleEventBus`/`EventBus` 死代码已于 2026-08-02 删除，core 不再导出。
- Kysely 以 `Kysely<AnyDB>` 使用（`AnyDB=any`，未类型化库官方用法；强约束为 Record 会让 achievements/auth/posts/teams/boards/admin 等插件大面积报错，得不偿失）；适配器层 `LibSQLAdapter`/`KyselyAdapter` 已显式类型化（Client/Row/InArgs/PreparedStatement/RunResult）。
- 测试：根套件 36/36（vitest，含真实 server+libsql 集成 18 例）；client 套件 13/13（MetaManager.test.tsx 5 + websocket.test.ts 8，jsdom 已入根 devDeps）；core/database 新增单测（plugin-manager 5、schema 5）。覆盖仍偏薄，但已非「仅 auth/teams」。
