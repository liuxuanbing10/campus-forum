import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';

interface OstracismInfo {
  banned: boolean;
  username: string;
  displayName: string;
  bannedUntil: string | null;
  banReason: string;
  isPermanent: boolean;
}

function formatCountdown(target: string): string {
  const diff = new Date(target + 'Z').getTime() - Date.now();
  if (diff <= 0) return '0天 0时 0分 0秒';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
}

export default function Ostracism() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();
  const [info, setInfo] = useState<OstracismInfo | null>(null);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);

  const loadInfo = useCallback(async () => {
    try {
      const { data } = await api.get('/ostracism/info');
      if (!data.banned) {
        navigate('/', { replace: true });
        return;
      }
      setInfo(data);
    } catch {
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  // 倒计时
  useEffect(() => {
    if (!info?.bannedUntil) return;
    const tick = () => setCountdown(formatCountdown(info.bannedUntil!));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [info?.bannedUntil]);

  // 封禁被解除时自动跳转
  useEffect(() => {
    if (!loading && user && !user.isBanned) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-lg w-full text-center">
        {/* 图标 */}
        <div className="text-6xl mb-6">🏝️</div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          陶片放逐
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {info.displayName} (@{info.username}) 你已被放逐出社区
        </p>

        {/* 倒计时 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
          {!info.isPermanent ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">距离解封还有</p>
              <div className="text-4xl font-mono font-bold text-orange-500 mb-2">
                {countdown}
              </div>
              <p className="text-xs text-gray-400">
                解封时间: {new Date(info.bannedUntil! + 'Z').toLocaleString('zh-CN')}
              </p>
            </>
          ) : (
            <div>
              <p className="text-2xl font-bold text-red-500 mb-2">永久封禁</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                该封禁不会自动解除，请联系管理员申诉
              </p>
            </div>
          )}
        </div>

        {/* 封禁原因 */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">封禁原因</p>
          <p className="text-red-700 dark:text-red-200">{info.banReason}</p>
        </div>

        {/* 社区规定 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-left text-sm text-gray-600 dark:text-gray-400 mb-8">
          <p className="font-medium text-gray-900 dark:text-white mb-3">📋 社区放逐规则</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>被放逐期间无法发帖、评论、投票、关注</li>
            <li>可以正常浏览内容（只读模式）</li>
            <li>临时放逐到期后自动恢复</li>
            <li>永久放逐需联系管理员申诉</li>
            <li>如认为误封，请通过邮件联系管理团队</li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              navigate('/login', { replace: true });
            }}
            className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
