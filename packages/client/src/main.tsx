import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './styles/globals.css';

// GitHub Pages 部署在子路径 /campus-forum/ 下，通过 VITE_BASE_PATH 控制 basename
const basePath = import.meta.env.BASE_URL;
const basename = basePath !== '/' ? basePath.replace(/\/$/, '') : '/';

// PWA 注册（容错处理，防止开发环境报错导致页面空白）
if (typeof window !== 'undefined') {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          if (confirm('有新版本可用，是否刷新？')) {
            updateSW(true);
          }
        },
        onOfflineReady() {
          console.log('PWA 已可离线使用');
        },
      });
    })
    .catch(() => {
      console.log('PWA 插件未启用，跳过注册');
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
