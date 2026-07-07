import { Users, Lock, Unlock, Calendar } from 'lucide-react';
import { Team } from '../lib/api';

interface TeamCardProps {
  team: Team;
  onClick: () => void;
}

export default function TeamCard({ team, onClick }: TeamCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-xl p-5 cursor-pointer hover:border-primary/30 hover:shadow-card hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
          {team.avatar ? (
            <img src={team.avatar} alt={team.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <Users className="w-7 h-7 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-campus-text-primary text-lg group-hover:text-primary transition-colors truncate">
              {team.name}
            </h3>
            {team.is_public === 1 ? (
              <Unlock className="w-3.5 h-3.5 text-campus-text-secondary" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-campus-text-secondary" />
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
              <Calendar className="w-3 h-3" />
              {new Date(team.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}