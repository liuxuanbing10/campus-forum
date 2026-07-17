import { useState, useEffect } from 'react';
import { Smartphone, Watch, Globe, Download as DownloadIcon, ExternalLink, CheckCircle, Clock, Apple } from 'lucide-react';

export default function Download() {
  const platforms = [
    {
      name: 'Android',
      icon: <Smartphone className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      available: true,
      downloadUrl: '/downloads/campus-forum.apk',
      fileName: 'campus-forum.apk',
      version: '1.0.0',
      instructions: '下载 APK → 允许安装未知来源 → 安装',
    },
    {
      name: 'iOS (iPhone/iPad)',
      icon: <Apple className="w-8 h-8" />,
      color: 'from-gray-700 to-gray-900',
      available: true,
      downloadUrl: '/',
      version: '1.0.0',
      instructions: 'Safari 打开网页版 → 分享按钮 → 添加到主屏幕，体验与原生 APP 一致',
      badge: '推荐网页版',
    },
    {
      name: 'HarmonyOS (鸿蒙)',
      icon: <Watch className="w-8 h-8" />,
      color: 'from-red-500 to-red-600',
      available: false,
      status: '需要 DevEco Studio 构建',
      instructions: '需要华为开发者账号 + DevEco Studio',
    },
    {
      name: 'Web 网页版',
      icon: <Globe className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      available: true,
      downloadUrl: '/',
      version: '最新',
      instructions: '浏览器直接访问，无需安装',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            <DownloadIcon className="w-4 h-4" />
            下载校园论坛
          </div>
          <h1 className="text-3xl font-bold text-text mb-3 font-display">选择你的平台</h1>
          <p className="text-text-secondary text-lg">多端支持，随时随地参与讨论</p>
        </div>

        <div className="grid gap-4">
          {platforms.map(p => (
            <div key={p.name} className="bg-surface border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white shrink-0`}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-text">{p.name}</h3>
                    {p.available ? (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded-full font-medium">可用</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-500/10 text-gray-500 text-xs rounded-full font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 待构建
                      </span>
                    )}
                  </div>

                  <p className="text-text-secondary text-sm mb-2">{p.instructions}</p>

                  {p.available && p.version && (
                    <div className="text-xs text-text-secondary mb-3">版本 {p.version}</div>
                  )}

                  {p.available && p.downloadUrl && (
                    <a
                      href={p.downloadUrl}
                      download={p.fileName}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${p.color} text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-sm`}
                    >
                      <DownloadIcon className="w-4 h-4" />
                      {p.name === 'Web 网页版' ? '立即访问' : '下载'}
                    </a>
                  )}

                  {!p.available && (
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-xl text-sm cursor-not-allowed">
                      <Clock className="w-4 h-4" />
                      等待构建
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-text-secondary text-sm">
          <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
          所有平台数据互通，一个账号全端登录
        </div>
      </div>
    </div>
  );
}
