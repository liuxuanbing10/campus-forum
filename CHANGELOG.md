# 📋 校园论坛 (Campus Forum) 项目日志

> 始于 2026-07-05 · 47 commits · 2天从零到完工

---

## [v0.9.1] — 2026-07-10 🐛 Bug 修复 & 部署文档

### 🐛 修复
- 修复帖子详情页模板字符串语法错误（`$\{id}` → `${id}`），导致 API 请求全部 404
- 修复板块页 RSS 链接模板字符串语法错误
- 修复 Layout 组件移动端菜单状态变量未定义（`mobileOpen is not defined`）
- 删除 PostDetail 页重复的函数声明（`fetchStats` / `handleTogglePrivacy` / `handleTogglePin`）
- 修复点赞/收藏按钮动态类名模板字符串错误

### 📝 文档
- README 新增「部署」章节，包含 Vercel 一键部署、本地生产部署、Docker 部署三种方式
- 补充环境变量说明表
- 补充生产环境注意事项（数据库迁移、Session 存储、HTTPS、安全头等）

### 🛠️ 环境
- Node.js 版本升级至 v26.5.0

---

## [v0.9.0] — 2026-07-07 🎉 功能收关

### ✨ 新功能
- **搜索页** (`/search`) — 全文搜索+高亮关键词+分页加载
- **收藏页** (`/favorites`) — 查看收藏的帖子列表
- **通知页** (`/notifications`) — 完整通知历史（之前只有下拉）
- **管理后台** (`/admin`) — 用户列表、封禁、设管理员
- **编辑帖子** (`/edit-post/:id`) — 全新编辑页，支持图片+私密选项
- **我的团队** (`/teams/my`) — 查看已加入的团队

### 🎨 UI 增强
- 帖子详情页：添加**私密切换按钮** + **置顶切换按钮**
- 发帖页：添加**图片上传** + **私密帖子选项**
- 通知铃铛统一：删除重复图标，重写为 lucide 风格
- 导航栏："查看全部通知"链接

### 🔧 后端
- `PUT /api/auth/me` — 编辑个人资料（display_name/email/avatar）
- `PUT /api/auth/password` — 修改密码
- `POST /api/upload` — 图片上传接口
- `PUT /posts/:id/privacy` — 私密切换
- `PUT /posts/:id/pin` — 置顶切换
- `GET /api/favorites` 返回字段补充（content/view_count/is_private）

### 🐛 修复
- 修复收藏页面空白（PostListItem 接口缺少字段）
- 修复重复的通知铃铛图标
- 修复未读计数字段名兼容性
- 删除废弃的 Post.tsx 旧页面

### 📦 依赖
- 新增 `lucide-react` 图标库

---

## [v0.8.0] — 2026-07-07 🏟️ 团队功能

### ✨ 新功能
- **团队系统** — teams 插件（15个API）
  - 团队CRUD（创建/编辑/删除）
  - 成员管理（申请加入/退出/踢出/转让）
  - 团队搜索
  - 通知联动（加入申请、被踢等）
- **团队前端** — 4个页面
  - `/teams` — 团队列表页
  - `/teams/:id` — 团队详情页
  - `/teams/new` — 创建团队
  - `/teams/:id/edit` — 编辑团队

### 🎨 UI 增强
- 导航栏添加醒目的**返回首页按钮**
- 首页板块卡片半堆叠效果恢复
- 板块轮播滚动 bug 修复

---

## [v0.7.0] — 2026-07-07 🎨 视觉大升级

### ✨ 新功能
- 首页视觉效果重塑
  - 渐变水彩背景
  - 液态玻璃（Glassmorphism）效果
  - 板块卡片滚筒式堆叠效果
- 恢复多套主题配色 + 手写字体动画（10套主题）

---

## [v0.6.0] — 2026-07-06 📱 前端完整对接

### ✨ 新功能
- **前端所有页面对接后端 API**
  - 首页：板块轮播 / 帖子列表
  - 板块页：帖子列表 + 分页
  - 帖子详情：评论/点赞/收藏/删除全对接
  - 发帖页：板块选择 + 匿名选项
  - 我的帖子：个人帖子列表
- 登录不再校验设备码（支持多设备登录）
- 注册保留设备码防多开

### 🔧 后端
- `GET /api/posts/my` — 个人帖子列表
- `PUT /api/posts/:id/privacy` — 私密切换（后端就绪）
- `PUT /api/posts/:id/pin` — 置顶切换（后端就绪）

### 🐛 修复
- 修复重复路由注册
- 修复限流配置
- 统一 API 实例（所有页面共用 axios 实例）
- 前端路由覆盖完善

---

## [v0.5.0] — 2026-07-06 🎭 主题系统+设计稿对齐

### ✨ 新功能
- **10套可切换 UI 主题**
  - 手写字体风格
  - 首页标语自定义
- 所有 6 个页面按设计稿重构
  - 新增 email 字段到注册表单
- 懒更新：板块帖子数、首页标语

### 🐛 修复
- 管理员密码改为 admin123
- 补充 @fastify/rate-limit 依赖
- dotenv 加载问题

---

## [v0.4.0] — 2026-07-06 🔧 全栈重大重构

### ✨ 新功能
- **zod 校验** — 所有请求参数强类型校验
- **better-sqlite3** — 从 sql.js 迁移到同步原生 SQLite
- **插件自动发现** — server 自动加载 plugins/*/dist/ 下的插件
- **数据库迁移系统** — 幂等增量迁移，兼容旧 DB
- **swagger 文档**

### 🔧 后端
- `CASCADE` 外键约束（删帖子自动删评论/点赞等）
- 请求频率限制（@fastify/rate-limit）
- 重构类型系统（所有插件共享类型）

### 🐛 修复
- DB schema 迁移兼容旧版 device_code 字段

---

## [v0.3.0] — 2026-07-06 📝 核心功能爆发

### ✨ 新功能
- **posts 插件**
  - 板块 CRUD（创建/编辑/删除）
  - 帖子 CRUD（发布/编辑/删除）
  - 私密帖子（仅作者和管理员可见）
  - 置顶帖子
  - 帖子统计（浏览量等）
  - 分享链接生成
- **comments 插件**
  - 评论/回复/删除评论
  - 递归嵌套显示
- **search 插件**
  - 全文搜索（FTS5）
  - 搜索建议
- **admin 插件**
  - 用户管理（列表/封禁/解封）
  - 设管理员
- **notifications 插件**
  - 通知列表
  - 未读计数
  - 标记已读
- **uploads 插件**
  - 图片上传（本地存储）

---

## [v0.2.0] — 2026-07-06 🔐 用户认证

### ✨ 新功能
- **auth 插件**
  - 用户注册（设备码绑定防多开）
  - 登录/登出
  - Session 持久会话
  - 个人信息接口
- 种子数据：admin/admin123 + 5个默认板块

---

## [v0.1.0] — 2026-07-05 🚀 项目启动

### ✨ 初始化
- 项目脚手架搭建
- TypeScript monorepo（npm workspaces）
- 4 个基础包：core / database / server / client
- 插件系统核心架构
  - Plugin 接口 + PluginManager
  - PluginContext（app/db/events/logger/config）
  - SimpleEventBus 发布订阅
- SQLite 数据库 Schema（8张表）
  - users, boards, posts, comments, votes, favorites, tags, sessions
- Express 5 → **Fastify 5** 重构
- 基础 React 前端骨架
  - Layout 组件（导航栏+用户状态）
  - 6 个页面骨架（Home/Board/Post/NewPost/Login/Register）
  - Zustand 认证状态管理
- ESLint + Prettier 代码规范
- README / LICENSE / .env.example

---

## 🗺️ 路线图

### 已实现 ✅
- [x] 用户认证（注册/登录/登出/设备码）
- [x] 论坛板块管理
- [x] 帖子 CRUD（含匿名/私密/置顶）
- [x] 评论（嵌套回复）
- [x] 点赞/收藏/分享
- [x] 全文搜索（高亮+建议）
- [x] 管理后台
- [x] 通知系统
- [x] 图片上传
- [x] 团队/群组
- [x] 10套主题切换
- [x] 响应式手机适配
- [x] 搜索页/收藏页/通知页/设置页/管理后台

### 待规划 🔮
- [ ] 域名 + HTTPS
- [ ] 私信/站内信
- [ ] 积分/等级/经验系统
- [ ] 富文本编辑器（TinyMCE/Quill）
- [ ] 邮箱验证/找回密码
- [ ] 验证码防广告
- [ ] PWA 支持
- [ ] 敏感词过滤
- [ ] WebSocket 实时推送
- [ ] 数据统计看板
- [ ] SEO 优化
- [ ] 单元测试/E2E 测试
- [ ] CDN 图片加速
