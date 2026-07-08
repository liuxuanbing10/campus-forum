import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Search, Ban, UserCog, MoreVertical, UserX, UserCheck, FileText, Flag, History, AlertTriangle, Loader2, Trash2, Check, X } from 'lucide-react';
import { adminApi, adminExtendedApi, AdminUser, PendingPost, SensitiveWord, AdminReport, AuditLog } from '../lib/api';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';

type AdminTab = 'users' | 'pending' | 'words' | 'reports' | 'logs';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  useEffect(() => {
    if (!user) { toastStore.warning('请先登录'); navigate('/login'); return; }
    if (user.role !== 'admin') { toastStore.error('无权访问'); navigate('/'); }
  }, [user]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-surface-hover rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> 管理后台</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')}><UserCog className="w-4 h-4" />用户管理</TabBtn>
        <TabBtn active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}><FileText className="w-4 h-4" />待审核</TabBtn>
        <TabBtn active={activeTab === 'words'} onClick={() => setActiveTab('words')}><AlertTriangle className="w-4 h-4" />敏感词</TabBtn>
        <TabBtn active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}><Flag className="w-4 h-4" />举报管理</TabBtn>
        <TabBtn active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}><History className="w-4 h-4" />操作日志</TabBtn>
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'pending' && <PendingTab />}
      {activeTab === 'words' && <WordsTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'logs' && <LogsTab />}
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
