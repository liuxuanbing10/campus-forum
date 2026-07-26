import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campus.forum',
  appName: '十三境论坛',
  webDir: 'dist',
  server: {
    // 服务器已通过 nginx 反代到 80 端口，无需指定端口
    androidScheme: 'http',
    hostname: '47.121.137.231',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#1a1f2e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      // 状态栏随主题切换（默认深色背景）
      style: 'DARK',
      backgroundColor: '#1a1f2e',
      overlaysWebView: false,
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    allowMixedContent: true,
  },
};

export default config;
