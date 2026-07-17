import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campus.forum',
  appName: '校园论坛',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // 开发时指向本地服务器
    url: 'http://192.168.1.100:5173',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
    App: {
      // 应用深度链接
    },
  },
};

export default config;
