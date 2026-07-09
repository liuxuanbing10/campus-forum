import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/globals.css';

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
