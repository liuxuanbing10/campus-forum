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
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | Node.js + TypeScript + Fastify |
| 数据库 | SQLite (sql.js) |
| 状态管理 | Zustand |
| 路由 | React Router v7 |
| 插件系统 | 自研轻量级 IoC 容器 |

## 📁 项目结构

```
campus-forum/
├── packages/
│   ├── core/          # 插件系统核心
│   ├── database/      # 数据库层
│   ├── server/        # Fastify 后端
│   └── client/        # React 前端
├── plugins/
│   ├── auth/          # 认证插件
│   ├── posts/         # 帖子插件
│   ├── comments/      # 评论插件
│   ├── boards/        # 板块插件
│   └── votes/         # 投票插件
├── package.json       # Monorepo 配置
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

# 初始化数据库
npm run db:migrate

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

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
    // Fastify 路由
    ctx.app.get('/api/my-endpoint', async () => {
      return { message: 'Hello from plugin!' };
    });
  },
};

export default myPlugin;
```

## 🎯 路线图

- [x] 项目骨架
- [ ] 用户认证系统
- [ ] 板块管理
- [ ] 帖子 CRUD
- [ ] 评论系统
- [ ] 投票功能
- [ ] 搜索功能
- [ ] 匿名发帖
- [ ] 暗色模式
- [ ] 移动端适配

## 📄 License

MIT
