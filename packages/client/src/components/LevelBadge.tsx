import { Star, TrendingUp, Trophy } from 'lucide-react';

interface LevelBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showTitle?: boolean;
}

// 等级名称与分段
const LEVEL_TIERS = [
  { min: 0,    title: '初来乍到', color: 'from-gray-400 to-gray-500' },
  { min: 100,  title: '初窥门径', color: 'from-green-400 to-green-500' },
  { min: 300,  title: '小有名气', color: 'from-cyan-400 to-cyan-500' },
  { min: 600,  title: '崭露头角', color: 'from-blue-400 to-blue-500' },
  { min: 1000, title: '论坛达人', color: 'from-violet-400 to-violet-500' },
  { min: 1500, title: '风云人物', color: 'from-amber-400 to-amber-500' },
  { min: 2100, title: '社区精英', color: 'from-orange-400 to-orange-500' },
  { min: 3000, title: '校园之星', color: 'from-rose-400 to-rose-500' },
  { min: 4000, title: '传奇学长', color: 'from-pink-500 to-red-500' },
  { min: 5500, title: '论坛传说', color: 'from-yellow-400 via-orange-500 to-red-500' },
];

function getLevel(points: number) {
  const level = Math.floor((points || 0) / 100) + 1;
  const tier = [...LEVEL_TIERS].reverse().find(t => (points || 0) >= t.min) || LEVEL_TIERS[0];
  return { level, tier };
}

export default function LevelBadge({ points, size = 'md', showProgress = false, showTitle = true }: LevelBadgeProps) {
  const safePoints = points || 0;
  const { level, tier } = getLevel(safePoints);
  const nextLevelPoints = level * 100;
  const currentLevelPoints = (level - 1) * 100;
  const progress = nextLevelPoints > currentLevelPoints
    ? ((safePoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
    : 100;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  };

  const iconSize = { sm: 10, md: 14, lg: 16 };
  const dotSize = { sm: 4, md: 6, lg: 7 };

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`inline-flex items-center rounded-full font-semibold shadow-sm ${sizeClasses[size]} bg-gradient-to-r ${tier.color} text-white`}
      >
        <Trophy size={iconSize[size]} fill="currentColor" />
        <span>
          {showTitle ? `${tier.title}` : `Lv.${level}`}
        </span>
      </div>
      {showProgress && (
        <div className="flex items-center gap-1.5 text-xs text-campus-text-tertiary">
          <TrendingUp size={12} />
          <span>{safePoints} / {nextLevelPoints}</span>
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
