import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { authApi, User, default as api, oauthApi, exportApi, avatarApi, OAuthAccount } from '../lib/api';
import { toastStore } from '../App';
import { Eye, EyeOff, User as UserIcon, Mail, Edit3, Check, X, Lock, RefreshCw, Upload, Download, Link2, Unlink, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'oauth' | 'export'>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: '', email: '' });
  const [profileEditing, setProfileEditing] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [exporting, setExporting] = useState(false);

  const fetchUser = useAuthStore(s => s.fetchUser);

  useEffect(() => { loadUser(); loadAccounts(); }, []);

  const loadUser = async () => {
    try {
      await fetchUser();
      const userInfo = useAuthStore.getState().user;
      if (userInfo) {
        const { data } = await api.get('/auth/me');
        setUser(data);
        setProfileForm({ display_name: data.displayName, email: data.email || '' });
      }
    } catch { toastStore.error('加载用户信息失败'); }
  };

  const loadAccounts = async () => {
    try {
      const { data } = await oauthApi.getAccounts();
      setAccounts(data.accounts || []);
    } catch {}
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarPreview) return;
    setAvatarUploading(true);
    try {
      const { data } = await avatarApi.upload(avatarPreview);
      if (data.success) {
        toastStore.success('头像更新成功');
        setAvatarPreview(null);
        setAvatarFile(null);
        loadUser();
      }
    } catch { toastStore.error('头像上传失败'); }
    finally { setAvatarUploading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await exportApi.exportData();
      if (data.url) {
        window.open(data.url, '_blank');
        toastStore.success('数据导出成功');
      } else {
        toastStore.success('数据导出请求已提交，请稍后查看');
      }
    } catch { toastStore.error('导出失败'); }
    finally { setExporting(false); }
  };

  const handleOAuthBind = (provider: string) => {
    toastStore.info(`${provider} 绑定功能开发中`);
  };

  const handleOAuthUnbind = async (provider: string) => {
    if (!confirm(`确定解绑 ${provider} 账号？`)) return;
    try {
      await oauthApi.unbind(provider);
      toastStore.success('解绑成功');
      loadAccounts();
    } catch { toastStore.error('解绑失败'); }
  };

  // ... profile & password forms from original ...
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
      <h1 className="text-2xl font-bold font-display mb-6">设置</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-campus-text-secondary hover:bg-surface-hover'}`}>个人资料</button>
        <button onClick={() => setActiveTab('password')} className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${activeTab === 'password' ? 'bg-primary text-white' : 'text-campus-text-secondary hover:bg-surface-hover'}`}>修改密码</button>
        <button onClick={() => setActiveTab('oauth')} className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${activeTab === 'oauth' ? 'bg-primary text-white' : 'text-campus-text-secondary hover:bg-surface-hover'}`}>账号绑定</button>
        <button onClick={() => setActiveTab('export')} className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${activeTab === 'export' ? 'bg-primary text-white' : 'text-campus-text-secondary hover:bg-surface-hover'}`}>数据导出</button>
      </div>

      {/* Avatar + Profile */}
      {activeTab === 'profile' && (
        <>
          <div className="card p-6 mb-6">
            <h3 className="text-lg font-semibold font-display mb-4">头像设置</h3>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-3xl font-bold shrink-0 overflow-hidden">
                {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                  : user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  : user?.displayName?.[0] || '?'}
              </div>
              <div className="space-y-3">
                <label className="btn-primary inline-flex items-center gap-2 cursor-pointer text-sm font-body">
                  <Upload className="w-4 h-4" /> 选择图片
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                {avatarPreview && (
                  <div className="flex items-center gap-2">
                    <button onClick={handleAvatarUpload} disabled={avatarUploading}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-body hover:bg-primary-hover disabled:opacity-50">
                      {avatarUploading ? '上传中...' : '确认上传'}
                    </button>
                    <button onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}
                      className="px-3 py-1.5 rounded-lg bg-surface-hover text-xs font-body hover:bg-border">取消</button>
                  </div>
                )}
                <p className="text-xs text-campus-text-tertiary font-body">支持 JPG/PNG，建议 200x200 以上</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold font-display">个人资料</h3>
              {!profileEditing && (
                <button onClick={() => setProfileEditing(true)} className="flex items-center gap-1 text-sm text-primary hover:text-primary-hover font-body"><Edit3 className="w-4 h-4" />编辑</button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium font-body text-campus-text-secondary mb-1">用户名</label>
                <p className="text-sm text-campus-text-primary font-body py-2">{user?.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-campus-text-secondary mb-1">显示名称</label>
                {profileEditing ? (
                  <input type="text" value={profileForm.display_name} onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
                ) : (
                  <p className="text-sm text-campus-text-primary font-body py-2">{profileForm.display_name || user?.displayName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-campus-text-secondary mb-1">邮箱</label>
                {profileEditing ? (
                  <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
                ) : (
                  <p className="text-sm text-campus-text-primary font-body py-2">{profileForm.email || '未设置'}</p>
                )}
              </div>
              {profileEditing && (
                <div className="flex gap-2 pt-2">
                  <button onClick={async () => {
                    try {
                      await authApi.updateProfile(profileForm);
                      toastStore.success('保存成功');
                      setProfileEditing(false);
                      loadUser();
                    } catch { toastStore.error('保存失败'); }
                  }} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-body hover:bg-primary-hover"><Check className="w-4 h-4 inline mr-1" />保存</button>
                  <button onClick={() => setProfileEditing(false)} className="px-4 py-2 rounded-lg bg-surface-hover text-sm font-body hover:bg-border"><X className="w-4 h-4 inline mr-1" />取消</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* OAuth Tab */}
      {activeTab === 'oauth' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold font-display mb-4">账号绑定</h3>
          <p className="text-sm text-campus-text-tertiary mb-6 font-body">绑定第三方账号后，可以使用对应平台快速登录</p>
          <div className="space-y-4">
            {[
              { id: 'weixin', name: '微信', icon: '🟢', color: '#07C160' },
              { id: 'qq', name: 'QQ', icon: '🔵', color: '#12B7F5' },
              { id: 'github', name: 'GitHub', icon: '⚫', color: '#333' },
            ].map(p => {
              const bound = accounts.find(a => a.provider === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-surface-hover">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: p.color + '20' }}>{p.icon}</div>
                    <div>
                      <p className="text-sm font-medium font-body">{p.name}</p>
                      {bound && <p className="text-xs text-campus-text-tertiary font-body">已绑定 · {new Date(bound.binded_at).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  {bound ? (
                    <button onClick={() => handleOAuthUnbind(p.id)} className="px-3 py-1.5 rounded-lg text-xs font-body text-destructive border border-destructive hover:bg-destructive/10 transition-colors">解绑</button>
                  ) : (
                    <button onClick={() => handleOAuthBind(p.id)} className="px-3 py-1.5 rounded-lg text-xs font-body bg-primary text-white hover:bg-primary-hover transition-colors">绑定</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold font-display mb-4">数据导出</h3>
          <p className="text-sm text-campus-text-tertiary mb-6 font-body">导出你的所有数据，包括帖子、评论、收藏等，便于备份和迁移。</p>
          <button onClick={handleExport} disabled={exporting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 font-body">
            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {exporting ? '导出中...' : '导出我的数据'}
          </button>
        </div>
      )}
    </div>
  );
}
