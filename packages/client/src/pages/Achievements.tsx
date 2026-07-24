import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Star, TrendingUp, Sparkles, Lock, CheckCircle, Loader2, RefreshCw, BookOpen } from 'lucide-react';
import api from '../lib/api';
import type { Achievement } from '@campus-forum/core';

interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlocked_at: string | null;
}

interface AchievementStats {
  total: number;
  unlocked: number;
  totalPoints: number;
  earnedPoints: number;
  userPoints: number;
}

const categoryMeta: Record<string, { label: string; icon: string; color: string }> = {
  content:    { label: '内容创作', icon: '📝', color: 'from-blue-500 to-cyan-500' },
  social:     { label: '社交互动', icon: '💬', color: 'from-green-500 to-emerald-500' },
  popularity: { label: '人气之星', icon: '⭐', color: 'from-amber-500 to-orange-500' },
  team:       { label: '团队协作', icon: '🤝', color: 'from-purple-500 to-violet-500' },
  activity:   { label: '活跃度',  icon: '💪', color: 'from-pink-500 to-rose-500' },
  special:    { label: '特殊成就', icon: '🏆', color: 'from-red-500 to-yellow-500' },
};

const categoryOrder = ['content', 'social', 'popularity', 'team', 'activity', 'special'];

export default function Achievements() {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [checking, setChecking] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [achRes, statRes] = await Promise.all([
        api.get<{ achievements: AchievementWithStatus[] }>('/achievements'),
        api.get<AchievementStats>('/achievements/stats'),
      ]);
      setAchievements(achRes.data.achievements);
      setStats(statRes.data);
    } catch {
      // 静默失败 — 可能成就插件未加载
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckAll = async () => {
    setChecking(true);
    try {
      await api.post('/achievements/check');
      await loadData();
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  const grouped = category === 'all'
    ? achievements
    : achievements.filter(a => a.category === category);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // 等级计算（与 LevelBadge 保持一致）
  const MAX_POINTS = 5500;
  const points = stats?.userPoints ?? 0;
  const cappedPoints = Math.min(points, MAX_POINTS);
  const level = Math.min(Math.floor(cappedPoints / 100) + 1, 10);
  const nextLevelPoints = points >= MAX_POINTS ? MAX_POINTS : level * 100;
  const prevLevelPoints = points >= MAX_POINTS ? 5500 : (level - 1) * 100;
  const progress = nextLevelPoints > prevLevelPoints
    ? ((cappedPoints - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) * 100
    : 100;
  const isMaxLevel = points >= MAX_POINTS;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-campus-text-secondary gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span>加载成就数据...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── 头部：等级与统计 ── */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-campus-text-primary font-display">成就系统</h1>
              <p className="text-sm text-campus-text-secondary mt-1">
                {isMaxLevel
                  ? `等级 Lv.${level} · MAX · ${points} 积分 · 已达满级 🎉`
                  : `等级 Lv.${level} · ${points} 积分 · 下一级还需 ${nextLevelPoints - points} 分`
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckAll}
            disabled={checking}
            className="btn-secondary btn-sm btn-inline flex items-center gap-1.5 disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            刷新成就
          </button>
          <Link
            to="/achievements/rules"
            className="btn-secondary btn-sm btn-inline flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            规则
          </Link>
        </div>

        {/* 经验条 */}
        <div className="mt-4">
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="text-center p-3 bg-surface/80 rounded-xl border border-border/50">
            <div className="text-2xl font-bold text-primary">{unlockedCount}/{stats?.total ?? 0}</div>
            <div className="text-xs text-campus-text-tertiary mt-1">已解锁</div>
          </div>
          <div className="text-center p-3 bg-surface/80 rounded-xl border border-border/50">
            <div className="text-2xl font-bold text-amber-500">{stats?.earnedPoints ?? 0}</div>
            <div className="text-xs text-campus-text-tertiary mt-1">获得积分</div>
          </div>
          <div className="text-center p-3 bg-surface/80 rounded-xl border border-border/50">
            <div className="text-2xl font-bold text-emerald-500">{points}</div>
            <div className="text-xs text-campus-text-tertiary mt-1">总积分</div>
          </div>
        </div>
      </div>

      {/* ── 分类标签 ── */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        <button
          onClick={() => setCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            category === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-campus-text-secondary hover:text-primary hover:border-primary/30'
          }`}
        >
          全部
        </button>
        {categoryOrder.map(catKey => {
          const meta = categoryMeta[catKey];
          if (!meta) return null;
          return (
            <button
              key={catKey}
              onClick={() => setCategory(catKey)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                category === catKey
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-campus-text-secondary hover:text-primary hover:border-primary/30'
              }`}
            >
              <span>{meta.icon}</span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* ── 成就网格 ── */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-campus-text-secondary">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-campus-text-tertiary" />
          <p>暂未找到成就</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {grouped.map(ach => (
            <div
              key={ach.id}
              className={`relative rounded-2xl border p-4 transition-all ${
                ach.unlocked
                  ? 'bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20'
                  : 'bg-surface border-border/60 opacity-70 hover:opacity-90'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* 图标 */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                  ach.unlocked
                    ? 'bg-gradient-to-br from-primary/20 to-accent/20'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {ach.unlocked ? ach.icon : <Lock className="w-5 h-5 text-campus-text-tertiary" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold text-sm ${ach.unlocked ? 'text-campus-text-primary' : 'text-campus-text-secondary'}`}>
                      {ach.name}
                    </h3>
                    {ach.unlocked && (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-campus-text-tertiary mt-1 line-clamp-1">{ach.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      +{ach.points}
                      {(ach as any).repeat_interval > 0 && <span className="text-[10px] opacity-70">×{(ach as any).max_repeats || '∞'}</span>}
                    </span>
                    <span className="text-[11px] text-campus-text-tertiary">
                      {ach.condition_desc}
                      {(ach as any).repeat_interval > 0 && ` · 已获 ${(ach as any).repeat_count || 0}/${(ach as any).max_repeats || '∞'}`}
                    </span>
                  </div>
                  {ach.unlocked && ach.unlocked_at && (
                    <p className="text-[10px] text-campus-text-tertiary mt-1.5">
                      达成于 {new Date(ach.unlocked_at + 'Z').toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
