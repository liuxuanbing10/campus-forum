# campus-forum 开发日志

## 2026-07-17 全量交付日

### 一、完成清单

#### 1. 首页 UI 改造
- 标语改为"代码改变世界" / "从此刻起，与优秀的你同行"
- 底部"切换主题"按钮改为"加入团队"（跳转 /teams）
- 移除所有注册入口（App.tsx、Login.tsx、Layout.tsx），保留后端接口
- 登录方式改为现实申请账号

#### 2. OI 讨论区
- 通过 API 创建，admin 账号登录后调用 POST /api/teams
- 注意：uid() 使用 JWT 认证，需要 Authorization: Bearer 头

#### 3. 多端适配（Web 响应式）
- **底部导航栏**：5 个 tab（首页/搜索/发帖/消息/我的），md:hidden 隐藏桌面端
- **无限滚动**：IntersectionObserver 实现 Board.tsx、Home.tsx 懒加载
- **下拉刷新**：touch events + 阻尼系数

#### 4. Android/iOS 原生 APP（Capacitor）
- `mobile/capacitor` 分支
- @capacitor/core + @capacitor/cli + @capacitor/android + @capacitor/ios
- GitHub Actions 自动构建 APK（Java 21 + Gradle 8.14.3）
- AndroidManifest.xml 网络权限 + network_security_config.xml
- 构建成功，Artifact 可从 Actions 下载

#### 5. 鸿蒙 APP（HarmonyOS WebView）
- `mobile/harmony` 分支
- ArkTS WebView + 底部 Tab Bar
- build-profile.json5 + module.json5 + Index.ets
- 需要 DevEco Studio 编译

#### 6. 服务器部署
- 47.121.137.231 → /opt/campus-forum → PM2
- 首次启动必须 `NODE_ENV=production` 否则静态文件 404
- GitHub Actions Deploy workflow（push to main 触发）
- SSH 保活 crontab（每 5 分钟检查）
- PM2 ecosystem.config.cjs 固化启动参数

#### 7. Bug 修复
- 登录返回 role 字段缺失 → `is_admin ? 'admin' : (role || 'user')`
- CORS 拦截 duckdns.org → 白名单已包含
- gradlew 权限 → chmod +x
- gradle-wrapper.properties 误改成本地路径 → 恢复远程 URL

---

### 二、踩坑大全

| 问题 | 根因 | 解法 |
|------|------|------|
| npm run build 失败 | Monorepo 包依赖顺序 | 用 build:server（按顺序）+ build:client |
| tsc not found (服务器) | npm install --omit=dev | 服务器构建需完整依赖 |
| pm2 not found | npm install -g pm2 | 全局安装 |
| SSH banner exchange timeout | 服务器 sshd 不稳定 | 重启服务器 / crontab 保活 |
| git pull 卡住 | 服务器到 GitHub 的 HTTP/2 报错 | tar + scp 传文件绕过 git |
| git push OOM | 内存不足 | 清理 /tmp 临时文件 |
| Java 25 + Gradle 8.x 不兼容 | class file major version 69 | 用 Java 21（GitHub Actions 默认） |
| GitHub Actions APK 构建失败 | build:client 依赖未构建 | 添加 build:server 步骤 |
| gradlew Permission denied | git clone 不保留执行权限 | chmod +x |
| SSL 证书下载失败 | curl schannel 证书吊销检查 | --ssl-no-revoke |
| Playwright VNC 无法打字 | VNC canvas 不接受 DOM 键盘事件 | 无法解决，需手动操作 |
| NODE_ENV 未设 production | 服务端条件判断静默跳过静态文件 | PM2 env 或 ecosystem.config.cjs |
| admin 按钮不显示 | login SQL 未查 role/is_admin，返回短路 | is_admin 优先判断 |
| CORS 500 | duckdns.org 域名未在白名单 | 已预配置 |
| gradle-wrapper.properties 被改 | 本地调试改了 URL 提交到 git | CI 里 sed 恢复 |

---

### 三、部署流程（最终版）

#### 手动部署（SSH 可用时）
```bash
# 本地
cd D:/Projects/campus-forum && npm run build && \
tar -czf /tmp/campus-forum-full.tar.gz --exclude='node_modules' --exclude='.git' --exclude='packages/client/android' --exclude='packages/client/ios' . && \
scp -i ~/.ssh/id_rsa_cloud /tmp/campus-forum-full.tar.gz root@47.121.137.231:/tmp/

# 服务器
ssh -i ~/.ssh/id_rsa_cloud root@47.121.137.231 \
  "cd /opt/campus-forum && tar -xzf /tmp/campus-forum-full.tar.gz && npm install --omit=dev && kill \$(lsof -t -i:3001); sleep 1 && NODE_ENV=production pm2 restart campus-forum"
```

#### GitHub Actions 自动部署
- push to main → deploy.yml 触发
- 需要在 repo settings 添加 SERVER_HOST 和 SSH_PRIVATE_KEY secrets

#### APK 构建
- Actions → Build APK → workflow_dispatch 手动触发
- Artifact: campus-forum-debug.apk

---

### 四、分支管理

| 分支 | 用途 | 状态 |
|------|------|------|
| `main` | 服务端 + Web 前端 | ✅ 已部署 |
| `mobile/capacitor` | Android/iOS 原生 APP | ✅ APK 构建通过 |
| `mobile/harmony` | 鸿蒙 WebView 客户端 | ✅ 基础框架完成 |

---

### 五、环境依赖

- Node.js 22+
- Java 17-24（Java 25 不兼容 Gradle 8.x）
- Android SDK（platform-tools, platforms;android-34, build-tools;34.0.0）
- Gradle 8.14.3（通过 wrapper 或手动安装）
- HarmonyOS DevEco Studio（鸿蒙编译）

---

### 六、服务器信息

- IP: 47.121.137.231
- SSH: root@47.121.137.231（密钥 ~/.ssh/id_rsa_cloud）
- 系统: Ubuntu 26.04 (2 vCPU, 2 GiB RAM)
- 运行时: Node.js 22 + PM2
- 数据库: SQLite (/opt/campus-forum/data/campus-forum.db)
- 服务路径: /opt/campus-forum
- 保活: crontab */5 检查 sshd

---

### 七、Skill 资产

| Skill | 用途 |
|-------|------|
| `campus-forum-deploy` | 部署流程 + 踩坑 |
| `multi-platform-react` | 多端适配最佳实践 |
| `fix-ssh-connection-failure` | SSH 连接故障排查 |
