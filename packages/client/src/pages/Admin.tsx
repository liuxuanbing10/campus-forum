import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Search, Ban, UserCog, MoreVertical, UserX, UserCheck } from 'lucide-react';
import { adminApi, AdminUser } from '../lib/api';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!user) {
      toastStore.warning('请先登录');
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      toastStore.error('无权访问管理后台');
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, page, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers(page, searchQuery || undefined);
      if (page === 1) {
        setUsers(res.data.users);
      } else {
        setUsers(prev => [...prev, ...res.data.users]);
      }
      setTotal(res.data.total);
      setHasMore(res.data.users.length >= 20);
    } catch {
      toastStore.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setUsers([]);
  };

  const handleBan = async (userId: number, currentBanStatus: number) => {
    const action = currentBanStatus === 1 ? '解封' : '封禁';
    if (!confirm(`确定${action}该用户吗？`)) return;
    try {
      await adminApi.banUser(userId);
      toastStore.success(`${action}成功`);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_banned: currentBanStatus === 1 ? 0 : 1 } : u
      ));
    } catch {
      toastStore.error('操作失败');
    }
  };

  const handleSetRole = async (userId: number, role: string) => {
    const roleName = role === 'admin' ? '管理员' : '普通用户';
    if (!confirm(`确定将该用户设为${roleName}吗？`)) return;
    try {
      await adminApi.setRole(userId, role);
      toastStore.success(`已设为${roleName}`);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role } : u
      ));
    } catch {
      toastStore.error('操作失败');
    }
  };

  const loadMore = () => setPage(p => p + 1);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-campus-text-secondary" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-campus-text-primary font-display">管理后台</h1>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-campus-text-primary">用户管理</h2>
          <span className="text-sm text-campus-text-secondary">共 {total} 位用户</span>
        </div>

        <form onSubmit={handleSearch} className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-campus-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索用户名或邮箱..."
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors text-sm"
          />
        </form>

        {loading && page === 1 && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        )}

        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                u.is_banned === 1 ? 'bg-destructive/5' : 'bg-background'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium flex-shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  u.display_name?.charAt(0) || u.username.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-campus-text-primary truncate">
                    {u.display_name || u.username}
                  </span>
                  {u.role === 'admin' && (
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">
                      管理员
                    </span>
                  )}
                  {u.is_banned === 1 && (
                    <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive text-xs rounded">
                      已封禁
                    </span>
                  )}
                </div>
                <div className="text-xs text-campus-text-tertiary">
                  @{u.username} · {u.email}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-campus-text-tertiary flex-shrink-0">
                <span>{u.post_count} 帖</span>
                <span>·</span>
                <span>{u.comment_count} 评论</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleBan(u.id, u.is_banned)}
                  className={`p-2 rounded-lg transition-colors ${
                    u.is_banned === 1
                      ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-destructive hover:bg-destructive/10'
                  }`}
                  title={u.is_banned === 1 ? '解封' : '封禁'}
                >
                  {u.is_banned === 1 ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <UserX className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleSetRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                  className="p-2 text-campus-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title={u.role === 'admin' ? '取消管理员' : '设为管理员'}
                >
                  <UserCog className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="text-center pt-4 mt-4 border-t border-border">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-2 border border-border hover:border-primary/50 text-campus-text-primary rounded-xl text-sm transition-colors"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
