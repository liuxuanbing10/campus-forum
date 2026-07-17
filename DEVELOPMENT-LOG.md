# campus-forum 开发日志

## 2026-07-17 多端适配 + Android 原生 APP

### 完成内容
1. **首页 UI 改造**
   - 标语改为"代码改变世界" / "从此刻起，与优秀的你同行"
   - 底部"切换主题"按钮改为"加入团队"（跳转 /teams）
   - 移除所有注册入口（App.tsx、Login.tsx、Layout.tsx），保留后端接口

2. **创建 OI 讨论区团队**
   - 通过 API 创建，admin 账号登录后调用 POST /api/teams
   - 注意：uid() 使用 JWT 认证，需要 Authorization: Bearer <token> 头

3. **清理测试数据**
   - 数据库本身为空，无需清理

4. **底部导航栏**
   - 5 个 tab：首页、搜索、发帖(居中突出)、消息、我的
   - md:hidden 隐藏桌面端，移动端固定底部

5. **无限滚动 + 下拉刷新**
   - Board.tsx、Home.tsx 实现 IntersectionObserver 无限加载
   - 下拉刷新使用 touch events + 阻尼系数

6. **Capacitor Android/iOS 原生 APP**
   - @capacitor/core + @capacitor/cli + @capacitor/android + @capacitor/ios
   - capacitor.config.ts 配置 server.url 指向本地开发服务器
   - AndroidManifest.xml 添加网络权限和安全配置

### 踩坑记录
| 问题 | 原因 | 解决 |
|------|------|------|
| npm run build 失败 | Monorepo 包依赖顺序错误 | 用 build:server（按顺序）+ build:client |
| tsc not found (服务器) | npm install --omit=dev | 不要用 --omit=dev |
| pm2 not found | 同上 | npm install -g pm2 |
| SSH banner exchange timeout | WSL2 网络栈损坏 | wsl --shutdown + 重启 |
| SSH still broken after restart | socket 层未恢复 | netsh winsock reset + 重启 |
| SCP 连接 reset | 服务器 SSH 稳定性差 | 等待恢复后重试 |
| git push OOM | 内存不足（下载文件占用） | 清理临时文件后重试 |
| Gradle build version 69 | Java 25 class file | 需要 Java 17-24 |
| GitHub Actions APK 构建失败 | build:client 依赖未构建 | 添加 build:server 步骤 |
| gradlew 权限 | git clone 不保留执行权限 | chmod +x |
| SSL 证书下载失败 | 证书吊销检查 | --ssl-no-revoke |

### GitHub Actions 配置
- **deploy.yml**: push to main 自动构建+部署到服务器
- **build-apk.yml**: workflow_dispatch 手动触发构建 APK

### 分支管理
- `main`: 主分支，服务器部署
- `mobile/capacitor`: Android/iOS 原生 APP
- `mobile/harmony`: 鸿蒙 APP

### 环境依赖
- Node.js 22+
- Java 17-24（Java 25 不兼容 Gradle 8.x）
- Android SDK（platform-tools, platforms;android-34, build-tools;34.0.0）
- Gradle 8.14.3（通过 wrapper 或手动安装）

### 服务器部署
- 47.121.137.231:22 (SSH)
- /opt/campus-forum
- PM2 进程管理
- Node.js 22
