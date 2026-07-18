# Campus-Forum UI 大升级计划

## 借鉴来源
- **campus-example**: 模块化架构、ElementUI 组件体系、标签系统
- **awesome-design-md skill**: 设计语言参考 (Linear 精确感 + Notion 温暖感)

## 阶段

### Phase 1: shadcn 基础设施
- [x] 安装依赖 (clsx, tailwind-merge, class-variance-authority, tw-animate-css)
- [ ] 创建 `src/lib/utils.ts` (cn 工具函数)
- [ ] 添加 shadcn CSS 变量到 globals.css (映射到现有主题)
- [ ] 创建 `src/components/ui/` 骨架

### Phase 2: 核心组件
- [ ] Button (扩展 btn-primary/btn-secondary 复用 shadcn 变体)
- [ ] Dialog (替换手写 ReportDialog/ShareModal)
- [ ] Select (替换手写下拉选择)
- [ ] DropdownMenu (用户菜单、帖子操作)
- [ ] Sheet (移动端侧边栏、设置面板)
- [ ] Command (搜索面板)
- [ ] Badge / Tabs / Popover

### Phase 3: 后台管理升级
- [ ] DataTable (帖子/用户管理列表)
- [ ] Sidebar (管理后台导航)
- [ ] 管理页面接入 shadcn 组件

### Phase 4: 测试 + 提交
- [ ] 构建验证 (tsc + vite build)
- [ ] 功能回归测试
- [ ] Git 提交
- [ ] 写开发日志
