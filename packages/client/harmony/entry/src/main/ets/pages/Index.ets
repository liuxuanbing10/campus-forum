@Entry
@Component
struct Index {
  @State currentUrl: string = 'http://47.121.137.231:3001'
  @State pageTitle: string = '校园论坛'
  @State isLoading: boolean = true
  @State canGoBack: boolean = false
  @State activeTab: number = 0
  private webController: WebviewController = new WebviewController()

  // 底部 Tab 配置
  private tabs = [
    { icon: '🏠', label: '首页', path: '/' },
    { icon: '🔍', label: '搜索', path: '/search' },
    { icon: '➕', label: '发帖', path: '/new' },
    { icon: '💬', label: '消息', path: '/messages' },
    { icon: '👤', label: '我的', path: '/login' }
  ]

  build() {
    Column() {
      // 顶部导航栏
      Row() {
        Text('校园论坛')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333')

        Blank()

        if (this.isLoading) {
          LoadingProgress()
            .width(20)
            .height(20)
        }

        Button('刷新')
          .fontSize(14)
          .height(30)
          .onClick(() => {
            this.webController.refresh()
          })
      }
      .width('100%')
      .height(50)
      .padding({ left: 16, right: 16 })
      .backgroundColor('#fff')
      .border({ width: { bottom: 1 }, color: '#eee' })

      // WebView 主内容
      Web({ src: this.currentUrl, controller: this.webController })
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(true)
        .databaseAccess(true)
        .width('100%')
        .layoutWeight(1)
        .onPageBegin(() => {
          this.isLoading = true
        })
        .onPageEnd(() => {
          this.isLoading = false
          this.canGoBack = this.webController.accessBackward()
        })
        .onTitleReceive((event) => {
          this.pageTitle = event.title
        })

      // 底部 Tab Bar
      Row() {
        ForEach(this.tabs, (tab: { icon: string, label: string, path: string }, index: number) => {
          Column() {
            Text(tab.icon)
              .fontSize(20)
            Text(tab.label)
              .fontSize(10)
              .fontColor(this.activeTab === index ? '#007DFF' : '#999')
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
      .backgroundColor('#fff')
      .border({ width: { top: 1 }, color: '#eee' })
      .padding({ bottom: 8 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f5f5')
  }
}
