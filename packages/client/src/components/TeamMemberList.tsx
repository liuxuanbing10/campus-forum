import { User, Crown, Shield, UserCircle } from 'lucide-react';
import { TeamMember } from '../lib/api';

interface TeamMemberListProps {
  members: TeamMember[];
  onRemove?: (userId: number) => void;
  showActions?: boolean;
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return <Crown className="w-4 h-4 text-yellow-500" />;
    case 'admin':
      return <Shield className="w-4 h-4 text-blue-500" />;
    default:
      return <User className="w-4 h-4 text-campus-text-tertiary" />;
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'owner':
      return '创建者';
    case 'admin':
      return '管理员';
    default:
      return '成员';
  }
}

export default function TeamMemberList({ members, onRemove, showActions = false }: TeamMemberListProps) {
  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <div className="text-center py-8 text-campus-text-secondary">
          <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无成员</p>
        </div>
      ) : (
        members.map(member => (
          <div key={member.id} className="flex items-center justify-between bg-surface/50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-campus-text-primary">{member.username}</p>
                <div className="flex items-center gap-2 text-xs text-campus-text-tertiary">
                  {getRoleIcon(member.role)}
                  <span>{getRoleLabel(member.role)}</span>
                  <span>•</span>
                  <span>{new Date(member.joined_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>
            {showActions && onRemove && member.role === 'member' && (
              <button
                onClick={() => onRemove(member.user_id)}
                className="text-xs text-destructive hover:text-destructive-hover px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
              >
                移除
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}