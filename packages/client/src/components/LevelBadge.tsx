import { Star, TrendingUp } from 'lucide-react';

interface LevelBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export default function LevelBadge({ points, size = 'md', showProgress = false }: LevelBadgeProps) {
  const level = Math.floor((points || 0) / 100) + 1;
  const currentLevelPoints = (level - 1) * 100;
  const nextLevelPoints = level * 100;
  const progress = ((points || 0) - currentLevelPoints) / 100 * 100;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  // 等级颜色
  const getLevelColor = (lvl: number) => {
    if (lvl >= 10) return 'bg-purple-500 text-white';
    if (lvl >= 7) return 'bg-amber-500 text-white';
    if (lvl >= 5) return 'bg-blue-500 text-white';
    if (lvl >= 3) return 'bg-green-500 text-white';
    return 'bg-gray-500 text-white';
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses[size]} ${getLevelColor(level)}`}
      >
        <Star size={iconSize[size]} fill="currentColor" />
        <span>Lv.{level}</span>
      </div>
      {showProgress && (
        <div className="flex items-center gap-1.5 text-xs text-campus-text-tertiary">
          <TrendingUp size={12} />
          <span>{points || 0} / {nextLevelPoints}</span>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}