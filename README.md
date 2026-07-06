# 🎓 校园论坛 (Campus Forum)

一个面向学生群体的校园论坛，支持匿名树洞、课程交流、二手交易等功能。

## ✨ 特性

- 🔌 **插件化架构** — 功能模块独立，按需增删
- 🎨 **现代化 UI** — React 19 + Tailwind CSS，支持暗色模式
- 🔒 **Session 认证** — 安全的用户登录注册
- 📱 **响应式设计** — 适配手机和桌面
- 🌲 **匿名树洞** — 匿名发帖，保护隐私
- 🔍 **搜索功能** — 全文搜索帖子内容

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
- 密码：`admin123`

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run dev:server` | 只启动后端 |
| `npm run dev:client` | 只启动前端 |
| `npm run build` | 构建所有包 |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 |

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
  apply(ctx) {
    // 注册 Fastify 路由
    ctx.app.get('/api/my-endpoint', async () => {
      return { message: 'Hello from plugin!' };
    });
  },
};

export default myPlugin;
```

## 🎯 路线图

- [x] 项目骨架
- [x] 用户认证系统（auth 插件）
- [x] 板块管理（boards 插件）
- [x] 帖子 CRUD（posts 插件）
- [x] 评论系统（posts 插件）
- [x] 投票功能（posts 插件）
- [x] 搜索功能（search 插件）
- [x] 匿名发帖（posts 插件）
- [ ] 暗色模式
- [ ] 移动端适配
- [ ] 私信功能
- [ ] 文件上传

## 📄 License

MIT — 详见 [LICENSE](./LICENSE)
