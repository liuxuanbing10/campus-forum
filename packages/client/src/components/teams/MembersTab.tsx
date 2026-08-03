import { Lock, Crown, Shield } from 'lucide-react';
import { teamsApi } from '../../lib/api';
import type { TeamMember } from '../../types/api';
import { toastStore } from '../../App';
import { formatDate } from '../../lib/date';

interface Props {
  members: TeamMember[];
  membersHidden: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  teamId: number;
  loadData: () => Promise<void>;
  setShowTransferModal: (v: boolean) => void;
}

export default function MembersTab({ members, membersHidden, isOwner, isAdmin, teamId, loadData, setShowTransferModal }: Props) {
  const handleToggleAdmin = async (member: TeamMember) => {
    if (!isOwner) return;
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    try {
      await teamsApi.setMemberRole(teamId, member.userId, newRole);
      toastStore.success(newRole === 'admin' ? '已设为管理员' : '已取消管理员');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('确定移除该成员吗？')) return;
    try {
      await teamsApi.removeMember(teamId, userId);
      toastStore.success('已移除');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <div>
      {membersHidden ? (
        <div className="text-center py-12">
          <Lock className="w-12 h-12 mx-auto text-campus-text-tertiary mb-3" />
          <p className="text-campus-text-secondary">成员列表仅对团队成员可见</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium text-primary">{(member.displayName || member.username)[0]}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-campus-text-primary font-medium text-sm">
                      {member.displayName || member.username}
                    </span>
                    {member.role === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
                    {member.role === 'admin' && <Shield className="w-4 h-4 text-accent" />}
                  </div>
                  <span className="text-xs text-campus-text-tertiary">
                    {formatDate(member.joinedAt)} 加入
                  </span>
                </div>
              </div>
              {isOwner && member.role !== 'owner' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleAdmin(member)}
                    className="btn-secondary btn-xs btn-inline"
                  >
                    {member.role === 'admin' ? '取消管理员' : '设为管理员'}
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="btn-secondary btn-xs btn-inline text-destructive hover:bg-destructive/10"
                  >
                    移除
                  </button>
                </div>
              )}
              {isAdmin && !isOwner && member.role === 'member' && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="btn-secondary btn-xs btn-inline text-destructive hover:bg-destructive/10"
                >
                  移除
                </button>
              )}
            </div>
          ))}
          {isOwner && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setShowTransferModal(true)}
                className="btn-secondary btn-sm btn-inline text-destructive hover:bg-destructive/10"
              >
                转让团队
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
