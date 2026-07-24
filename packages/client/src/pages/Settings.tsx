import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import api, { authApi, oauthApi, exportApi, avatarApi, userDeviceApi } from '../lib/api';
import type { User, OAuthAccount, UserDevice } from '@campus-forum/core';
import { toastStore } from '../App';
import { Eye, EyeOff, User as UserIcon, Mail, Edit3, Check, X, Lock, RefreshCw, Upload, Download, Link2, Unlink, Loader2, Palette, Smartphone } from 'lucide-react';
import { THEMES, useThemeStore } from '../stores/theme';
import Skeleton from '../components/Skeleton';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'oauth' | 'export' | 'appearance' | 'devices'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'appearance') return 'appearance';
    return 'profile';
  });
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

  // 处理 OAuth 绑定回调结果
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('msg');
    if (msg === 'bind_ok') toastStore.success('GitHub 绑定成功');
    else if (msg === 'already_bound') toastStore.info('该 GitHub 账号已绑定');
    else if (msg === 'bound_by_other') toastStore.error('该 GitHub 账号已被其他用户绑定');
  }, []);

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

  const handleOAuthBind = async (provider: string) => {
    try {
      const { data } = await api.get(`/auth/oauth/${provider}/bind-url`);
      window.location.href = data.url;
    } catch (err: any) {
      const msg = err.response?.data?.error || '获取授权链接失败';
      toastStore.error(msg);
    }
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
        <button onClick={() => setActiveTab('appearance')} className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${activeTab === 'appearance' ? 'bg-primary text-white' : 'text-campus-text-secondary hover:bg-surface-hover'}`}>界面风格</button>
        <button onClick={() => setActiveTab('devices')} className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${activeTab === 'devices' ? 'bg-primary text-white' : 'text-campus-text-secondary hover:bg-surface-hover'}`}>设备管理</button>
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

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold font-display mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" /> 界面风格
          </h3>
          <p className="text-sm text-campus-text-tertiary mb-6 font-body">选择一个你喜欢的主题，改变论坛的整体视觉效果。</p>
          <AppearancePicker />
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === 'devices' && <DevicesTab />}
    </div>
  );
}

function DevicesTab() {
  const [devices, setDevices] = useState<(UserDevice & { is_current?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDevices(); }, []);

  const loadDevices = async () => {
    try {
      const { data } = await userDeviceApi.getMyDevices();
      setDevices(data.devices || []);
    } catch { toastStore.error('加载设备失败'); }
    finally { setLoading(false); }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('确定退出该设备的登录状态？')) return;
    try {
      await userDeviceApi.revokeDevice(id);
      toastStore.success('已退出该设备');
      loadDevices();
    } catch { toastStore.error('操作失败'); }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <Skeleton variant="text" count={1} className="h-8 w-1/4" />
      <Skeleton variant="list" count={4} />
    </div>
  );

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold font-display mb-2 flex items-center gap-2">
        <Smartphone className="w-5 h-5" /> 我的设备
      </h3>
      <p className="text-sm text-campus-text-tertiary mb-6 font-body">管理已登录你账号的设备，可以强制退出不认识的设备。</p>
      {devices.length === 0 ? (
        <p className="text-sm text-campus-text-tertiary font-body">暂无设备数据</p>
      ) : (
        <div className="space-y-3">
          {devices.map(d => (
            <div key={d.id} className="flex items-center justify-between p-4 rounded-lg bg-surface-hover">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-campus-text-tertiary shrink-0" />
                  <span className="text-sm font-medium font-body truncate">{d.device_name || d.device_id.slice(0, 16)}</span>
                  {d.is_current ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-600 font-body">当前设备</span>
                  ) : d.is_active === 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-body">已禁用</span>
                  ) : null}
                </div>
                {d.device_info && <p className="text-xs text-campus-text-tertiary mt-1 font-body">{d.device_info}</p>}
                <p className="text-xs text-campus-text-tertiary mt-0.5 font-body">最后登录: {d.last_login_at ? new Date(d.last_login_at).toLocaleString() : '-'}</p>
              </div>
              {!d.is_current && d.is_active !== 0 && (
                <button onClick={() => handleRevoke(d.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-body text-destructive border border-destructive hover:bg-destructive/10 transition-colors shrink-0 ml-3">
                  退出
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppearancePicker() {
  const { currentTheme, setTheme } = useThemeStore();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {THEMES.map((t) => {
        const active = currentTheme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all border ${
              active
                ? 'ring-2 ring-primary border-primary bg-primary/5'
                : 'border-border hover:bg-surface-hover'
            }`}
          >
            {active && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center shadow">✓</span>
            )}
            <span className="text-2xl">{t.emoji}</span>
            <span className="text-sm font-medium font-body text-campus-text-primary">{t.name}</span>
            <span className="text-[11px] text-campus-text-tertiary font-body leading-tight">{t.description}</span>
            <div className="flex gap-1 mt-1">
              <span className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: t.colors.primary }} />
              <span className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: t.colors.surface }} />
              <span className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: t.colors.bg }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}