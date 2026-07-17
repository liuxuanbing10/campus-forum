# 重构计划

基于代码审计发现的问题，分三个阶段执行：

## 阶段一：后端架构优化

### 1. 提取公共工具函数到 core 包
- `addPoints(db, userId, delta)` - 积分操作
- `logAction(db, adminId, action, targetType, targetId, detail)` - 审计日志
- `notify(ctx, userId, type, message, ...)` - 通知发送
- `checkSensitive(db, text)` - 敏感词检测

**当前重复位置：**
- `plugins/posts/src/index.ts` (4个函数)
- `plugins/social/src/index.ts` (2个函数)
- `plugins/teams/src/handlers.ts` (1个函数)

### 2. 统一类型导出
- 将分散在各插件中的接口定义提取到 `packages/core/src/types.ts`
- 包括：AdminUser, BoardRow, PostRow, UserRow, CommentRow, TeamRow 等

### 3. 添加全局错误处理中间件
- 在 server/index.ts 中添加 Fastify 错误处理器
- 统一错误响应格式：`{ error: string, message?: string }`

### 4. 补充请求验证（zod）
- 为以下插件添加 zod schema：
  - auth (register, login)
  - teams (join, create, update)
  - messages (send)
  - search (query)

### 5. 修复代码格式
- 格式化 messages 插件（当前代码压缩在一起）
- 统一 import 风格

### 6. 添加数据库索引
- posts: board_id, author_id, created_at
- comments: post_id, author_id
- votes: post_id, user_id
- notifications: user_id, is_read

## 阶段二：前端性能优化

### 7. 全面代码分割
- 将所有页面组件改为 `React.lazy()` + `Suspense`
- 当前只有 Settings 用了 lazy load

**需要改造的页面：**
- Home, Board, PostDetail, NewPost, EditPost
- Teams, TeamDetail, CreateTeam, EditTeam
- Messages, Notifications, Search
- Admin, UserProfile, Favorites, MyPosts, MyTeams

### 8. 添加错误边界
- 创建 ErrorBoundary 组件
- 包裹整个应用，优雅降级

### 9. API 响应缓存（可选）
- 考虑引入 react-query 或 SWR
- 缓存 boards 列表、用户信息等静态数据

## 阶段三：测试与部署

### 10. 本地完整测试
- `npm run build:server` 确保后端编译通过
- `npm run build:client` 确保前端编译通过
- `npm run dev` 启动开发服务器
- 用浏览器验证核心功能：
  - 登录/注册
  - 发帖/评论
  - 团队管理
  - 消息系统

### 11. Git 提交
- 规范的 commit message
- `feat: 重构优化 - 提取公共工具、统一类型、性能优化`

### 12. 部署到服务器
- 按照 campus-forum-deploy skill 的流程
- 本地 build → tar 打包 → scp 传输 → 服务器解压 → pm2 restart
