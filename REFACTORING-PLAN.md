# 🔍 Campus Forum — 全项目代码审计报告

审计日期：2026-07-22 | 审计文件数：32 | 插件数：13

---

## 🔴 P0 — 阻断级问题（必须立刻修复）

### 1. `theme-default` 插件无入口文件
- **位置**: `plugins/theme-default/src/`
- **问题**: 只有 `tokens.ts` 定义了 `ThemeTokens` 接口和 `defaultTheme` 对象，没有 `index.ts`，服务器动态加载时找不到 Plugin 对象，**此插件永远不会被加载**。
- **影响**: 主题功能完全不可用，CSS 变量只能通过前端硬编码。
- **修复**: 创建 `plugins/theme-default/src/index.ts`，导出符合 Plugin 接口的模块。

### 2. `uploads` 插件目录为空
- **位置**: `plugins/uploads/`
- **问题**: 目录存在但 `src/` 下无任何源文件，版本号 0.0.0。
- **影响**: 如果上传功能依赖此插件，则完全不可用。
- **修复**: 移除空插件目录或实现真实内容。

### 3. WebSocket 服务器未实现但代码已调用
- **位置**: `plugins/messages/src/index.ts` 第32行
- **代码**: `(ctx as any).sendToUser?.(receiverId, 'new_message', {...})`
- **问题**: `sendToUser` 从未在任何地方定义或被注入 PluginContext。即使配置了 WebSocket 服务器，也没有将 sendToUser 函数挂载到 ctx 上。
- **影响**: 私信实时推送静默失败，用户收不到新消息通知（必须手动刷新页面）。
- **修复**: 在 server/src/index.ts 中初始化 WebSocket 服务，将 `sendToUser` 注入 ctx。

### 4. Zod 校验错误返回 500 而非 400
- **位置**: `packages/server/src/index.ts` — `setErrorHandler`
- **代码**:
  ```typescript
  const statusCode = err.statusCode || 500;
  ```
- **问题**: ZodError（来自 Zod v4）没有 `statusCode` 属性，会被当作 500 处理。这是**已知问题**但从未修复。
- **影响**: 所有 Zod 校验失败（标题太短、图片格式错误等）都返回 500 Internal Server Error，前端无法区分校验错误和真实服务器错误。
- **修复**: 在 error handler 中添加 `if (error instanceof ZodError)` 并返回 400。

### 5. admin 插件 `guard` 函数模式缺陷
- **位置**: `plugins/admin/src/index.ts` 第20-24行 + 所有handler
- **代码**:
  ```typescript
  const guard = async (req, rep) => {
    const userId = getUid(req);
    if (!userId) return rep.status(401).send({ error: '请先登录' });
    if (!(await checkIsAdmin(db, userId))) return rep.status(403).send({ error: '仅管理员可操作' });
  };
  // ...
  await guard(req, rep); if (rep.sent) return;
  ```
- **问题**: Fastify 的 `reply.send()` 不会立即设置 `reply.sent` 在 async handler 中同步检查。`rep.sent` 在 `return` 后可能尚未标记为已发送。而且先 return 再继续执行后续代码的模式在 Fastify 中不可靠——关键是 `guard` 函数 `return rep.status(...)` 的返回被丢弃了，handler 仍会继续执行。
- **影响**: 非管理员可能绕过权限检查，执行敏感操作。
- **修复**: 改用 preHandler hook 或直接在每个 handler 内检查。

---

## 🔴 P1 — 严重问题

### 6. 全局可变模块状态（social 插件）
- **位置**: `plugins/social/src/index.ts` 第3行
- **代码**: `let ctx: PluginContext;`
- **问题**: 模块级变量存储了 PluginContext 引用。虽然目前只加载一次，但违反了插件架构设计。如果插件被重新加载或热更新，旧引用会泄漏。
- **修复**: 移除全局 `ctx`，在需要用 `notify` 的地方通过闭包捕获。

### 7. OAuth 临时 Token 纯内存存储
- **位置**: `plugins/auth/src/index.ts` 第466行
- **代码**: `const oauthTempStore = new Map<...>();`
- **问题**: OAuth 流程中的临时 token 存在内存 Map 中：
  - ❌ 服务器重启后所有未完成的 OAuth 流程失效
  - ❌ Map 无限增长（只有过期检查，无定时清理）
  - ❌ 多进程/多实例部署下无法工作
- **影响**: OAuth 绑定/登录在部署更新后断裂。
- **修复**: 存储到 DB 表或使用 TTL 清理机制。

### 8. RSS / Export 插件代码单行压缩
- **位置**: `plugins/rss/src/index.ts`、`plugins/export/src/index.ts`
- **问题**: 全部代码被压缩到一行/两行，无缩进、无换行、无类型注解（除了必需的 import）。**比代码混淆更恶劣的写法**，任何修改都需要先格式化。
- **影响**: 不可维护、不可审查。
- **修复**: 格式化为可读代码，添加完整类型定义。

### 9. 认证 API 无速率限制
- **位置**: `plugins/auth/src/index.ts` — `/api/auth/login` + `/api/auth/register`
- **问题**: 全局限流 100次/分钟/IP 对所有 API 生效，但**登录和注册是攻击面最大的端点**，应当配置路由级严格限流（如每分钟最多 10 次登录尝试）。
- **影响**: 暴力破解攻击可行。
- **修复**: 在 login/register 路由上添加 `config: { rateLimit: { max: 10, timeWindow: '1 minute' } }`。

### 10. Post 详情中重复子查询
- **位置**: `plugins/posts/src/index.ts` 第241-254行
- **代码**: 同时使用了派生表 `v.like_count` 和独立子查询 `(SELECT COUNT(*) FROM votes WHERE post_id=p.id AND value=1) as upvotes`
- **问题**: `like_count` 和 `upvotes` 本应是相同数据，但通过不同查询计算，浪费了数据库资源。`downvotes` 在类型中不存在却被查询。
- **影响**: 多余的计算开销，特别是在评论数高的帖子上。
- **修复**: 移除冗余查询，统一使用一个数据源。

---

## 🟡 P2 — 中等问题

### 11. Session cookie `secure: false`
- **位置**: `packages/server/src/index.ts` 第144行
- **代码**: `cookie: { secure: false, maxAge: sessionMaxAge }`
- **问题**: 始终标记为不安全的 Cookie，即使在生产环境（HTTPS）下也通过明文传输。`@fastify/session` 的 cookie 配置缺少 `httpOnly` 和 `sameSite` 设置。
- **影响**: Session Cookie 可能被中间人窃取。
- **修复**: 根据 `NODE_ENV` 动态设置 `secure`，并添加 `httpOnly: true, sameSite: 'lax'`。

### 12. 帖子列表未过滤待审核帖子
- **位置**: `plugins/posts/src/index.ts` 第217-235行
- **问题**: `GET /api/posts` 没有 `WHERE p.is_pending=0` 条件。`GET /api/posts/my` 也没有过滤。所有发帖默认 `is_pending=1`（非管理员），导致未审核帖子对所有用户可见。
- **影响**: "审核队列"功能形同虚设——帖子审核前就已经公开显示了。
- **修复**: 为非管理员用户的列表查询添加 `is_pending=0` 过滤。

### 13. 团队内容帖子 `comment_count` 硬编码为 0
- **位置**: `plugins/teams/src/handlers.ts` 第393、416、431行
- **代码**: `0 as comment_count`
- **问题**: 团队内容帖子的评论数始终返回 0。前端显示永远为 0。
- **修复**: 添加子查询计算真实评论数。

### 14. Board CRUD 缺少 await
- **位置**: `plugins/posts/src/index.ts` 第115-117行
- **代码**: `if (body.name) await db.run(...)` — 实际上它们写成了 `if (body.name) await db.run(...)` ✅ 实际上有 await。但第 116-117 行：
  ```typescript
  if (body.description !== undefined) await db.run(...)
  if (body.icon !== undefined) await db.run(...)
  ```
  ✅ 也有 await。但第 127 行 `await db.run('DELETE FROM boards WHERE id = ?', id)` ✅。没问题。
  
  但 auth 插件中有多处缺少 await: 第 215、220、445、457、606、675、686 行等 `db.run` 没有 await。例如 OAuth 绑定（445行）: `db.run(...)` 没有 await。
- **修复**: 补全所有遗漏的 `await`。

### 15. 管理界面 `req.body as any` 过多
- **位置**: 多个插件的 admin 路由
- **问题**: 管理 API 使用 `as any` 而非 Zod 校验。如 admin 插件的用户创建、批量操作等。
- **影响**: 无法保证请求体格式正确，可能导致 SQL 注入或异常。
- **修复**: 添加 Zod Schema 校验。

### 16. 团队文件 `size` 存储类型不匹配
- **位置**: `plugins/teams/src/handlers.ts` 第597行
- **代码**: `String(finalSize)` 插入到 schema 中 `size INTEGER` 类型字段
- **问题**: 故意转字符串后存入 INTEGER 列，SQLite 会做隐式转换但语义错误。
- **修复**: 移除 `String()` 转换。

### 17. 头像上传文件持久化但无清理
- **位置**: `plugins/auth/src/index.ts` 第671-676行
- **问题**: 头像上传到 `uploads/` 目录累积不清理；旧头像文件残留，每次上传新头像都会产生新文件。
- **修复**: 上传前删除该用户旧头像文件。

### 18. Post 查询中没有过滤待审核帖子
- **位置**: `plugins/posts/src/index.ts` 第217行的 `GET /api/posts` 和 `plugins/boards/src/index.ts` 第51行的 `GET /api/boards/:id/posts`
- **问题**: 未审核帖子（`is_pending=1`）出现在公开的帖子列表中。
- **影响**: "帖子审核"功能完全失效。
- **修复**: 添加 `WHERE p.is_pending=0` 条件。

### 19. 模块级状态的 Toast 系统
- **位置**: `packages/client/src/App.tsx` 第39行
- **代码**: `let toastList: ToastProps[] = [];` + `const listeners = new Set<() => void>();`
- **问题**: 模块级别的可变状态，在测试/热重载中会泄漏，组件卸载后 listener 不会自动清理。
- **修复**: 使用 React Context 或 zustand store。

### 20. 重复的 `isAdmin` 函数
- **位置**: 
  - `packages/core/src/utils.ts` — `isAdmin()` ✅ 从 core 导出
  - `plugins/admin/src/index.ts` — `checkIsAdmin()` 完全相同的功能
- **问题**: admin 插件重新实现了 core 中已有的函数。
- **修复**: 使用 core 的 `isAdmin`。

### 21. 类型重复定义
- **位置**: 几乎所有插件都重新定义了 `UserRow`、`PostRow`、`CommentRow`、`BoardRow`、`TeamRow` 等类型，而 core/types.ts 中已存在相同定义。
- **影响**: 类型不同步风险，修改 schema 需要更新 N 处。
- **修复**: 统一从 core 包导入。

---

## 🟢 P3 — 建议优化

### 22. 文件上传无大小限制配置
- 上传 base64 图片 5MB 限制硬编码（`plugins/posts/src/index.ts` 第275行），OSS 上传无限制。

### 23. 无数据库连接池配置
- SQLite/libSQL 直接用默认设置，无 WAL 模式、无 busy_timeout 配置。

### 24. 没有 `total` 总数返回
- 帖子列表、评论列表等分页接口未返回 `total`，前端无法实现正确的分页状态。

### 25. User-Agent 拦截过于严格
- `bot-config.ts` 中，空 UA 直接拦截，但某些合法客户端可能不发送 UA。

### 26. `events` 事件总线未使用
- `SimpleEventBus` 已实现但没有任何插件注册或触发事件。属于死代码路径。

### 27. 日志记录无结构化
- `Logger` 实现直接映射到 `console.log/warn/error/debug`，无时间戳、无上下文。

### 28. getService 未实现
- `PluginContext.getService` 直接 throw Error，但有多个插件需要跨插件通信。

---

## 📋 P1 快速修复清单（最小改动量）

| # | 文件 | 修改 | 预估改动 |
|---|------|------|----------|
| 1 | `plugins/theme-default/src/index.ts` | 创建入口文件 | +10 行 |
| 2 | `plugins/uploads/` | 删除空目录 | 1 行 |
| 3 | `packages/server/src/index.ts` | WebSocket + sendToUser 注入 | ~50 行 |
| 4 | `packages/server/src/index.ts` | errorHandler 加 ZodError 检测 | +3 行 |
| 5 | `plugins/admin/src/index.ts` | 修复 guard 模式 | ~15 行 |
| 6 | `plugins/social/src/index.ts` | 移除全局 ctx | +2 行 |
| 7 | `plugins/auth/src/index.ts` | OAuth token 存 DB | ~30 行 |
| 8 | `plugins/rss/src/index.ts` + export | 格式化代码 | ~40 行 |
| 9 | `plugins/auth/src/index.ts` | 加路由级限流 | +4 行 |
| 10 | `plugins/posts/src/index.ts` | 去重子查询 | -5 行 |
| 11 | `packages/server/src/index.ts` | cookie secure 动态 | +3 行 |
| 12 | `plugins/posts/src/index.ts` | 列表查询加 is_pending=0 | +2 行 |
| 13 | `plugins/teams/src/handlers.ts` | comment_count 真实查询 | ~15 行 |
| 14 | `plugins/admin/src/index.ts` | 补 await | ~10 行 |
| 15 | `plugins/teams/src/handlers.ts` | String() 移除 | -2 行 |
| 16 | `plugins/auth/src/index.ts` | 上传前删旧头像 | +5 行 |
| 17 | `plugins/posts/src/index.ts` | 列表加 is_pending 过滤 | +2 行 |

---

📌 **上表中从 P1-P3 逐条对应上述问题编号**。
