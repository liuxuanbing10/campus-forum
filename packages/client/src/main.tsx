import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/globals.css';

// 注册 Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    // 有新版本可用时提示用户
    if (confirm('有新版本可用，是否刷新？')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('PWA 已可离线使用');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
