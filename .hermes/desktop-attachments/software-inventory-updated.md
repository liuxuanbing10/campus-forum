# 全面软件/工具链/库清单 - 2026-06-26

## 1. 编程语言运行时/编译器

| 工具                           | 版本                   | 用途                             | 位置                                            |
| ---------------------------- | -------------------- | ------------------------------ | --------------------------------------------- |
| .NET SDK                     | 10.0.301             | .NET 应用开发/构建                   | PATH                                          |
| .NET Runtime                 | 10.0.9               | .NET 运行时(最新)                   | -                                             |
| .NET Runtime 8.0             | 8.0.28               | .NET 运行时(LTS)                  | -                                             |
| .NET Runtime 6.0             | 6.0.36               | .NET 运行时(LTS)                  | -                                             |
| .NET Framework 4.8.1         | SDK + Targeting Pack | 传统 .NET 框架                     | -                                             |
| Node.js                      | 26.4.0 (Current)     | JavaScript/TypeScript 运行时、前端构建 | D:\nodejs                                     |
| Python 3.14                  | 3.14.6               | Python 主力版本、脚本开发               | AppData\Local\Programs\Python\Python314       |
| Python 3.13 (uv管理)           | 3.13.14              | Python 兼容版本(通过 uv 安装)          | AppData\Roaming\uv\python\cpython-3.13.14     |
| Go                           | 1.26.4               | Go 语言开发                        | D:\tools\go                                   |
| Rust                         | 1.96.0               | Rust 语言开发                      | D:\tools\rust                                 |
| Cargo                        | 1.96.0               | Rust 包管理器                      | D:\tools\rust.cargo\bin                       |
| GCC/g++                      | 16.1.0 (MinGW-w64)   | C/C++ 编译(算法竞赛等)                | D:\programming\_software\RedPanda-Cpp\mingw64 |
| Clang/LLVM                   | 22.1.8               | C/C++ 替代编译器、代码分析               | D:\tools\LLVM                                 |
| Java (OpenJDK)               | 25.0.3 LTS           | Java 开发(最新LTS)                 | D:\tools\java                                 |
| Eclipse Temurin JDK          | 21.0.11+10 (x64)     | Java 开发(稳定LTS)                 | 注册表安装                                         |
| MSVC (cl)                    | 14.52.36510          | C/C++ Windows 编译器(VS 2026)     | D:\tools\Visual Studio                        |
| Visual Studio Community 2026 | 18.7.1               | Windows/跨平台 IDE、.NET/C++ 开发    | D:\tools\Visual Studio                        |
| PowerShell                   | 7.6.3                | 系统管理/自动化脚本                     | PATH                                          |

## 2. 构建/包管理工具

| 工具         | 版本             | 用途                             | 位置                         |
| ---------- | -------------- | ------------------------------ | -------------------------- |
| npm        | 11.17.0        | Node.js 包管理器(主力)               | D:\nodejs                  |
| pnpm       | 11.9.0         | Node.js 包管理器(高效磁盘管理)           | PATH                       |
| bun        | 1.3.14         | JavaScript/TypeScript 快速运行时    | PATH                       |
| pip        | 26.1.2         | Python 包管理器                    | PATH                       |
| uv         | 0.11.25        | Python 包管理器(极速) + Python 版本管理  | AppData\Local\Programs\uv  |
| CMake      | 4.4.0-rc2 (RC) | C/C++ 跨平台构建系统                  | D:\tools\cmake-4.4.0-rc2   |
| Maven      | 3.9.16         | Java 项目构建/依赖管理                 | D:\tools\maven             |
| MSBuild    | 18.8.2         | .NET 项目构建工具                    | D:\tools\Visual Studio     |
| Git        | 2.54.0         | 版本控制                           | Program Files\Git          |
| GitHub CLI | 2.95.0         | GitHub 命令行操作(issue/PR/Actions) | Program Files\GitHub CLI   |
| Chocolatey | 已安装            | Windows 包管理器                   | ProgramData\chocolatey\bin |
| scoop      | 已安装            | Windows 包管理器(用户级)              | C:\Users\xiexi\scoop       |
| Starship   | 1.25.1         | 现代终端提示符美化                      | Program Files\starship     |
| Ninja      | 1.13.2         | 快速增量构建工具(CMake/GN配套)           | PATH                       |
| SQLite3    | 3.51.3         | SQLite 命令行客户端(数据库查看/编辑)        | PATH                       |

### scoop 已安装应用

| 应用     | 版本     | 用途                          |
| ------ | ------ | --------------------------- |
| miller | 6.18.1 | 命令行数据处理工具(类awk，支持CSV/JSON等) |

## 3. npm 全局包 (13个)

| 包名                                               | 版本         | 用途                               |
| ------------------------------------------------ | ---------- | -------------------------------- |
| @modelcontextprotocol/server-filesystem          | 2026.1.14  | MCP 文件系统服务(AI代理读写文件)             |
| @modelcontextprotocol/server-github              | 2025.4.8   | MCP GitHub 服务(AI代理操作GitHub)      |
| @modelcontextprotocol/server-sequential-thinking | 2025.12.18 | MCP 顺序思考(AI代理推理增强)               |
| @nestjs/cli                                      | 11.0.23    | NestJS 后端框架脚手架CLI                |
| @playwright/mcp                                  | 0.0.76     | Playwright 浏览器自动化 MCP(AI代理控制浏览器) |
| @tarquinen/opencode-dcp                          | 3.1.14     | DCP 协议支持                         |
| bun                                              | 1.3.14     | JavaScript/TypeScript 快速运行时      |
| everything-mcp                                   | 1.0.6      | Everything 文件搜索 MCP(AI代理搜索本地文件)  |
| npm                                              | 11.17.0    | 包管理器(全局安装)                       |
| obsidian-mcp-server                              | 3.2.8      | Obsidian 笔记 MCP(AI代理操作Obsidian)  |
| oh-my-openagent                                  | 4.13.0     | OpenAgent 多代理框架                  |
| opencode-ai                                      | 1.17.11    | OpenCode CLI(终端AI编程助手)           |
| pnpm                                             | 11.9.0     | 包管理器(全局安装)                       |

## 4. Python 包 (主要)

### Web 框架

| 包名      | 版本      | 用途                   |
| ------- | ------- | -------------------- |
| Django  | 6.0.6   | 全功能 Python Web 框架    |
| FastAPI | 0.138.1 | 高性能异步 API 框架         |
| Flask   | 3.1.3   | 轻量 Web 框架            |
| uvicorn | 0.49.0  | ASGI 服务器(FastAPI 配套) |

### 数据科学/机器学习

| 包名                    | 版本        | 用途          |
| --------------------- | --------- | ----------- |
| numpy                 | 2.5.0     | 数值计算基础库     |
| opencv-python         | 4.13.0.92 | 计算机视觉/图像处理  |
| opencv-contrib-python | 4.13.0.92 | OpenCV 扩展模块 |
| Pillow                | 12.2.0    | 图像处理        |
| plotly                | 6.8.0     | 交互式数据可视化    |
| onnxruntime           | 1.27.0    | ONNX 模型推理引擎 |

### 开发工具

| 包名           | 版本     | 用途                   |
| ------------ | ------ | -------------------- |
| pydantic     | 2.13.4 | 数据验证/序列化(FastAPI 配套) |
| requests     | 2.34.2 | HTTP 请求库             |
| rich         | 15.0.0 | 终端富文本输出/格式化          |
| cryptography | 49.0.0 | 加密算法库                |
| PyInstaller  | 6.21.0 | Python 程序打包为 exe     |
| Nuitka       | 4.1.3  | Python 编译为原生二进制      |
| scapy        | 2.7.0  | 网络数据包嗅探/构造           |

### GUI

| 包名    | 版本     | 用途                   |
| ----- | ------ | -------------------- |
| PyQt6 | 6.11.0 | Qt6 Python 桌面 GUI 开发 |

### TTS

| 包名        | 版本    | 用途            |
| --------- | ----- | ------------- |
| piper-tts | 1.4.2 | 离线神经 TTS 语音合成 |

### Qt 安装工具

| 包名         | 版本           | 用途           |
| ---------- | ------------ | ------------ |
| aqtinstall | 3.3.1.dev113 | Qt 在线安装/管理工具 |

## 5. .NET 工具 & 工作负载

### 全局工具

| 工具                     | 版本              | 用途                |
| ---------------------- | --------------- | ----------------- |
| roslyn-language-server | 5.9.0-1.26303.1 | C# 语言服务器(编辑器智能提示) |

### 已安装 SDK 组件

- .NET SDK 10.0.301 + 8.0.422
- .NET Runtime 10.0.9, 8.0.28, 6.0.36
- ASP.NET Core 10.0.9, 8.0.28, 6.0.36
- Windows Desktop Runtime 10.0.9, 8.0.28, 6.0.36
- .NET Framework 4.8.1 SDK + Targeting Pack

### .NET Workloads (MAUI/Android/iOS 等)

- **工作负载 ID 列表为空**（manifests 已安装，但无具体工作负载，如需开发需重新安装）
- Microsoft.NET.Sdk.Android.Manifest-10.0.100 (v36.1.2)
- Microsoft.NET.Sdk.iOS.Manifest-10.0.100 (v26.0.11017)
- Microsoft.NET.Sdk.MacCatalyst.Manifest-10.0.100 (v26.0.11017)
- Microsoft.NET.Sdk.MacOS.Manifest-10.0.100 (v26.0.11017)
- Microsoft.NET.Sdk.Maui.Manifest-10.0.100 (v10.0.0)
- Microsoft.NET.Sdk.tvOS.Manifest-10.0.100 (v26.0.11017)
- Microsoft.NET.Sdk.Aspire.Manifest-8.0.100 (v64.0.5426)

## 6. 系统工具/应用

### 开发相关

| 工具           | 版本           | 用途                |
| ------------ | ------------ | ----------------- |
| GitHub CLI   | 2.95.0       | GitHub 命令行操作      |
| dnSpy        | -            | .NET 程序集反编译/调试/修改 |
| ILSpy        | 10.0.0.8282  | .NET 程序集反编译/查看    |
| RedPanda-Cpp | 3.4 (小熊猫C++) | C/C++ 轻量IDE(算法竞赛) |
| Obsidian     | 1.12.7       | Markdown 笔记/知识管理  |

### AI/助手

| 工具             | 用途                |
| -------------- | ----------------- |
| 豆包 (Doubao)    | 字节跳动 AI 助手        |
| Trae CN        | 字节跳动 AI 编程IDE(主力) |
| Oh My OpenCode | 终端 AI 编程助手        |

### 媒体

| 工具          | 版本         | 用途                     |
| ----------- | ---------- | ---------------------- |
| FFmpeg      | 8.1.1      | 视频/音频转码、处理(通过WinGet安装) |
| ImageMagick | 7.1.2-26   | 图片格式转换/批量处理/编辑         |
| PotPlayer   | 26.06.23.0 | 视频播放器                  |
| 剪映Pro       | 10.8.0     | 视频剪辑                   |
| bilibili    | -          | B站(网页版/Tauri桌面应用)      |
| OpenMontage | -          | 视频片段编排项目               |

### 文件/系统工具

| 工具          | 版本             | 用途                         |
| ----------- | -------------- | -------------------------- |
| 7-Zip       | 26.01          | 文件压缩/解压(开源)                |
| Bandizip    | 7.44           | 文件压缩/解压(商业，支持更多格式)         |
| FastCopy    | 5.11.3         | 高速文件复制/同步                  |
| Everything  | - (WPS/Tuba内置) | 全盘文件即时搜索                   |
| Pandoc      | 3.10           | 文档格式转换(Markdown/PDF/Word等) |
| Starship    | 1.25.1         | 终端提示符美化                    |
| Rufus       | -              | USB 启动盘制作                  |
| MotrixNext  | -              | 多线程下载器                     |
| Ditto       | 3.25.113.0     | 剪贴板管理/历史记录                 |
| Syncthing   | v2.1.2-rc.3    | P2P 文件同步(跨设备)              |
| SyncTrayzor | 2.1.0.0        | Syncthing 图形界面/托盘管理        |
| WinAuth     | 3.1.2025.0     | 两步验证/OTP 生成器(GitHub/Xbox等) |
| AltSendme   | 0.3.5          | 快捷转发工具                     |

### 聊天/社交

| 工具                 | 版本             | 用途       |
| ------------------ | -------------- | -------- |
| WeChat             | - (UWP/MSIX安装) | 微信       |
| QQ                 | 9.9.31.49738   | QQ(NT架构) |
| 企业微信 (WXWorkLocal) | -              | 企业微信     |

### 办公

| 工具            | 版本           | 用途                          |
| ------------- | ------------ | --------------------------- |
| Microsoft 365 | 企业应用版        | Office 全家套(Word/Excel/PPT等) |
| WPS Office    | 12.1.0.26895 | 国产办公套件                      |
| 金山文档          | -            | 在线协作文档                      |
| 腾讯文档          | -            | 在线协作文档                      |

### 虚拟化

| 工具           | 版本      | 用途                    |
| ------------ | ------- | --------------------- |
| WSL          | 2.7.8.0 | Windows 子系统 Linux     |
| Ubuntu (WSL) | -       | Linux 发行版(当前 Stopped) |

WSL 详情:

- 内核: 6.18.33.1-1
- WSLg: 1.0.73.2 (Linux GUI 应用支持)

### 浏览器

| 工具             | 版本             | 用途                |
| -------------- | -------------- | ----------------- |
| Google Chrome  | 149.0.7827.197 | 主力浏览器             |
| Microsoft Edge | 149.0.4022.80  | 系统浏览器/WebView2 宿主 |
| Edge WebView2  | 149.0.4022.80  | 应用内嵌浏览器框架         |
| 360浏览器         | -              | 国产浏览器(备用)         |

### 输入法

| 工具    | 用途                    |
| ----- | --------------------- |
| 搜狗输入法 | 中文输入法(仅残留目录，主程序可能已卸载) |

### 硬件驱动

| 驱动                                   | 用途              |
| ------------------------------------ | --------------- |
| HP LaserJet M1210 MFP                | 打印机驱动           |
| Brother iPrint\&Scan + 打印机驱动         | 打印机/扫描仪驱动       |
| Realtek Audio Driver 6.0.9661.1      | 声卡驱动            |
| AMD Crash Defender + External Events | 显卡驱动组件          |
| Dolby DAX API Service                | 音效增强            |
| Lenovo Fn/ITS 服务                     | Lenovo 笔记本快捷键服务 |

### 其他

| 工具         | 版本                     | 用途             |
| ---------- | ---------------------- | -------------- |
| Bitwarden  | 2026.5.0               | 密码管理器(开源)      |
| EdrawMind  | 13.5.0                 | 思维导图           |
| OPPO手机助手   | 16.2.10.0              | OPPO 手机文件管理    |
| 百度网盘       | -                      | 云存储            |
| 百度同步盘      | 7.17.5.6 (DesktopSync) | 文件自动同步         |
| 123云盘      | 3.1.7.0                | 云存储            |
| 夸克网盘       | -                      | 云存储            |
| TubaWinUi3 | -                      | WinUI3 开发/工具合集 |

## 7. SDK/库

### Android SDK

- 未在默认路径找到 (AppData\Local\Android\Sdk)
- .NET Android Manifest 已安装 (v36.1.2 / v34.0.43)

### Windows SDK

- Windows SDK 10.0.28000.1721
- Windows SDK 10.0.26100.8249

### NuGet 缓存

- 2个包，共 63.8 MB

### C/C++ 库

| 库      | 版本     | 用途                 | 位置                                    |
| ------ | ------ | ------------------ | ------------------------------------- |
| Boost  | 1.91.0 | C++ 通用库(STL扩展、算法等) | D:\tools\boost\_1\_91\_0              |
| OpenCV | -      | 计算机视觉/图像处理         | D:\tools\opencv                       |
| Raylib | 6.0    | C 轻量游戏/图形库         | D:\tools\raylib-6.0\_win64\_mingw-w64 |

### Godot

| 工具         | 版本              | 用途            |
| ---------- | --------------- | ------------- |
| Godot      | 4.7 stable mono | 游戏引擎(.NET 支持) |
| Godot 导出模板 | -               | 跨平台导出         |

### Visual C++ Redistributable

- VC++ 2005-2022 多个版本(运行时依赖)

## 8. 环境变量

### 用户环境变量 (关键)

| 变量             | 值                                                  | 用途           |
| -------------- | -------------------------------------------------- | ------------ |
| JAVA\_HOME     | D:\tools\java                                      | Java 安装路径    |
| RUSTUP\_HOME   | D:\tools\rust                                      | Rust 工具链安装路径 |
| CARGO\_HOME    | D:\tools\rust                                      | Rust 包管理器路径  |
| UV\_PYTHON     | AppData\Local\Programs\Python\Python314\python.exe | uv 默认 Python |
| UV\_INDEX\_URL | <https://pypi.tuna.tsinghua.edu.cn/simple>         | uv pip 清华镜像源 |
| QTDIR          | D:\tools\6.12.0\msvc2022\_64                       | Qt 安装路径      |
| SCOOP          | C:\Users\xiexi\scoop                               | scoop 安装路径   |

## 9. 注意事项

1. **Trae 终端 PATH 优先级**：Trae 内置的 ffmpeg/magick/pandoc 版本较旧且排在 PATH 前面，需要用完整路径调用系统安装版
2. **CMake 4.4.0-rc2** 是预发布版本，稳定版为 4.3.4
3. **PATH 重复条目** 仍需清理
4. **Python 3.13** 通过 uv 安装，路径为 `AppData\Roaming\uv\python\cpython-3.13.14`
5. **.NET 工作负载** 列表为空，如需 MAUI/Android 开发需运行 `dotnet workload install`
6. **NuGet缓存** 只有2个包
7. **Android SDK** 不在默认路径
8. **vcvarsall.bat 缺失** — VS 2026 C++ 工作负载不完整，需通过 VS Installer 修复安装
9. **搜狗输入法** 主程序在用，目录位于 `Program Files (x86)\SogouInput`
10. **OpenCode 技能** 共 128 个，详见下方分类清单

## 10. OpenCode AI 技能 (128个)

### Go 语言技能 (16个) — SkillHub 管理

| 技能                            | 版本    | 用途                               |
| ----------------------------- | ----- | -------------------------------- |
| golang                        | 2.0.1 | 核心：构建/测试/lint/格式化                |
| golang-concurrency            | 1.1.4 | 并发模式（goroutine/channel/errgroup） |
| golang-testing                | 1.2.2 | 表驱动测试/testify/fuzzing/goleak     |
| golang-performance            | 1.2.2 | 性能优化（分配/CPU/GC）                  |
| golang-error-handling         | 1.2.0 | 错误处理惯用法                          |
| golang-security               | 1.1.7 | 安全最佳实践                           |
| golang-design-patterns        | -     | 惯用设计模式                           |
| golang-database               | 1.2.1 | 数据库访问指南                          |
| golang-cli                    | 1.2.0 | CLI 应用开发                         |
| golang-grpc                   | 1.1.4 | gRPC + protobuf                  |
| golang-observability          | -     | slog/Prometheus/OTel             |
| golang-benchmark              | 1.2.4 | 基准测试 + pprof                     |
| golang-modernize              | 1.2.2 | 现代化写法                            |
| golang-dependency-injection   | 1.2.1 | DI 模式                            |
| golang-continuous-integration | 1.3.1 | CI/CD 流水线                        |
| golang-troubleshooting        | 1.2.2 | 系统化排错                            |

### Rust 语言技能 (7个) — SkillHub 管理

| 技能                  | 版本    | 用途                          |
| ------------------- | ----- | --------------------------- |
| rust                | -     | 惯用 Rust 写法                  |
| rust-patterns       | 1.0.0 | 生产级模式（Tokio/Axum/SQLx/WASM） |
| rust-best-practices | 1.0.3 | 开发最佳实践                      |
| rust-project-setup  | 1.0.4 | 项目搭建                        |
| rust-code-review    | 1.0.5 | 代码审查                        |
| rust-unsafe-auditor | 1.0.0 | unsafe 审计                   |
| ah-rust-pro         | 1.0.0 | 系统编程/内存安全专家                 |

### .NET 技能 (42个)

| 类别   | 技能                                                                                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 性能   | analyzing-dotnet-performance, microbenchmarking, optimizing-ef-core-queries, exp-simd-vectorization                                                                                                                                                                     |
| 构建   | binlog-failure-analysis, binlog-generation, build-perf-diagnostics, check-bin-obj-clash, incremental-build, msbuild-antipatterns, msbuild-modernization                                                                                                                 |
| 测试   | code-testing-agent, code-testing-extensions, dotnet-test-frameworks, run-tests, test-anti-patterns, writing-mstest-tests, coverage-analysis, filter-syntax, mtp-hot-reload                                                                                              |
| MAUI | dotnet-maui-doctor, maui-app-lifecycle, maui-collectionview, maui-data-binding, maui-dependency-injection, maui-safe-area, maui-shell-navigation, maui-theming                                                                                                          |
| 代码质量 | configuring-opentelemetry-dotnet, convert-to-cpm, detect-static-dependencies, dotnet-aot-compat, dotnet-pinvoke, dotnet-trace-collect, dotnet-webapi, minimal-api-file-upload, platform-detection, system-text-json-net11, template-instantiation, technology-selection |

### Python 技能 (7个)

| 技能                        | 用途                      |
| ------------------------- | ----------------------- |
| python-asyncio            | 异步编程模式                  |
| python-fastapi            | FastAPI 生产级应用           |
| python-fundamentals-313   | Python 3.13+ 现代语法       |
| python-package-management | uv/pip/pyproject.toml   |
| python-testing-deep       | pytest 高级测试             |
| python-tooling            | 性能分析/CI/CD              |
| python-type-hints         | 类型系统/Protocol/TypedDict |

### 游戏开发 (3个)

| 技能              | 用途                 |
| --------------- | ------------------ |
| game-studio     | 游戏开发工作室（49代理+73技能） |
| godot-dev-guide | Godot 4.x 完整开发指南   |
| godot-mcp       | Godot MCP AI 集成    |

### 中文协作 (4个)

| 技能                         | 用途           |
| -------------------------- | ------------ |
| chinese-code-review        | 中文代码审查规范     |
| chinese-commit-conventions | 中文 Git 提交规范  |
| chinese-documentation      | 中文技术文档写作     |
| chinese-git-workflow       | 国内 Git 平台工作流 |

### UI/设计 (5个)

| 技能            | 用途                         |
| ------------- | -------------------------- |
| brand         | 品牌指南（Apple/Stripe/Notion等） |
| design        | 设计路由（→brand/ui-styling）    |
| design-system | Token 架构/设计系统              |
| ui-styling    | CSS/Tailwind 样式            |
| ui-ux-pro-max | UI/UX 设计智能库                |

### 代码审查/质量 (8个)

| 技能                             | 用途       |
| ------------------------------ | -------- |
| code-review                    | 通用代码审查模式 |
| receiving-code-review          | 处理审查反馈   |
| requesting-code-review         | 请求审查     |
| security-best-practices        | 安全最佳实践   |
| systematic-debugging           | 系统化调试    |
| test-driven-development        | TDD 流程   |
| verification-before-completion | 完成前验证    |

### 工作流 (5个)

| 技能                   | 用途           |
| -------------------- | ------------ |
| workflow-project-dev | 软件开发全流程路由    |
| workflow-misc        | 非开发场景路由      |
| workflow-maint       | PC 维护/系统优化路由 |
| workflow-runner      | YAML 工作流执行   |
| executing-plans      | 实现计划执行       |

### 开发通用 (10个)

| 技能                             | 用途            |
| ------------------------------ | ------------- |
| brainstorming                  | 创造性工作前的头脑风暴   |
| dispatching-parallel-agents    | 并行任务调度        |
| git-commit                     | 约定式提交         |
| gh-cli                         | GitHub CLI 参考 |
| github                         | GitHub 操作     |
| mcp-builder                    | MCP 服务器构建     |
| proactive-agent-3.1.0          | 主动式 AI 代理     |
| self-improving-agent-3.0.21    | 自我改进代理        |
| subagent-driven-development    | 子代理驱动开发       |
| writing-plans / writing-skills | 计划/技能编写       |

### 生产力/杂项 (16个)

| 技能                                                           | 用途              |
| ------------------------------------------------------------ | --------------- |
| agent-browser                                                | 浏览器自动化          |
| auto-skill-injection                                         | 自动技能注入          |
| chart-visualization                                          | 图表可视化           |
| data-analysis                                                | Excel/CSV 数据分析  |
| devil-advocate                                               | 正反辩论/逻辑审查       |
| find-skill-1.0.0                                             | 技能发现与安装         |
| finishing-a-development-branch                               | 开发分支收尾          |
| mermaid-diagram                                              | Mermaid 图表生成    |
| mysql                                                        | MySQL 查询避坑      |
| obsidian / obsidian-bases / obsidian-cli / obsidian-markdown | Obsidian 笔记生态   |
| screenshot                                                   | 桌面截图            |
| using-git-worktrees                                          | Git 工作树         |
| using-superpowers                                            | 技能使用指南          |
| video-frames                                                 | 视频帧提取           |
| windows-ui-automation-1.0.0                                  | Windows GUI 自动化 |
| word-docx-1.0.2                                              | Word 文档处理       |
| wps                                                          | WPS Office 工作流  |

