# 十三境论坛 (Campus Forum)

一个面向学生群体的校园论坛，以"十三境"视觉系统为骨架——13 套配色境象可一键切换，配合粒子动画与地支时钟，营造水墨与现代融合的浏览体验。

## 特性

- **十三境主题系统** — 13 套配色境象（玄水/青木/朱火/金风/土黄/天玄/地黄/日昀/月华/星河/云起/雾隐/雷动），站头三布局 + 粒子动画 + 地支时钟
- **插件化架构** — 13 个功能插件独立装载，按需启停
- **多端覆盖** — Web (PWA) + Android (Capacitor) + iOS (Capacitor) + 鸿蒙 (ArkUI WebView)
- **类型安全查询** — Kysely 构造器替代裸 SQL，全插件迁移完成
- **JWT 认证** — 无状态登录，设备码绑定防多号注册
- **第三方服务集成** — nodemailer 邮件 / bullmq 队列 / ioredis 缓存 / sharp 图像 / @fastify/multipart 文件上传
- **暗色主题** — `#1a1f2e` 深色背景 + `#e8e0d0` 米白前景 + `#d4a574` 暖金强调
- **响应式设计** — 桌面/平板/手机自适应，底部 Tab 导航 + safe-area 安全区适配

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript 5.7 + Vite 6 + Tailwind CSS 3.4 |
| 后端 | Node.js 22 + TypeScript + Fastify 5 |
| 数据库 | LibSQL (SQLite 兼容) + Kysely 类型安全查询 |
| 认证 | JWT (jsonwebtoken) + 设备码绑定 |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |
| 表单 | react-hook-form + zod + Radix UI |
| 富文本 | Tiptap 3 + CodeMirror + lowlight |
| 实时通信 | WebSocket (@fastify/websocket) |
| 文件上传 | @fastify/multipart (FormData) |
| 图像处理 | sharp |
| 邮件 | nodemailer |
| 队列 | bullmq + ioredis |
| 缓存 | ioredis (Redis) + lru-cache (进程内兜底) |
| PWA | vite-plugin-pwa |
| 移动端 | @capacitor/core + @capacitor/android + @capacitor/ios |
| 鸿蒙 | ArkUI WebView (DevEco Studio) |
| 插件系统 | 自研轻量级 IoC (PluginManager + EventBus) |

## 项目结构

```
campus-forum/
├── packages/
│   ├── core/          # 插件系统核心（类型定义 + PluginManager + EventBus）
│   ├── database/      # 数据库层（LibSQL + KyselyAdapter + Schema + Seed）
│   ├── server/        # Fastify 后端 API + 服务集成
│   ├── client/        # React 前端 SPA + Capacitor + HarmonyOS
│   │   ├── android/   # Capacitor Android 原生工程
│   │   ├── ios/       # Capacitor iOS 原生工程
│   │   └── harmony/   # 鸿蒙 ArkUI WebView 工程
│   └── data/          # 运行时数据（图片等，gitignore）
├── plugins/           # 13 个功能插件
│   ├── achievements/  # 成就系统
│   ├── admin/         # 管理后台
│   ├── auth/          # 认证（注册/登录/JWT）
│   ├── boards/        # 板块
│   ├── export/        # 数据导出（bullmq 队列）
│   ├── messages/      # 私信
│   ├── notifications/ # 通知（邮件 + 站内）
│   ├── posts/         # 帖子（multipart 上传）
│   ├── rss/           # RSS 订阅
│   ├── search/        # 全文搜索
│   ├── social/        # 关注/收藏
│   ├── teams/         # 团队
│   └── theme-default/ # 默认主题
├── .github/workflows/ # CI/CD（deploy.yml + build-apk.yml）
└── package.json       # Monorepo (npm workspaces)
```

## 快速开始

### 环境要求

- Node.js >= 22
- npm >= 10
- Java 21（构建 Android APK 时需要）
- Android SDK（构建 APK 时需要）
- DevEco Studio（构建鸿蒙 APP 时需要）

### 安装与启动

```bash
git clone https://github.com/liuxuanbing10/campus-forum.git
cd campus-forum
npm install
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001
- API 文档：http://localhost:3001/documentation

### 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run dev:server` | 只启动后端 |
| `npm run dev:client` | 只启动前端 |
| `npm run build` | 构建所有包 |
| `npm run build:server` | 按依赖顺序构建后端包 |
| `npm run build:client` | 构建前端 |
| `npm run start:server` | 启动后端生产服务 |
| `npm test` | 运行测试 (vitest) |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 |

## 部署

### 云服务器部署（当前生产环境）

- 服务器：`47.121.137.231`（Ubuntu 26.04, 2 vCPU / 2 GiB RAM）
- 进程管理：PM2 + ecosystem.config.cjs
- 反向代理：nginx 80 端口 → 3001 后端
- 数据库：SQLite `/opt/campus-forum/data/campus-forum.db`
- 部署方式：GitHub Actions push to main 自动触发

```bash
# 手动部署（SSH 可用时）
tar -czf /tmp/campus-forum-full.tar.gz --exclude='node_modules' --exclude='.git' .
scp /tmp/campus-forum-full.tar.gz root@47.121.137.231:/tmp/
ssh root@47.121.137.231 "cd /opt/campus-forum && tar -xzf /tmp/campus-forum-full.tar.gz && npm install --include=optional && pm2 restart campus-forum"
```

### 移动端构建

**Android APK**（GitHub Actions 自动构建）：

push 到 `mobile/capacitor` 分支或手动触发 `Build APK` workflow，构建产物 `campus-forum-debug.apk` 上传至 artifact。

**鸿蒙 APP**：

需在 DevEco Studio 中打开 `packages/client/harmony/` 编译，本地需配置鸿蒙 SDK。

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境（生产必须为 `production`） | `development` |
| `PORT` | 后端服务端口 | `3001` |
| `DATABASE_PATH` | SQLite 数据库文件路径 | `packages/server/data/forum.db` |
| `JWT_SECRET` | JWT 签名密钥 | 开发环境有默认值，生产必须修改 |
| `REDIS_URL` | Redis 连接地址（可选，未配置时降级到 lru-cache） | — |
| `SMTP_*` | 邮件服务配置（可选） | — |

## 开发指南

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### 添加新插件

1. 在 `plugins/` 下创建新目录
2. 创建 `package.json`，声明依赖 `@campus-forum/core`
3. 实现 `Plugin` 接口
4. 在 `packages/server/src/index.ts` 中注册插件

```typescript
import { Plugin } from '@campus-forum/core';

export const myPlugin: Plugin = {
  manifest: {
    name: 'my-feature',
    version: '0.1.0',
    description: '我的功能',
    author: 'your-name',
  },
  apply(ctx: PluginContext) {
    const { app, db } = ctx;
    // 使用 Kysely 类型安全查询
    app.get('/api/my-feature', async (request) => {
      const rows = await db.selectFrom('posts').selectAll().limit(10).execute();
      return { data: rows };
    });
  },
};
```

### 设备码机制

- 注册时：前端生成 UUID v4 设备码，POST `/api/auth/register` 时绑定到账号
- 登录时：仅需用户名 + 密码，不校验设备码
- 一个设备码只能绑定一个账号，防止多号注册

## 分支管理

| 分支 | 用途 |
|------|------|
| `main` | 主分支，服务端 + Web 前端，自动部署到云服务器 |
| `mobile/capacitor` | Android/iOS 原生 APP，push 自动触发 APK 构建 |
| `mobile/harmony` | 鸿蒙 ArkUI WebView 客户端 |

## License

MIT
