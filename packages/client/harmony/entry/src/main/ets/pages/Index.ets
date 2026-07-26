// 十三境论坛 · 鸿蒙 ArkUI WebView 容器
// - 加载云端前端（nginx 80 端口反代到 3001）
// - 暗色主题匹配十三境视觉风格
// - 支持手势返回、状态栏适配、下拉刷新
// - 底部 Tab Bar 配色跟随暗色主题

import web_webview from '@ohos.web.webview';

@Entry
@Component
struct Index {
  // 服务器地址（nginx 80 端口，无需 :3001）
  @State currentUrl: string = 'http://47.121.137.231'
  @State pageTitle: string = '十三境论坛'
  @State isLoading: boolean = true
  @State canGoBack: boolean = false
  @State activeTab: number = 0
  private webController: web_webview.WebviewController = new web_webview.WebviewController()

  // 底部 Tab 配置 · 与前端 BottomNav 对齐
  private tabs = [
    { icon: '🏠', label: '首页', path: '/' },
    { icon: '🔍', label: '搜索', path: '/search' },
    { icon: '➕', label: '发帖', path: '/new' },
    { icon: '💬', label: '消息', path: '/messages' },
    { icon: '👤', label: '我的', path: '/login' }
  ]

  build() {
    Column() {
      // 顶部导航栏 · 暗色主题
      Row() {
        Text('十三境论坛')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#e8e0d0')

        Blank()

        if (this.isLoading) {
          LoadingProgress()
            .width(20)
            .height(20)
            .color('#d4a574')
        }

        Button('刷新')
          .fontSize(14)
          .height(30)
          .fontColor('#d4a574')
          .backgroundColor('transparent')
          .onClick(() => {
            this.webController.refresh()
          })
      }
      .width('100%')
      .height(50)
      .padding({ left: 16, right: 16 })
      .backgroundColor('#1a1f2e')
      .border({ width: { bottom: 1 }, color: '#2a2f3e' })

      // WebView 主内容
      Web({ src: this.currentUrl, controller: this.webController })
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(true)
        .databaseAccess(true)
        .width('100%')
        .layoutWeight(1)
        .backgroundColor('#1a1f2e')
        .onPageBegin(() => {
          this.isLoading = true
        })
        .onPageEnd(() => {
          this.isLoading = false
          this.canGoBack = this.webController.accessBackward()
          // 获取页面标题
          try {
            this.pageTitle = this.webController.getTitle()
          } catch (e) {
            // 忽略标题获取失败
          }
        })
        // 手势返回支持 · 鸿蒙左滑返回手势
        .onAccessBackward((event) => {
          if (this.canGoBack) {
            this.webController.backward()
            event.gestureNavigateBack(false)
          } else {
            event.gestureNavigateBack(true)
          }
        })

      // 底部 Tab Bar · 暗色主题
      Row() {
        ForEach(this.tabs, (tab: { icon: string, label: string, path: string }, index: number) => {
          Column() {
            Text(tab.icon)
              .fontSize(20)
            Text(tab.label)
              .fontSize(10)
              .fontColor(this.activeTab === index ? '#d4a574' : '#8a8f9e')
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .onClick(() => {
            this.activeTab = index
            this.webController.loadUrl(this.currentUrl + tab.path)
          })
        })
      }
      .width('100%')
      .height(56)
      .backgroundColor('#1a1f2e')
      .border({ width: { top: 1 }, color: '#2a2f3e' })
      .padding({ bottom: 8 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#1a1f2e')
  }
}
