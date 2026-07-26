# 十三境 · 校园论坛前端重构 SPEC

> 灵感来源：`C:\Users\xiexi\Downloads\Qwen_html_20260725_jy5lrcx8h.html`
> 核心理念：以"十三境"为设计骨架，每境一种配色 + 一种版式 + 一种粒子 + 一种字体，构建极具东方美学的沉浸式论坛体验。
> 技术栈：React 19 + Vite 6 + TS 5.7 + Tailwind 3 + Framer Motion + GSAP + Radix UI + Sonner + cmdk + embla-carousel + vaul

---

## 一、设计总则

### 1.1 视觉哲学
- **拒绝通用 AI 美学**：禁用 Inter/Roboto/system-ui 作为展示字体，改用中文书法字（马善政、志莽行、龙藏、站酷小薇、清刻黄油、快乐体）+ Noto Serif/Sans SC
- **沉浸式氛围**：每境都有独属粒子（萤火/落花/星辰/雨滴/微尘/露珠/落叶/孔明灯/沙粒）+ 雾气 + 噪点叠加
- **东方排版**：竖排品牌字、罗盘时辰、印章、藻井、长亭、十二时辰、二十四节气等元素融入

### 1.2 重构原则
- **替换自研插件**：原 MeteorSignature/Toast/ThemeSwitcher/Skeleton 等自研组件，能用成熟三方库替代的全部替换
  - Toast → `sonner`
  - 下拉/对话框/选择器 → `@radix-ui/react-*`
  - 动画 → `framer-motion`（主）+ `gsap`（辅，仅用于复杂时序）
  - 轮播/横向滑动 → `embla-carousel-react`
  - 移动端抽屉 → `vaul`
  - 命令面板/搜索 → `cmdk`
  - 表格 → `@tanstack/react-table`
  - 表单 → `react-hook-form` + `zod`
- **保留功能、重塑皮相**：所有现有业务功能（登录、发帖、团队、成就、消息、搜索、管理后台）逻辑保留，仅替换 UI

---

## 二、十三境配置

每境包含：`name`(名) / `cat`(类目) / `seal`(印章) / `pal`(配色) / `feed`(版式) / `amb`(粒子) / `mh`(站头布局) / `deco`(装饰) / `pentads`(三候) / `sub`(副标) / `bc`(公告) / `ft`(页脚) / `cap`(摄影标题) / `sl`(标语数组)

| # | 境名 | 类目 | 配色 | 版式 | 粒子 | 站头 | 装饰 |
|---|---|---|---|---|---|---|---|
| 1 | 流年拾光 | 自度·时 | r1 暗绿金 | timeline 编年光脊 | firefly 萤火 | mhC | dial 罗盘 |
| 2 | 如梦令 | 词牌·幻 | r2 暮紫 | scatter 残梦碎片 | petal 落花 | mhA | — |
| 3 | 参商 | 星宿·离 | r3 深夜蓝 | stars 双星 | star 星辰 | mhA | — |
| 4 | 千里江山 | 山河·卷 | r4 青绿 | scroll 横向手卷 | mist 雾气 | mhB | — |
| 5 | 潇湘 | 水·八景 | r5 苍青 | windows 八景漏窗 | mist 雾气 | mhA | — |
| 6 | 雷乃发声 | 节气·春 | r6 嫩芽绿 | sprout 破土 | rain 雨丝 | mhB | — |
| 7 | 麦秋至 | 节气·夏 | r7 米黄 | sparse 留白半满 | mote 微尘 | mhA | — |
| 8 | 白露 | 节气·秋 | r8 雾灰 | wide 三候宽幅 | dew 露珠 | mhB | pentads |
| 9 | 雨霖铃 | 词牌·别 | r9 远山蓝 | pavilion 十里长亭 | rain 雨丝 | mhA | — |
| 10 | 高山流水 | 琴·音 | r10 古琴褐 | strings 七弦 | none | mhB | — |
| 11 | 藻井星河 | 壁画·窟 | r11 敦煌赭 | niche 窟龛 | sand 沙粒 | mhC | zaojing 藻井 |
| 12 | 青梧里 | 梧桐·荫 | r12 翠梧绿 | masonry 光斑棋格 | leaf 落叶 | mhA | — |
| 13 | 夜航船 | 夜渡·灯 | r13 夜灯橙 | river 灯河蜿蜒 | lantern 孔明灯 | mhA | — |

---

## 三、十三种版式（Feed Layouts）

1. **timeline 编年光脊**：左侧时辰竖线 + 圆点，帖子按十二时辰排
2. **scatter 残梦碎片**：8 帖子绝对定位散落，轻微旋转，hover 拉直
3. **stars 双星**：单列 + 左边框 + ✦/✦ 交替色
4. **scroll 横向手卷**：横向滚动 + scroll-snap，卷尾题跋
5. **windows 八景漏窗**：3 列网格 + 6 种圆角/clip-path 形状
6. **sprout 破土**：左对角线地平 + 错落缩进
7. **sparse 留白半满**：单列大间距，去边框仅留下划线
8. **wide 三候宽幅**：3 个竖排三候 + 宽幅单列
9. **pavilion 十里长亭**：5 站渐缩渐隐，每站带"长亭/都门/短亭/酒醒/更远处"
10. **strings 七弦**：7 根横线 + 帖子绝对定位 + 底部圆点拨弦点
11. **masonry 光斑棋格**：4 列 dense 网格 + feat/wide/tall 跨格
12. **niche 窟龛**：2 列 + 顶部圆角 + 顶部彩条
13. **river 灯河蜿蜒**：左竖虚线 + 灯笼 + 之字形错落 + 末尾"灯火阑珊处"

---

## 四、文件结构

```
packages/client/src/
├── components/
│   ├── realms/                       # 新增：十三境组件目录
│   │   ├── RealmProvider.tsx         # 境切换 Context + 数据
│   │   ├── realms.config.ts          # 十三境配置（数据驱动）
│   │   ├── RealmSwitcher.tsx         # 底部"渡船"导航
│   │   ├── ParticleField.tsx         # 粒子场（9 种类型）
│   │   ├── TopBar.tsx                # 顶栏（境名 + 导航 + 时钟 + 在线）
│   │   ├── Broadcast.tsx             # 公告跑马灯
│   │   ├── Masthead.tsx              # 站头（3 种布局）
│   │   ├── BrandPlaque.tsx           # 品牌竖字 + 印章 + 英文
│   │   ├── SloganRotator.tsx         # 标语轮播 + 复制
│   │   ├── CompassDial.tsx           # 罗盘（子时-亥时）
│   │   ├── CaissonDecoration.tsx     # 藻井（旋转星河）
│   │   ├── MountainScene.tsx         # SVG 山景剪影 + 窗格灯光
│   │   ├── PostFeeds/                # 13 种版式
│   │   │   ├── TimelineFeed.tsx
│   │   │   ├── ScatterFeed.tsx
│   │   │   ├── StarsFeed.tsx
│   │   │   ├── ScrollFeed.tsx
│   │   │   ├── WindowsFeed.tsx
│   │   │   ├── SproutFeed.tsx
│   │   │   ├── SparseFeed.tsx
│   │   │   ├── WideFeed.tsx
│   │   │   ├── PavilionFeed.tsx
│   │   │   ├── StringsFeed.tsx
│   │   │   ├── MasonryFeed.tsx
│   │   │   ├── NicheFeed.tsx
│   │   │   ├── RiverFeed.tsx
│   │   │   └── index.ts              # 版式分发器
│   │   └── sidebars/                 # 侧栏组件
│   │       ├── BoardsPanel.tsx
│   │       ├── StatsPanel.tsx
│   │       ├── PhotoPanel.tsx
│   │       └── WoodenFish.tsx        # 电子木鱼
│   ├── ui/                           # 已有 shadcn 组件
│   └── ... 其他已有组件保留
├── pages/
│   ├── Home.tsx                      # 重写：十三境主页
│   ├── Login.tsx                     # 重写：东方境登录
│   ├── Register.tsx                  # 重写
│   ├── Board.tsx                     # 重写：版块页（沿用版式）
│   ├── PostDetail.tsx                # 重写：帖子详情
│   ├── Settings.tsx                  # 重写：设置（vaul 抽屉）
│   ├── Search.tsx                    # 重写：cmdk 命令面板
│   └── ... 其他页面适配主题色
├── stores/
│   ├── theme.ts                      # 重写：10 主题 → 13 境
│   └── ...
├── styles/
│   ├── globals.css                   # 重写：13 境配色 + 字体 + 通用类
│   └── realms.css                    # 新增：13 境特有样式 + 13 种版式
└── lib/
    ├── api.ts                        # 保留
    ├── utils.ts                      # 保留 + cn 函数
    └── realm-utils.ts                # 新增：境相关工具（时辰、计数动画等）
```

---

## 五、分阶段实施

### Phase 1：基础设施（1-2h）
- [ ] `styles/globals.css` 重写：13 境配色变量（r1-r13）+ 字体引入（Google Fonts: Ma Shan Zheng, ZCOOL XiaoWei, Zhi Mang Xing, Long Cang, ZCOOL KuaiLe, ZCOOL QingKe HuangYou, Noto Serif SC, Noto Sans SC）+ 噪点/雾气通用类
- [ ] `stores/theme.ts` 重写：10 主题 → 13 境，保留 `setTheme/initTheme` API 兼容
- [ ] `lib/utils.ts` 增加 `cn` 函数（clsx + tailwind-merge）
- [ ] `lib/realm-utils.ts`：时辰映射、十二时辰中文名、countUp hook

### Phase 2：核心组件（3-4h）
- [ ] `realms.config.ts`：导出 13 境配置数组（与参考 HTML 中 R 数组对齐）
- [ ] `RealmProvider.tsx`：Context 提供当前境 index + 切换函数 + 持久化
- [ ] `RealmSwitcher.tsx`：底部"渡船"导航（13 个按钮 + 圆点 + 当前境高亮 + 键盘左右切换）
- [ ] `ParticleField.tsx`：根据 `amb` 类型生成粒子（用 framer-motion 替代 CSS keyframes，性能更好）
- [ ] `TopBar.tsx`：境名 + 导航 + 在线人数（每 3s 跳动）+ 时钟（每秒更新）
- [ ] `Broadcast.tsx`：跑马灯（CSS animation，hover 暂停）
- [ ] `Masthead.tsx`：3 种布局（mhA/mhB/mhC）+ 装饰位
- [ ] `BrandPlaque.tsx`：竖排品牌字 + 双层边框 plaque + 印章（hover 旋转回正）+ 英文小字
- [ ] `SloganRotator.tsx`：6 句轮播 + 复制 toast + 圆点指示器 + "换一句"按钮
- [ ] `CompassDial.tsx`：SVG 罗盘 + 12 地支字 + 指针随时间旋转
- [ ] `CaissonDecoration.tsx`：4 层嵌套 + 中心发光 + 70s 旋转
- [ ] `MountainScene.tsx`：3 层山影 SVG + 窗格灯光闪烁
- [ ] 13 种版式组件 `PostFeeds/*.tsx`：每种版式独立组件，统一 props `{ posts: Post[] }`
- [ ] 侧栏：`BoardsPanel/StatsPanel/PhotoPanel/WoodenFish`

### Phase 3：重写 Home.tsx（1-2h）
- [ ] 组合 RealmProvider + TopBar + Broadcast + Masthead + MountainScene + 主内容（panel + tabs + feed）+ 侧栏 + Footer
- [ ] 接入真实数据：`/boards` + `/posts?sort=latest`
- [ ] tabs 筛选用 Radix Tabs
- [ ] 无限滚动保留

### Phase 4：重写 Layout.tsx（1h）
- [ ] 顶栏改为 TopBar 风格（境名 + 在线 + 时钟）
- [ ] 底部导航：桌面端隐藏（渡船代替），移动端保留 BottomNav 但配色用境变量
- [ ] 用户菜单用 Radix DropdownMenu
- [ ] 搜索入口用 cmdk 触发器

### Phase 5：其他关键页面适配（2-3h）
- [ ] `Login.tsx`：东方境登录卡片（毛玻璃 + 印章 + 书法字标题）
- [ ] `Register.tsx`：同上
- [ ] `Settings.tsx`：vaul 抽屉式设置面板
- [ ] `Search.tsx`：cmdk 命令面板
- [ ] `Board.tsx/PostDetail.tsx/Admin.tsx`：仅替换 Tailwind 类名映射到新境变量，保留结构

### Phase 6：构建验证（30min）
- [ ] `tsc -b` 通过
- [ ] `vite build` 通过
- [ ] bundle 体积检查（应小于 800KB gzipped）

### Phase 7：浏览器测试（1h）
- [ ] 启动 dev server，逐境切换检查视觉效果
- [ ] 移动端响应式（980px 断点）
- [ ] 交互测试：标语复制、木鱼敲击、tabs 筛选、罗盘转动、粒子动画
- [ ] 性能检查：粒子数量适中，无明显卡顿

### Phase 8：提交部署（30min）
- [ ] git add + commit（信息：`feat: 十三境主题重构 - 替换自研组件为成熟三方库`）
- [ ] push 到 origin/main
- [ ] 触发 GitHub Actions 部署到云服务器
- [ ] 打开服务器地址验证

### Phase 9：移动端适配（1-2h）
- [ ] 切到 mobile/capacitor 分支，merge main
- [ ] 解决冲突（保留 main 的视觉效果，保留 capacitor 的原生配置）
- [ ] 构建并测试 APK
- [ ] mobile/harmony 同步

---

## 六、技术要点

### 6.1 13 境配色 CSS 变量结构
每境定义以下变量到 `[data-theme="r1"]`...`[data-theme="r13"]`：
```css
--g1, --g2, --g3          /* 三段渐变背景 */
--ink, --soft              /* 主文字 / 次文字 */
--acc, --acc2, --hot       /* 主色 / 副色 / 热色 */
--card, --line             /* 卡片底 / 分割线 */
--slogc, --glow            /* 标语色 / 标语光晕 */
--sealc                    /* 印章色 */
--disp, --body             /* 展示字体 / 正文字体 */
--mistc                    /* 雾气色 */
--sc1, --sc2, --sc3        /* 山影三色 */
--phsky, --phsun, --phglow, --phh1, --phh2, --phw  /* 摄影面板配色 */
```

### 6.2 Tailwind 配置映射
```js
colors: {
  realm: {
    ink: 'var(--ink)',
    soft: 'var(--soft)',
    acc: 'var(--acc)',
    acc2: 'var(--acc2)',
    hot: 'var(--hot)',
    card: 'var(--card)',
    line: 'var(--line)',
    g1: 'var(--g1)', g2: 'var(--g2)', g3: 'var(--g3)',
  }
}
fontFamily: {
  display: 'var(--disp)',
  body: 'var(--body)',
}
```

### 6.3 字体加载策略
- Google Fonts preconnect + swap 显示
- 仅在境切换时生效（CSS 变量自动级联）
- 中文书法字文件较大，但 Google Fonts 会自动子集化

### 6.4 性能优化
- 粒子用 React 状态 + transform，避免 reflow
- 罗盘/钟表用 setInterval 但批量更新
- 13 种版式按需加载（lazy import）
- 图片用 `loading="lazy"`

### 6.5 移动端适配
- 980px 以下：站头变单列、版式简化（scatter 变 flex 列、pavilion 取消缩进）
- 渡船横向滚动 + scroll-into-view
- 底部 tab bar 保留但配色跟随境

---

## 七、预期效果

完成后，主页将呈现：
1. 进入即见"流年拾光"境：暗绿金背景 + 萤火粒子 + 罗盘指示当前时辰 + 竖排"流年拾光"品牌 + 标语轮播
2. 底部"渡船"导航 13 境，点击切换：背景渐变、字体切换、版式切换、粒子切换
3. 每境都有独特的视觉记忆点：罗盘/藻井/灯河/七弦/窟龛/漏窗/手卷/光斑/长亭...
4. 所有交互都有动效：标语复制 toast、木鱼功德+1、tabs 筛选 pop 动画、数字 count-up
5. 整体视觉远超原紫色调，达到"东方美学沉浸式论坛"水准

---

## 八、风险与对策

| 风险 | 对策 |
|---|---|
| Google Fonts 加载慢 | preconnect + swap + 本地回退字体 |
| 13 境 CSS 体积大 | 用 CSS 变量，无重复样式；版式组件按需加载 |
| 粒子影响性能 | 数量控制在 10-50 之间，用 transform 而非 top/left |
| 境切换闪烁 | RealmProvider 用 startTransition 包裹 |
| 移动端版式混乱 | 980px 断点统一降级为简化版式 |
| 与现有业务冲突 | 保留所有路由和 API 调用，仅替换 UI 层 |

---

## 九、验收标准

- [ ] TypeScript 编译零错误
- [ ] Vite 生产构建通过
- [ ] 13 境可切换，每境视觉差异明显
- [ ] 粒子动画流畅（60fps）
- [ ] 移动端 980px 以下可正常浏览
- [ ] 所有原有功能（登录/发帖/团队/成就/消息/搜索/管理）可用
- [ ] 服务器地址访问正常
- [ ] APK 构建成功

---

## 十、Phase 10 · 后端第三方组件集成（新增）

> 目标：用已安装的成熟三方组件逐步替代手写实现，提升性能、可维护性、可观测性。
> 原则：**渐进式迁移**，保留 `DatabaseAdapter` 抽象与插件协议，不破坏云服务器运行中的 API 契约。

### 10.1 已安装但尚未启用的三方组件

| 组件 | 用途 | 优先级 | 风险 |
|---|---|---|---|
| `kysely` | 类型安全 SQL 查询构造器，替代裸 SQL 字符串 | 高 | 中（需迁移所有插件） |
| `ioredis` | Redis 缓存层（热帖列表、用户信息、会话） | 高 | 低（独立模块） |
| `bullmq` | 异步任务队列（帖子索引、数据导出、邮件发送） | 中 | 低（独立模块） |
| `nodemailer` | 邮件服务（密码重置、通知摘要） | 中 | 低（独立模块） |
| `sharp` | 图片处理（上传优化、缩略图、WebP 转换） | 高 | 低（独立模块） |
| `nanoid` | 短 ID 生成（替代 UUID，用于分享/文件名） | 低 | 低 |
| `lru-cache` | 进程内 LRU 缓存（无需 Redis 时的兜底） | 中 | 低 |
| `@fastify/multipart` | 文件上传（替代 base64 Data URL） | 中 | 中（需前后端协同） |

### 10.2 服务注册架构

在 `packages/server/src/index.ts` 中实现 `services` 注册表，注入到 `PluginContext.getService<T>(name)`：

```typescript
// services/image.ts
export interface ImageService {
  optimize(buffer: Buffer, opts?: { maxWidth?: number; quality?: number }): Promise<Buffer>;
  thumbnail(buffer: Buffer, size: number): Promise<Buffer>;
  toWebP(buffer: Buffer): Promise<Buffer>;
}

// services/cache.ts
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

// services/queue.ts
export interface QueueService {
  enqueue(name: string, payload: unknown): Promise<void>;
}

// services/mail.ts
export interface MailService {
  send(opts: { to: string; subject: string; html?: string; text?: string }): Promise<void>;
}
```

### 10.3 迁移阶段（按优先级）

**阶段 A（高优先级 · 低风险）**
- A1. 注册 `ImageService`（基于 sharp）→ posts 插件 `/api/upload` 改为：上传 → sharp 优化（maxWidth=1920, quality=85, format=webp）→ 存二进制
- A2. 注册 `CacheService`（基于 ioredis，无 Redis 时降级到 lru-cache）→ posts 插件热帖列表缓存 60s
- A3. auth 插件头像上传接入 `ImageService`（裁剪为 256×256 + WebP）

**阶段 B（中优先级）**
- B1. 注册 `MailService`（基于 nodemailer）→ auth 插件 `/api/auth/forgot-password` 发送真实邮件（开发期用 console transport）
- B2. 注册 `QueueService`（基于 bullmq）→ export 插件导出任务异步化
- B3. 在 `notifications` 插件中加入邮件摘要订阅（每日/每周）

**阶段 C（长期 · 高投入）** ✅ 2026-07-26 完成
- ✅ C1. 引入 `kysely` 作为 `DatabaseAdapter` 的新实现 `KyselyAdapter`，与 `LibSQLAdapter` 并存
  - 新增 `packages/database/src/kysely-adapter.ts`
  - 实现 DatabaseAdapter 接口 + query() 类型安全 builder + sql 模板标签
- ✅ C2. 逐插件迁移到 kysely（从 posts 开始）
  - posts 插件 boards/posts/comments/votes/favorites CRUD 改用 query builder
  - 复杂查询用 sql 模板标签，保持 DatabaseAdapter 接口兼容
- ✅ C3. 用 `@fastify/multipart` 替代 base64 上传，前端 `MarkdownEditor` 改用 FormData
  - server 注册 @fastify/multipart（10MB/文件，9 文件上限）
  - ImageService 新增 uploadFromBuffer 方法
  - posts /api/upload + auth /api/users/avatar 支持 multipart + base64 双模式
  - 前端 NewPost/EditPost/MarkdownEditor/Settings/TeamDetail 改用 FormData
- ✅ C-verify. 编译测试 + 提交部署 + 云服务器验证
  - 全量 build:server + build:client 通过
  - 推送 main 触发 GitHub Actions 部署
  - 服务器健康检查通过，13 个插件全部 active
  - 修复 deploy.yml：同步 package.json + npm install --include=optional + 兜底安装 native binding

### 10.4 移动端适配（Phase 11）

**11.1 capacitor 分支**
- 复用 main 分支前端代码
- 验证 `@capacitor/camera` 在帖子图片上传中的可用性
- 验证 `@capacitor/filesystem` 在团队文件下载中的可用性
- 站头布局：移动端单列、罗盘缩小至 96px、标语字号 clamp(18px, 5vw, 28px)

**11.2 harmony 分支**
- 复用 main 分支前端代码
- 验证 ArkUI WebView 加载性能
- 鸿蒙特性适配：手势返回、状态栏颜色随境切换

---

## 十一、本次提交策略

由于"后端重写 + 移动端适配"涉及面广，本次提交仅包含：
1. ✅ Phase 1-3：十三境主题系统 + 13 套版式 + 粒子动画
2. ✅ Phase 4：站头三布局 + 真实地支时钟（每境显示）+ 标语轮播（realm.sl）
3. ✅ Phase 5：Login/Register/Settings 用 react-hook-form + zod + sonner + Radix UI 重写
4. ✅ Phase 6-7：Masthead/TopBar/RealmSwitcher 整合
5. ✅ Phase 10：后端第三方组件集成 → 阶段 A/B/C 全部完成（2026-07-26）
6. ⏸ Phase 11：移动端 capacitor/harmony 适配 → 单独分支按 11.1/11.2 推进

后端与移动端的重写需要独立 session 充分测试，避免破坏云服务器运行中的服务。
