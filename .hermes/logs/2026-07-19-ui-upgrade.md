# UI 大升级开发日志

## 时间
2026-07-19 01:30 - 01:55

## 背景
借鉴 campus-example (SpringBoot + ElementUI) 的组件库思路，为 campus-forum 引入统一的 UI 组件系统。同时参考 awesome-design-md skill 的设计语言哲学（Linear 精确感 + Notion 温暖感）。

## 方案选择
- **备选**: shadcn v4 → 需要 Tailwind v4，与现有 v3 不兼容 ❌
- **备选**: Ant Design → 与 Tailwind 样式冲突 ❌
- **选定**: 手动编写 shadcn 风格组件 + 映射到现有 CSS 变量体系 ✅

## 关键决策
1. **CSS 变量映射**: 新增 shadcn 命名变量 (`--background`, `--primary`, `--radius` 等)，全部通过 `var()` 引用已有的 `--color-*` 变量。10 个主题自动继承。
2. **增量替换**: 不一次性替换所有手写组件，先从最明显的 Dialog / Button / Badge / Tabs 开始。
3. **文件结构**: 所有组件放 `src/components/ui/`，与业务组件 (`components/ReportDialog.tsx`) 分离。

## 技术细节
- `cn()` 工具函数使用 `clsx` + `tailwind-merge`
- Dialog 用 `open`/`onOpenChange` 受控模式，不依赖额外状态库
- Button 支持 7 种变体 + 4 种尺寸，复用现有 `bg-primary`/`text-white` 等 Tailwind 类
- 所有交互组件加了 `focus-visible` 环（无障碍键盘导航）

## 重构记录
- `ReportDialog.tsx` — 手写 Dialog → shadcn Dialog
- `ShareModal.tsx` — 手写 Dialog → shadcn Dialog
- `Admin.tsx` — 手写 ban modal → shadcn Dialog；Tab 按钮 → shadcn 样式变量；导入 Button/Badge

## 验证
- TypeScript 编译: 0 errors
- Vite 生产构建: ✅
- Dev server 启动: ✅ (http://localhost:5199)
- 页面响应正常: ✅

## 遗留问题
- Select / DropdownMenu / Command 等交互复杂组件尚未实现
- 管理后台 Sidebar 尚未接入
- 部分页面仍使用旧的 `bg-surface-hover` / `text-campus-text-secondary` 等类，可逐步迁移

## 设计参考来源
- awesome-design-md skill → Linear, Notion 美学
- campus-example → ElementUI 组件体系的模块化思路
