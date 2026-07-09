# 🎓 校园论坛 (Campus Forum)

一个面向学生群体的校园论坛，支持匿名树洞、课程交流、二手交易等功能。

## ✨ 特性

- 🔌 **插件化架构** — 功能模块独立，按需增删
- 🎨 **现代化 UI** — React 19 + Tailwind CSS，支持暗色模式
- 🔒 **Session 认证** — 安全的用户登录注册
- 📱 **响应式设计** — 适配手机和桌面
- 🌲 **匿名树洞** — 匿名发帖，保护隐私
- 🔍 **搜索功能** — 全文搜索帖子内容
- 📟 **设备码绑定** — 一个设备码只能登录一个账号

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 6 + Tailwind CSS 3.4 |
| 后端 | Node.js + TypeScript + Fastify 5 |
| 数据库 | SQLite (sql.js) |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |
| 插件系统 | 自研轻量级 IoC 容器 (PluginManager + EventBus) |

## 📁 项目结构

```
campus-forum/
├── packages/
│   ├── core/          # 插件系统核心（类型定义 + PluginManager + EventBus）
│   ├── database/      # 数据库层（sql.js 适配器 + Schema + Seed）
│   ├── server/        # Fastify 后端 API
│   └── client/        # React 前端 SPA
├── plugins/
│   └── auth/          # 认证插件（注册/登录/登出/获取当前用户）
├── package.json       # Monorepo 配置（npm workspaces）
└── tsconfig.base.json # TypeScript 基础配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 22
- npm >= 10

### 安装

```bash
# 克隆仓库
git clone https://github.com/liuxuanbing10/campus-forum.git
cd campus-forum

# 安装依赖
npm install

# 启动开发服务器（前端 + 后端同时启动）
npm run dev
```

前端访问 http://localhost:5173，后端 API 运行在 http://localhost:3001。

### 默认账号

- 用户名：`admin`
- 密码：`123456`

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run dev:server` | 只启动后端 |
| `npm run dev:client` | 只启动前端 |
| `npm run build` | 构建所有包 |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 |

## 🚢 部署

### Vercel 一键部署

本项目已配置好 Vercel 部署，支持前后端一体化部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/liuxuanbing10/campus-forum)

**部署说明：**
- 前端静态资源由 Vercel CDN 托管
- 后端 API 通过 Vercel Serverless Functions 运行
- 数据库使用 SQLite（文件存储在 `/tmp` 目录，注意：Vercel Serverless 环境为无状态，数据不持久化，生产环境建议改用 PostgreSQL 或 MySQL）

**部署步骤：**
1. 点击上方按钮，或在 Vercel 中导入本仓库
2. 配置环境变量（见下方）
3. 点击 Deploy，等待构建完成
4. 部署成功后访问 Vercel 分配的域名即可

### 本地生产部署

```bash
# 1. 安装依赖
npm install

# 2. 构建所有包
npm run build

# 3. 启动后端服务
npm run start:server

# 4. 前端静态文件位于 packages/client/dist，可用 nginx 等托管
```

### Docker 部署

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY plugins ./plugins
COPY tsconfig.base.json ./
RUN npm install && npm run build
EXPOSE 3001
CMD ["npm", "run", "start:server"]
```

前端构建产物 `packages/client/dist` 可单独用 Nginx 托管，也可由后端提供静态文件服务。

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 后端服务端口 | `3001` |
| `DATABASE_PATH` | SQLite 数据库文件路径 | `packages/server/data/forum.db` |
| `SESSION_SECRET` | Session 加密密钥 | （开发环境有默认值，生产环境必须修改） |

### 生产环境注意事项

1. **数据库迁移**：生产环境建议从 SQLite 切换到 PostgreSQL 或 MySQL，确保数据持久化和并发性能
2. **Session 存储**：默认使用内存存储，多实例部署时需改用 Redis 等外部存储
3. **HTTPS**：生产环境必须启用 HTTPS，Vercel 部署自动提供
4. **速率限制**：已内置 `@fastify/rate-limit`，可根据需要调整阈值
5. **安全头**：已内置 `@fastify/helmet`，提供基础安全防护
6. **备份**：定期备份数据库文件，防止数据丢失

## 📝 开发指南

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

### 添加新插件

1. 在 `plugins/` 下创建新目录
2. 创建 `package.json`，声明依赖 `@campus-forum/core`
3. 实现 `Plugin` 接口
4. 在 `packages/server/src/index.ts` 中注册插件

### 插件示例

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
    // 添加路由
    app.get('/api/my-feature', async () => {
      return { hello: 'world' };
    });
  },
};
```

### 设备码说明

前端使用 localStorage 自动生成设备码（UUID v4），通过 `X-Device-Code` 请求头自动发送到后端。一个设备码只能绑定一个账号，换设备/清缓存后需要重新登录。

## 📄 License

MIT
