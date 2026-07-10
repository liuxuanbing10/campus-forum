import { Users, Lock, Unlock, Calendar, Heart, FileText } from 'lucide-react';
import { teamsApi } from '../lib/api';
import type { Team } from '@campus-forum/core';
import { useState } from 'react';
import { toastStore } from '../App';

interface TeamCardProps {
  team: Team;
  onClick: () => void;
  showFavorite?: boolean;
  onFavoriteChange?: () => void;
}

export default function TeamCard({ team, onClick, showFavorite = true, onFavoriteChange }: TeamCardProps) {
  const [favorited, setFavorited] = useState(team.isFavorited);
  const [favLoading, setFavLoading] = useState(false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await teamsApi.toggleFavorite(team.id);
      setFavorited(res.data.favorited);
      toastStore.success(res.data.favorited ? '已收藏' : '已取消收藏');
      onFavoriteChange?.();
    } catch {
      toastStore.error('操作失败');
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-xl p-5 cursor-pointer hover:border-primary/30 hover:shadow-card hover:-translate-y-1 transition-all duration-300 group relative"
    >
      {showFavorite && (
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-surface-hover transition-colors z-10"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${favorited ? 'fill-red-500 text-red-500' : 'text-campus-text-tertiary hover:text-red-400'}`}
          />
        </button>
      )}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
          {team.avatar ? (
            <img src={team.avatar} alt={team.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <Users className="w-7 h-7 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-campus-text-primary text-lg group-hover:text-primary transition-colors truncate">
              {team.name}
            </h3>
            {team.is_public === 1 ? (
              <Unlock className="w-3.5 h-3.5 text-campus-text-secondary flex-shrink-0" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-campus-text-secondary flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-campus-text-secondary line-clamp-2 mb-3">
            {team.description || '暂无描述'}
          </p>
          <div className="flex items-center gap-4 text-xs text-campus-text-tertiary">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {team.member_count}/{team.max_members}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {team.post_count} 帖
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(team.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
          {team.role && team.role !== 'member' && (
            <div className="mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${team.role === 'owner' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                {team.role === 'owner' ? '创建者' : '管理员'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
