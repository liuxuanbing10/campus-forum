import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Lock, Unlock, Calendar, ArrowLeft, Edit, Trash2, LogOut, Check, X, UserPlus } from 'lucide-react';
import { teamsApi, Team, TeamMember } from '../lib/api';
import TeamMemberList from '../components/TeamMemberList';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [applications, setApplications] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'applications'>('members');

  useEffect(() => {
    if (id) {
      loadTeam();
      loadMembers();
    }
  }, [id]);

  const loadTeam = async () => {
    try {
      const res = await teamsApi.getTeam(Number(id));
      setTeam(res.data);
      if (res.data.myRole === 'owner' || res.data.myRole === 'admin') {
        loadApplications();
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        toastStore.error('团队不存在');
        navigate('/teams');
      } else if (err.response?.status === 403) {
        toastStore.error('这是私密团队，您无权访问');
        navigate('/teams');
      } else {
        toastStore.error('加载团队信息失败');
      }
    }
  };

  const loadMembers = async () => {
    try {
      const res = await teamsApi.getTeamMembers(Number(id));
      setMembers(res.data.members);
    } catch (err) {
      toastStore.error('加载成员列表失败');
    }
  };

  const loadApplications = async () => {
    try {
      const res = await teamsApi.getTeamApplications(Number(id));
      setApplications(res.data.applications);
    } catch (err) {}
  };

  const handleJoin = async () => {
    if (!user) {
      toastStore.warning('请先登录');
      navigate('/login');
      return;
    }
    try {
      const res = await teamsApi.joinTeam(Number(id));
      toastStore.success(res.data.message);
      loadTeam();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '加入失败');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('确定要退出这个团队吗？')) return;
    try {
      const res = await teamsApi.leaveTeam(Number(id));
      toastStore.success(res.data.message);
      navigate('/teams');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '退出失败');
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      const res = await teamsApi.approveMember(Number(id), userId);
      toastStore.success(res.data.message);
      loadApplications();
      loadMembers();
      loadTeam();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleReject = async (userId: number) => {
    try {
      const res = await teamsApi.rejectMember(Number(id), userId);
      toastStore.success(res.data.message);
      loadApplications();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!window.confirm('确定要移除该成员吗？')) return;
    try {
      const res = await teamsApi.removeMember(Number(id), userId);
      toastStore.success(res.data.message);
      loadMembers();
      loadTeam();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个团队吗？此操作不可恢复！')) return;
    try {
      const res = await teamsApi.deleteTeam(Number(id));
      toastStore.success(res.data.message);
      navigate('/teams');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-campus-text-secondary">加载中...</p>
      </div>
    );
  }

  if (!team) return null;

  const isAdmin = team.myRole === 'owner' || team.myRole === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/teams')}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-campus-text-secondary" />
        </button>
        <h1 className="text-2xl font-bold text-campus-text-primary font-display">{team.name}</h1>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
            {team.avatar ? (
              <img src={team.avatar} alt={team.name} className="w-18 h-18 rounded-full object-cover" />
            ) : (
              <Users className="w-10 h-10 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {team.is_public === 1 ? (
                <Unlock className="w-4 h-4 text-green-500" />
              ) : (
                <Lock className="w-4 h-4 text-campus-text-tertiary" />
              )}
              <span className="text-sm text-campus-text-secondary">
                {team.is_public === 1 ? '公开团队' : '私密团队'}
              </span>
              {team.myRole && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  {team.myRole === 'owner' ? '创建者' : team.myRole === 'admin' ? '管理员' : '成员'}
                </span>
              )}
            </div>
            <p className="text-campus-text-secondary mb-4">{team.description || '暂无描述'}</p>
            <div className="flex items-center gap-6 text-sm text-campus-text-tertiary">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {team.member_count}/{team.max_members} 成员
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                创建于 {new Date(team.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {team.myRole ? (
              <>
                <button
                  onClick={() => navigate(`/teams/${team.id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 text-campus-text-primary rounded-lg font-medium transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </button>
                <button
                  onClick={handleLeave}
                  className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  退出
                </button>
                {team.myRole === 'owner' && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive-hover text-white rounded-lg font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                )}
              </>
            ) : team.myApplicationStatus === 'pending' ? (
              <button disabled className="px-4 py-2 bg-surface text-campus-text-tertiary rounded-lg font-medium cursor-not-allowed">
                已申请，等待审批
              </button>
            ) : (
              <button
                onClick={handleJoin}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {team.is_public === 1 ? '加入团队' : '申请加入'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-campus-text-secondary hover:text-primary'
            }`}
          >
            成员列表 ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'applications' ? 'border-primary text-primary' : 'border-transparent text-campus-text-secondary hover:text-primary'
            }`}
          >
            待审批 ({applications.length})
          </button>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-6">
        {activeTab === 'members' ? (
          <TeamMemberList
            members={members}
            onRemove={isAdmin ? handleRemoveMember : undefined}
            showActions={isAdmin}
          />
        ) : (
          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="text-center py-8 text-campus-text-secondary">
                <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无待审批申请</p>
              </div>
            ) : (
              applications.map(app => (
                <div key={app.id} className="flex items-center justify-between bg-surface/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-campus-text-primary">{app.username}</p>
                      <p className="text-xs text-campus-text-tertiary">
                        申请于 {new Date(app.joined_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(app.user_id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      批准
                    </button>
                    <button
                      onClick={() => handleReject(app.user_id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-surface border border-border hover:border-destructive text-campus-text-secondary rounded-lg text-sm font-medium transition-colors"
                    >
                      <X className="w-3 h-3" />
                      拒绝
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}