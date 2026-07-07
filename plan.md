# 校园论坛团队功能开发计划

## 项目概述

为校园论坛添加团队功能模块，支持学生创建和管理社团/团队，实现团队成员管理、团队专属内容发布等功能。

## 技术栈

- **前端**: React + TypeScript + Tailwind CSS + Zustand
- **后端**: Node.js + Fastify + SQLite
- **架构**: 插件化架构（参照现有 boards/posts 插件）

---

## Phase 1: 数据库与基础API

### 1.1 数据库表设计

**新增表**:
- `teams` - 团队主表
- `team_members` - 团队成员关系表

**文件修改**:
- `packages/database/src/schema.ts` - 添加表定义和迁移

### 1.2 后端插件开发

**新建文件**:
- `plugins/teams/src/index.ts` - 团队插件主文件

**API接口**:

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/teams` | GET | 获取团队列表 |
| `/api/teams` | POST | 创建团队 |
| `/api/teams/:id` | GET | 获取团队详情 |
| `/api/teams/:id` | PUT | 更新团队信息 |
| `/api/teams/:id` | DELETE | 删除团队 |
| `/api/teams/my` | GET | 获取我的团队 |

### 1.3 插件注册

**文件修改**:
- `packages/server/src/index.ts` - 注册 teams 插件

---

## Phase 2: 成员管理功能

### 2.1 成员管理API

**扩展插件**:
- `plugins/teams/src/index.ts`

**新增接口**:

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/teams/:id/join` | POST | 申请加入团队 |
| `/api/teams/:id/leave` | POST | 退出团队 |
| `/api/teams/:id/members` | GET | 获取成员列表 |
| `/api/teams/:id/members/:userId` | PUT | 审批申请 |
| `/api/teams/:id/members/:userId` | DELETE | 移除成员 |
| `/api/teams/:id/applications` | GET | 获取待审批列表 |

### 2.2 权限逻辑

- 创建团队：登录用户
- 加入公开团队：直接加入
- 加入私密团队：需审批
- 编辑团队：管理员
- 删除团队：创建者
- 审批/移除成员：管理员

---

## Phase 3: 前端页面开发

### 3.1 页面组件

**新建文件**:

| 文件 | 路径 | 功能 |
|------|------|------|
| TeamCard.tsx | `packages/client/src/components/` | 团队卡片组件 |
| TeamMemberList.tsx | `packages/client/src/components/` | 成员列表组件 |
| Teams.tsx | `packages/client/src/pages/` | 团队列表首页 |
| TeamDetail.tsx | `packages/client/src/pages/` | 团队详情页 |
| CreateTeam.tsx | `packages/client/src/pages/` | 创建团队页 |
| MyTeams.tsx | `packages/client/src/pages/` | 我的团队页 |
| TeamManage.tsx | `packages/client/src/pages/` | 团队管理页 |

### 3.2 路由配置

**文件修改**:
- `packages/client/src/App.tsx` - 添加团队相关路由

### 3.3 API调用封装

**文件修改**:
- `packages/client/src/lib/api.ts` - 添加团队API方法

### 3.4 状态管理

**文件修改**:
- `packages/client/src/stores/` - 可能需要新增 teams store

---

## Phase 4: 团队内容与通知集成

### 4.1 团队帖子关联

**数据库修改**:
- `packages/database/src/schema.ts` - 添加 team_posts 关联表

**API扩展**:
- `plugins/teams/src/index.ts` - 添加团队帖子接口

**前端修改**:
- `packages/client/src/pages/NewPost.tsx` - 添加团队选择

### 4.2 通知集成

**文件修改**:
- `plugins/notifications/src/index.ts` - 添加团队相关通知类型

**通知事件**:
- `team_join_request` - 申请通知
- `team_join_approved` - 批准通知
- `team_join_rejected` - 拒绝通知
- `team_member_left` - 退出通知
- `team_post_added` - 新帖通知

---

## Phase 5: 搜索与优化

### 5.1 团队搜索

**API扩展**:
- `/api/teams/search?q=xxx` - 搜索团队

### 5.2 团队统计

**API扩展**:
- `/api/teams/:id/stats` - 获取团队统计数据

### 5.3 UI优化

- 团队卡片样式优化
- 响应式适配
- 加载状态处理

---

## 文件变更清单

### 新建文件

```
plugins/teams/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json

packages/client/src/
├── components/
│   ├── TeamCard.tsx
│   └── TeamMemberList.tsx
└── pages/
    ├── Teams.tsx
    ├── TeamDetail.tsx
    ├── CreateTeam.tsx
    ├── MyTeams.tsx
    └── TeamManage.tsx
```

### 修改文件

```
packages/database/src/schema.ts          # 添加表定义
packages/server/src/index.ts             # 注册插件
packages/client/src/App.tsx              # 添加路由
packages/client/src/lib/api.ts           # 添加API方法
plugins/notifications/src/index.ts       # 添加通知类型
```

---

## 开发顺序

```
1. 数据库表设计 (schema.ts)
2. 后端插件基础API (plugins/teams)
3. 插件注册 (server/index.ts)
4. 前端API封装 (api.ts)
5. 前端页面开发 (pages/components)
6. 路由配置 (App.tsx)
7. 成员管理功能
8. 团队帖子关联
9. 通知集成
10. 搜索与优化
```

---

## 依赖检查

### 现有依赖（已安装）

| 依赖 | 用途 |
|------|------|
| fastify | Web框架 |
| sqlite3 | 数据库 |
| bcryptjs | 密码加密 |
| zod | 数据校验 |
| axios | HTTP请求 |
| zustand | 状态管理 |
| tailwindcss | CSS框架 |
| lucide-react | 图标库 |

### 无需新增依赖

---

## 测试计划

### API测试

- 团队CRUD操作
- 成员申请/审批流程
- 权限验证（未登录、无权限）
- 数据校验（重复创建、参数错误）

### 前端测试

- 页面路由跳转
- 团队列表展示
- 申请加入功能
- 响应式布局

---

## 完成标准

1. ✅ 数据库表创建成功
2. ✅ 所有API接口正常工作
3. ✅ 前端页面可访问
4. ✅ 创建/加入/管理团队流程完整
5. ✅ 权限控制正确
6. ✅ 通知系统集成
