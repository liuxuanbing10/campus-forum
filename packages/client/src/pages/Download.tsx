import { useState, useEffect } from 'react';
import { Smartphone, Monitor, Watch, Globe, Download, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import api from '../lib/api';

interface DownloadInfo {
  android: { downloadUrl: string; version: string; size: string };
  ios: { status: string; note: string };
  harmony: { status: string; note: string };
  web: { url: string; note: string };
}

export default function Download() {
  const [info, setInfo] = useState<DownloadInfo | null>(null);

  useEffect(() => {
    api.get('/api/download/info').then(r => setInfo(r.data));
  }, []);

  const platforms = [
    {
      name: 'Android',
      icon: <Smartphone className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      available: true,
      downloadUrl: info?.android?.downloadUrl,
      version: info?.android?.version,
      size: info?.android?.size,
      instructions: '下载 APK 文件，允许安装未知来源应用后安装',
    },
    {
      name: 'iOS',
      icon: <Smartphone className="w-8 h-8" />,
      color: 'from-gray-400 to-gray-500',
      available: false,
      status: info?.ios?.status,
      note: info?.ios?.note,
      instructions: '需要 Mac 电脑 + Xcode + Apple 开发者账号',
    },
    {
      name: 'HarmonyOS',
      icon: <Watch className="w-8 h-8" />,
      color: 'from-red-500 to-red-600',
      available: false,
      status: info?.harmony?.status,
      note: info?.harmony?.note,
      instructions: '需要华为 DevEco Studio + 华为开发者账号',
    },
    {
      name: 'Web 网页版',
      icon: <Globe className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      available: true,
      downloadUrl: info?.web?.url || '/',
      version: '最新',
      size: '-',
      instructions: '浏览器直接访问，无需安装',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            <Download className="w-4 h-4" />
            下载校园论坛
          </div>
          <h1 className="text-3xl font-bold text-text mb-3 font-display">选择你的平台</h1>
          <p className="text-text-secondary text-lg">多端支持，随时随地参与讨论</p>
        </div>

        {/* Platform Cards */}
        <div className="grid gap-4">
          {platforms.map(p => (
            <div key={p.name} className="bg-surface border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white shrink-0`}>
                  {p.icon}
                </div>

                {/* Info */}
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

                  {p.available ? (
                    <>
                      <p className="text-text-secondary text-sm mb-2">{p.instructions}</p>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mb-3">
                        <span>版本 {p.version}</span>
                        {p.size !== '-' && <span>· {p.size}</span>}
                      </div>
                      <a
                        href={p.downloadUrl}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${p.color} text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-sm`}
                      >
                        <Download className="w-4 h-4" />
                        {p.name === 'Web 网页版' ? '立即访问' : '下载安装包'}
                        {p.name !== 'Web 网页版' && <ExternalLink className="w-3 h-3" />}
                      </a>
                    </>
                  ) : (
                    <>
                      <p className="text-text-secondary text-sm mb-1">{p.status}</p>
                      <p className="text-text-secondary text-xs">{p.note}</p>
                      <p className="text-text-secondary text-xs mt-2">{p.instructions}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="mt-8 text-center text-text-secondary text-sm">
          <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
          所有平台数据互通，一个账号全端登录
        </div>
      </div>
    </div>
  );
}
