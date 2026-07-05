# 贡献指南

## 开发规范

### Git 提交

使用[约定式提交](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[optional body]
```

**类型**：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`

**示例**：
```
feat(auth): 添加用户注册功能
fix(post): 修复帖子排序问题
docs(readme): 更新部署说明
```

### 分支命名

- `main` — 生产分支
- `develop` — 开发分支
- `feat/xxx` — 功能分支
- `fix/xxx` — 修复分支

### 代码风格

- TypeScript 严格模式
- 2 空格缩进
- 单引号
- 中文注释
- 函数/变量使用 camelCase
- 类型/接口使用 PascalCase

### 插件开发

每个功能模块作为独立插件：

```
plugins/
└── my-plugin/
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts
```

插件必须导出 `Plugin` 接口：

```typescript
import { Plugin } from '@campus-forum/core';

export const myPlugin: Plugin = {
  manifest: {
    name: 'my-plugin',
    version: '0.1.0',
    description: '插件描述',
    author: '作者名',
  },
  apply(ctx) {
    // 注册路由、服务等
  },
};

export default myPlugin;
```

### 前端组件

- 使用函数组件 + Hooks
- 状态管理用 Zustand
- 样式用 Tailwind CSS
- 组件文件使用 PascalCase（如 `UserProfile.tsx`）

## 开发流程

1. 从 `develop` 创建功能分支
2. 开发完成后提交 PR
3. 至少一人 Review
4. 合并到 `develop`
5. 定期从 `develop` 合并到 `main`

## 问题反馈

在 GitHub Issues 中反馈，使用以下模板：

- 🐛 Bug 报告
- ✨ 功能请求
- 📝 文档改进
