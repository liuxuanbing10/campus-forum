import { Users, Lock, Unlock, ArrowLeft, Settings, LogOut, UserPlus, Heart } from 'lucide-react';
import { teamsApi } from '../../lib/api';
import type { Team, TeamMember } from '../../types/api';
import { toastStore } from '../../App';
import type { User } from '../../stores/auth';
import type { NavigateFunction } from 'react-router-dom';

interface Props {
  team: Team;
  user: User | null;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  actionLoading: boolean;
  teamId: number;
  loadData: () => Promise<void>;
  setTeam: (team: Team) => void;
  setActionLoading: (v: boolean) => void;
  navigate: NavigateFunction;
}

export default function TeamHeader({ team, user, isOwner, isAdmin, isMember, actionLoading, teamId, loadData, setTeam, setActionLoading, navigate }: Props) {
  const handleJoin = async () => {
    setActionLoading(true);
    try {
      const res = await teamsApi.joinTeam(teamId);
      toastStore.success(res.data.message);
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    } finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    if (!confirm('确定要退出团队吗？')) return;
    setActionLoading(true);
    try {
      const res = await teamsApi.leaveTeam(teamId);
      toastStore.success(res.data.message);
      navigate('/teams');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    } finally { setActionLoading(false); }
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await teamsApi.toggleFavorite(teamId);
      setTeam({ ...team, isFavorited: res.data.favorited });
      toastStore.success(res.data.favorited ? '已收藏' : '已取消收藏');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-campus-text-secondary hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
            {team.avatar ? (
              <img src={team.avatar} alt={team.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <Users className="w-10 h-10 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-campus-text-primary font-display">{team.name}</h1>
              {team.isPublic === 1 ? (
                <span className="flex items-center gap-1 text-xs text-campus-text-secondary bg-surface-hover px-2 py-1 rounded-full">
                  <Unlock className="w-3 h-3" />
                  公开
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-campus-text-secondary bg-surface-hover px-2 py-1 rounded-full">
                  <Lock className="w-3 h-3" />
                  私密
                </span>
              )}
              {isOwner && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">创建者</span>}
              {team.myRole === 'admin' && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">管理员</span>}
            </div>
            <p className="text-campus-text-secondary mb-4 text-sm line-clamp-2">{team.description || '暂无描述'}</p>
            <div className="flex items-center gap-5 text-sm text-campus-text-tertiary">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {team.memberCount}/{team.maxMembers} 人
              </span>
              <span className="flex items-center gap-1">
                <span>{team.postCount} 帖</span>
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {user && (
              <button
                onClick={handleToggleFavorite}
                className="p-2 rounded-xl border border-border hover:border-primary/30 hover:bg-surface-hover transition-colors"
                title={team.isFavorited ? '取消收藏' : '收藏'}
              >
                <Heart className={`w-5 h-5 ${team.isFavorited ? 'fill-red-500 text-red-500' : 'text-campus-text-secondary'}`} />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate(`/teams/${teamId}/edit`)}
                className="btn-secondary btn-sm btn-inline flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                管理
              </button>
            )}
            {isMember ? (
              <button
                onClick={handleLeave}
                disabled={actionLoading || isOwner}
                className="btn-secondary btn-sm btn-inline flex items-center gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {isOwner ? '创建者' : '退出'}
              </button>
            ) : team.myApplicationStatus === 'pending' ? (
              <button disabled className="btn-secondary btn-sm btn-inline opacity-60">
                等待审批
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={actionLoading}
                className="btn-primary btn-sm btn-inline flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {team.isPublic === 1 ? '加入团队' : '申请加入'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
