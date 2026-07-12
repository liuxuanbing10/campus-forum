import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Search, Ban, UserCog, MoreVertical, UserX, UserCheck, FileText, Flag, History, AlertTriangle, Loader2, Trash2, Check, X, BarChart3, TrendingUp, Users, MessageSquare, Folder, Trophy, Smartphone } from 'lucide-react';
import { adminApi, adminExtendedApi, adminDeviceApi } from '../lib/api';
import type { AdminUser, PendingPost, SensitiveWord, AdminReport, AuditLog, AdminStats, DeviceBlacklistEntry, UserDevice } from '@campus-forum/core';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';

type AdminTab = 'stats' | 'users' | 'pending' | 'words' | 'reports' | 'logs' | 'devices';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { toastStore.warning('请先登录'); navigate('/login'); return; }
    if (user.role !== 'admin') { toastStore.error('无权访问'); navigate('/'); }
  }, [user, authLoading]);

  if (authLoading) return (
    <div className="text-center py-12">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
      <p className="text-campus-text-secondary">加载中...</p>
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-surface-hover rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> 管理后台</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <TabBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}><BarChart3 className="w-4 h-4" />数据看板</TabBtn>
        <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')}><UserCog className="w-4 h-4" />用户管理</TabBtn>
        <TabBtn active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}><FileText className="w-4 h-4" />待审核</TabBtn>
        <TabBtn active={activeTab === 'words'} onClick={() => setActiveTab('words')}><AlertTriangle className="w-4 h-4" />敏感词</TabBtn>
        <TabBtn active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}><Flag className="w-4 h-4" />举报管理</TabBtn>
        <TabBtn active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}><History className="w-4 h-4" />操作日志</TabBtn>
        <TabBtn active={activeTab === 'devices'} onClick={() => setActiveTab('devices')}><Smartphone className="w-4 h-4" />设备</TabBtn>
      </div>

      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'pending' && <PendingTab />}
      {activeTab === 'words' && <WordsTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'logs' && <LogsTab />}
      {activeTab === 'devices' && <DevicesTab />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-body transition-colors ${active ? 'bg-primary text-white' : 'bg-surface-hover text-campus-text-secondary hover:bg-border'}`}>
      {children}
    </button>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminExtendedApi.getStats()
      .then(r => setStats(r.data))
      .catch(() => toastStore.error('加载统计数据失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-campus-text-tertiary font-body">加载中...</div>;
  if (!stats) return <div className="text-center py-8 text-campus-text-tertiary font-body">暂无数据</div>;

  const maxUserGrowth = Math.max(...stats.userGrowth.map(d => d.count), 1);
  const maxPostTrend = Math.max(...stats.postTrend.map(d => d.count), 1);
  const maxBoardDist = Math.max(...stats.boardDist.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: Users, label: '总用户', value: stats.overview.totalUsers, color: 'text-blue-500' },
          { icon: FileText, label: '总帖子', value: stats.overview.totalPosts, color: 'text-green-500' },
          { icon: MessageSquare, label: '总评论', value: stats.overview.totalComments, color: 'text-amber-500' },
          { icon: Trophy, label: '总团队', value: stats.overview.totalTeams, color: 'text-purple-500' },
          { icon: Folder, label: '总板块', value: stats.overview.totalBoards, color: 'text-pink-500' },
        ].map((s, i) => (
          <div key={i} className="card p-4 text-center">
            <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
            <div className="text-2xl font-bold font-display">{s.value}</div>
            <div className="text-xs text-campus-text-tertiary font-body mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 今日数据 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold font-display mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> 今日新增
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">{stats.today.users}</div>
            <div className="text-xs text-campus-text-tertiary font-body">新用户</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">{stats.today.posts}</div>
            <div className="text-xs text-campus-text-tertiary font-body">新帖子</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-500">{stats.today.comments}</div>
            <div className="text-xs text-campus-text-tertiary font-body">新评论</div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 用户增长图 */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold font-display mb-3">近7天用户增长</h3>
          {stats.userGrowth.length === 0 ? (
            <p className="text-center text-campus-text-tertiary text-sm py-8 font-body">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {stats.userGrowth.map(d => (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-xs text-campus-text-tertiary w-20 font-body">{d.date.slice(5)}</span>
                  <div className="flex-1 bg-surface-hover rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${(d.count / maxUserGrowth) * 100}%` }}>
                      <span className="text-xs text-white font-medium">{d.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 帖子趋势图 */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold font-display mb-3">近7天帖子趋势</h3>
          {stats.postTrend.length === 0 ? (
            <p className="text-center text-campus-text-tertiary text-sm py-8 font-body">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {stats.postTrend.map(d => (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-xs text-campus-text-tertiary w-20 font-body">{d.date.slice(5)}</span>
                  <div className="flex-1 bg-surface-hover rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${(d.count / maxPostTrend) * 100}%` }}>
                      <span className="text-xs text-white font-medium">{d.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 板块分布和团队排行 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 板块帖子分布 */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold font-display mb-3">板块帖子分布</h3>
          {stats.boardDist.length === 0 ? (
            <p className="text-center text-campus-text-tertiary text-sm py-8 font-body">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {stats.boardDist.map(b => (
                <div key={b.name} className="flex items-center gap-2">
                  <span className="text-xs text-campus-text-secondary w-16 truncate font-body">{b.name}</span>
                  <div className="flex-1 bg-surface-hover rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${(b.count / maxBoardDist) * 100}%` }}>
                      <span className="text-xs text-white font-medium">{b.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 团队热度排行 */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold font-display mb-3">团队热度排行</h3>
          {stats.teamRanking.length === 0 ? (
            <p className="text-center text-campus-text-tertiary text-sm py-8 font-body">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {stats.teamRanking.map((t, i) => (
                <div key={t.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-surface-hover text-campus-text-tertiary'}`}>{i + 1}</span>
                  <span className="flex-1 text-sm font-body truncate">{t.name}</span>
                  <span className="text-xs text-campus-text-tertiary font-body">{t.member_count} 人</span>
                  <span className="text-xs text-campus-text-tertiary font-body">{t.post_count} 帖</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 活跃用户排行 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold font-display mb-3">活跃用户排行</h3>
        {stats.activeUsers.length === 0 ? (
          <p className="text-center text-campus-text-tertiary text-sm py-8 font-body">暂无数据</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stats.activeUsers.map((u, i) => (
              <div key={u.username} className="flex flex-col items-center p-3 rounded-lg bg-surface-hover">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold mb-2">
                  {u.display_name?.[0] || u.username[0]}
                </div>
                <span className="text-sm font-body truncate w-full text-center">{u.display_name || u.username}</span>
                <span className="text-xs text-campus-text-tertiary font-body mt-1">{u.points} 积分 · {u.post_count} 帖</span>
                {i < 3 && <span className="text-xs text-amber-500 mt-1">#{i + 1}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => { loadUsers(); }, [page, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers(page, searchQuery || undefined);
      if (page === 1) setUsers(res.data.users);
      else setUsers(prev => [...prev, ...res.data.users]);
      setTotal(res.data.total);
      setHasMore(res.data.users.length >= 20);
    } catch { toastStore.error('加载失败'); }
    finally { setLoading(false); }
  };

  const handleBan = async (id: number) => {
    try { await adminApi.banUser(id); toastStore.success('操作成功'); loadUsers(); }
    catch { toastStore.error('操作失败'); }
  };

  const handleRole = async (id: number, role: string) => {
    try { await adminApi.setRole(id, role); toastStore.success('角色已更新'); loadUsers(); }
    catch { toastStore.error('操作失败'); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="搜索用户..." className="flex-1 px-4 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
        <Search className="w-5 h-5 text-campus-text-tertiary -ml-8 self-center" />
      </div>
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold">{u.display_name?.[0] || '?'}</div>
              <div>
                <p className="text-sm font-medium font-body">{u.display_name} <span className="text-xs text-campus-text-tertiary">@{u.username}</span></p>
                <p className="text-xs text-campus-text-tertiary font-body">{u.email || '无邮箱'} · {u.post_count} 帖子 · {u.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {u.role !== 'admin' && (
                <button onClick={() => handleRole(u.id, u.role === 'admin' ? 'user' : 'admin')} className="p-2 hover:bg-surface-hover rounded-lg transition-colors" title="切换角色"><UserCog className="w-4 h-4" /></button>
              )}
              <button onClick={() => handleBan(u.id)} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive" title={u.is_banned ? '解封' : '封禁'}>
                {u.is_banned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      {hasMore && <button onClick={() => setPage(p => p + 1)} className="w-full py-3 text-sm text-primary hover:text-primary-hover font-body mt-4">加载更多</button>}
    </div>
  );
}

function PendingTab() {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminExtendedApi.getPendingPosts().then(r => setPosts(r.data.posts || []))
      .catch(() => toastStore.error('加载失败')).finally(() => setLoading(false));
  }, []);

  const handleReview = async (id: number, action: 'approve' | 'reject') => {
    try {
      await adminExtendedApi.reviewPost(id, action);
      toastStore.success(action === 'approve' ? '已通过' : '已拒绝');
      setPosts(posts.filter(p => p.id !== id));
    } catch { toastStore.error('操作失败'); }
  };

  if (loading) return <div className="text-center py-8 text-campus-text-tertiary font-body">加载中...</div>;
  if (posts.length === 0) return <div className="text-center py-12 text-campus-text-tertiary font-body">暂无待审核内容</div>;

  return (
    <div className="space-y-3">
      {posts.map(p => (
        <div key={p.id} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium font-body text-sm">{p.title}</p>
              <p className="text-xs text-campus-text-tertiary mt-1 font-body">{p.author_name} · {new Date(p.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleReview(p.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-body hover:bg-green-600"><Check className="w-3 h-3 inline mr-1" />通过</button>
              <button onClick={() => handleReview(p.id, 'reject')} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-body hover:bg-red-600"><X className="w-3 h-3 inline mr-1" />拒绝</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WordsTab() {
  const [words, setWords] = useState<SensitiveWord[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWords(); }, []);

  const loadWords = () => {
    adminExtendedApi.getSensitiveWords().then(r => setWords(r.data.words || []))
      .catch(() => {}).finally(() => setLoading(false));
  };

  const handleAdd = async () => {
    if (!newWord.trim()) return;
    try {
      await adminExtendedApi.addSensitiveWord(newWord.trim(), newReplacement.trim() || '***');
      toastStore.success('添加成功');
      setNewWord('');
      setNewReplacement('');
      loadWords();
    } catch { toastStore.error('添加失败'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try { await adminExtendedApi.deleteSensitiveWord(id); toastStore.success('已删除'); loadWords(); }
    catch { toastStore.error('删除失败'); }
  };

  return (
    <div>
      <div className="card p-4 mb-4">
        <h3 className="text-sm font-semibold font-display mb-3">添加敏感词</h3>
        <div className="flex gap-2">
          <input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="敏感词" className="flex-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
          <input value={newReplacement} onChange={e => setNewReplacement(e.target.value)} placeholder="替换为（默认***）" className="w-40 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
          <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-body hover:bg-primary-hover">添加</button>
        </div>
      </div>
      <div className="space-y-2">
        {words.map(w => (
          <div key={w.id} className="card p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-red-50 text-red-500 text-xs font-mono">{w.word}</span>
              <span className="text-xs text-campus-text-tertiary font-body">→ {w.replacement}</span>
            </div>
            <button onClick={() => handleDelete(w.id)} className="p-1 hover:bg-surface-hover rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {!loading && words.length === 0 && <p className="text-center py-8 text-campus-text-tertiary font-body">暂无敏感词</p>}
      </div>
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminExtendedApi.getReports().then(r => setReports(r.data.reports || []))
      .catch(() => toastStore.error('加载失败')).finally(() => setLoading(false));
  }, []);

  const handleResolve = async (id: number, action: 'dismiss' | 'penalize') => {
    try {
      await adminExtendedApi.resolveReport(id, action);
      toastStore.success(action === 'dismiss' ? '已驳回' : '已处理');
      setReports(reports.filter(r => r.id !== id));
    } catch { toastStore.error('操作失败'); }
  };

  if (loading) return <div className="text-center py-8 text-campus-text-tertiary font-body">加载中...</div>;
  if (reports.length === 0) return <div className="text-center py-12 text-campus-text-tertiary font-body">暂无举报</div>;

  return (
    <div className="space-y-3">
      {reports.map(r => (
        <div key={r.id} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs bg-orange-50 text-orange-500 font-body">{r.target_type}</span>
                <span className="text-sm font-medium font-body">#{r.target_id}</span>
              </div>
              <p className="text-sm text-campus-text-secondary mt-1 font-body">{r.reason}</p>
              <p className="text-xs text-campus-text-tertiary mt-1 font-body">举报者: {r.reporter_name} · {new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleResolve(r.id, 'dismiss')} className="px-3 py-1.5 rounded-lg bg-surface-hover text-xs font-body hover:bg-border">驳回</button>
              <button onClick={() => handleResolve(r.id, 'penalize')} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-body hover:bg-red-600">处理</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DevicesTab() {
  const [blacklist, setBlacklist] = useState<DeviceBlacklistEntry[]>([]);
  const [devices, setDevices] = useState<(UserDevice & { username?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newReason, setNewReason] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [blRes, devRes] = await Promise.all([
        adminDeviceApi.getBlacklist(),
        adminDeviceApi.getAllDevices(),
      ]);
      setBlacklist(blRes.data.devices || []);
      setDevices(devRes.data.devices || []);
    } catch { toastStore.error('加载设备数据失败'); }
    finally { setLoading(false); }
  };

  const handleAddBlacklist = async () => {
    if (!newDeviceId.trim()) return;
    setAdding(true);
    try {
      await adminDeviceApi.addToBlacklist(newDeviceId.trim(), newDeviceName.trim() || undefined, newReason.trim() || undefined);
      toastStore.success('已加入黑名单');
      setNewDeviceId(''); setNewDeviceName(''); setNewReason('');
      loadData();
    } catch { toastStore.error('操作失败'); }
    finally { setAdding(false); }
  };

  const handleRemoveBlacklist = async (id: number) => {
    if (!confirm('确定从黑名单移除？')) return;
    try { await adminDeviceApi.removeFromBlacklist(id); toastStore.success('已移除'); loadData(); }
    catch { toastStore.error('操作失败'); }
  };

  const filteredDevices = deviceFilter
    ? devices.filter(d => d.user_id === Number(deviceFilter) || d.username?.includes(deviceFilter))
    : devices;

  if (loading) return <div className="text-center py-8 text-campus-text-tertiary font-body">加载中...</div>;

  return (
    <div className="space-y-6">
      {/* 黑名单管理 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold font-display mb-3">设备黑名单</h3>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input value={newDeviceId} onChange={e => setNewDeviceId(e.target.value)} placeholder="设备ID (必填)"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
          <input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="设备名称"
            className="w-40 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
          <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="拉黑原因"
            className="w-40 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
          <button onClick={handleAddBlacklist} disabled={adding || !newDeviceId.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-body hover:bg-primary-hover disabled:opacity-50">
            {adding ? '添加中...' : '加入黑名单'}
          </button>
        </div>
        {blacklist.length === 0 ? (
          <p className="text-sm text-campus-text-tertiary font-body">暂无黑名单设备</p>
        ) : (
          <div className="space-y-2">
            {blacklist.map(b => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-hover">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono font-body">{b.device_id}</span>
                  {b.device_name && <span className="text-xs text-campus-text-secondary ml-2 font-body">({b.device_name})</span>}
                  {b.reason && <span className="text-xs text-campus-text-tertiary ml-2 font-body">— {b.reason}</span>}
                </div>
                <button onClick={() => handleRemoveBlacklist(b.id)} className="p-1 hover:bg-surface-hover rounded text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 用户设备列表 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold font-display">用户设备列表</h3>
          <input value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} placeholder="按用户ID/名称筛选"
            className="w-48 px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-xs font-body focus:outline-none focus:border-primary" />
        </div>
        {filteredDevices.length === 0 ? (
          <p className="text-sm text-campus-text-tertiary font-body">暂无设备数据</p>
        ) : (
          <div className="space-y-2">
            {filteredDevices.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-hover">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium font-body">{d.username || `用户#${d.user_id}`}</span>
                  <span className="text-xs text-campus-text-tertiary ml-2 font-mono">{d.device_id.slice(0, 16)}...</span>
                  {d.device_name && <span className="text-xs text-campus-text-secondary ml-2 font-body">{d.device_name}</span>}
                  {d.is_active === 0 && <span className="text-xs text-destructive ml-2 font-body">已禁用</span>}
                </div>
                <span className="text-xs text-campus-text-tertiary font-body shrink-0">
                  {d.last_login_at ? new Date(d.last_login_at).toLocaleString() : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminExtendedApi.getAuditLogs().then(r => setLogs(r.data.logs || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-campus-text-tertiary font-body">加载中...</div>;
  if (logs.length === 0) return <div className="text-center py-12 text-campus-text-tertiary font-body">暂无操作日志</div>;

  return (
    <div className="space-y-2">
      {logs.map(l => (
        <div key={l.id} className="card p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center shrink-0">
            <History className="w-4 h-4 text-campus-text-tertiary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body">
              <span className="font-medium">{l.admin_name}</span>
              <span className="text-campus-text-secondary"> {l.action} </span>
              <span className="text-xs text-campus-text-tertiary">{l.target_type} #{l.target_id}</span>
            </p>
            {l.details && <p className="text-xs text-campus-text-tertiary mt-0.5 font-body">{l.details}</p>}
            <p className="text-xs text-campus-text-tertiary mt-0.5 font-body">{new Date(l.created_at).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
