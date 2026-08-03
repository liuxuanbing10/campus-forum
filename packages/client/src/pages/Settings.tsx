import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toastStore } from '../App';
import * as Tabs from '@radix-ui/react-tabs';
import * as Label from '@radix-ui/react-label';
import * as Avatar from '@radix-ui/react-avatar';
import {
  Eye, EyeOff, Edit3, Check, X, Lock, RefreshCw, Upload, Download,
  Link2, Loader2, Palette, Smartphone, User as UserIcon, Mail, Shield,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { REALMS, useThemeStore, type RealmId } from '../stores/theme';
import api, { authApi, oauthApi, exportApi, avatarApi, userDeviceApi } from '../lib/api';
import type { User, OAuthAccount, UserDevice } from '../types/api';
import Skeleton from '../components/Skeleton';
import MetaManager from '../components/MetaManager';
import { DragSort } from '../components/DragSort';
import { formatDate } from '../lib/date';

type TabKey = 'profile' | 'password' | 'oauth' | 'export' | 'appearance' | 'devices';

const TAB_LIST: { value: TabKey; label: string; icon: React.ReactNode }[] = [
  { value: 'profile', label: '个人资料', icon: <UserIcon className="w-3.5 h-3.5" /> },
  { value: 'password', label: '修改密码', icon: <Lock className="w-3.5 h-3.5" /> },
  { value: 'oauth', label: '账号绑定', icon: <Link2 className="w-3.5 h-3.5" /> },
  { value: 'appearance', label: '界面风格', icon: <Palette className="w-3.5 h-3.5" /> },
  { value: 'devices', label: '设备管理', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { value: 'export', label: '数据导出', icon: <Download className="w-3.5 h-3.5" /> },
];

/**
 * 设置页 - 十三境主题
 * 使用 Radix Tabs + Radix Avatar + Radix Label 重构
 */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'appearance') return 'appearance';
    return 'profile';
  });

  return (
    <>
      <MetaManager title="设置 · 十三境" description="个人设置" keywords="设置,校园论坛" ogType="website" />
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold mb-6 text-[var(--ink)]"
          style={{ fontFamily: 'var(--disp)' }}
        >
          设 置
        </motion.h1>

        <Tabs.Root
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabKey)}
          orientation="horizontal"
        >
          {/* Tabs.List - 横向滚动 */}
          <Tabs.List className="flex items-center gap-1 mb-6 overflow-x-auto no-scrollbar pb-1">
            {TAB_LIST.map(t => (
              <Tabs.Trigger
                key={t.value}
                value={t.value}
                className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] whitespace-nowrap transition-colors text-[var(--soft)] hover:text-[var(--ink)] hover:bg-[var(--card)] data-[state=active]:text-[var(--acc)] data-[state=active]:bg-[var(--card)] data-[state=active]:border data-[state=active]:border-[var(--line)]"
              >
                {t.icon}
                <span>{t.label}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* 各 Tab 内容 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Tabs.Content value="profile"><ProfileTab /></Tabs.Content>
              <Tabs.Content value="password"><PasswordTab /></Tabs.Content>
              <Tabs.Content value="oauth"><OAuthTab /></Tabs.Content>
              <Tabs.Content value="appearance"><AppearanceTab /></Tabs.Content>
              <Tabs.Content value="devices"><DevicesTab /></Tabs.Content>
              <Tabs.Content value="export"><ExportTab /></Tabs.Content>
            </motion.div>
          </AnimatePresence>
        </Tabs.Root>
      </div>
    </>
  );
}

// ── 个人资料 ─────────────────────────────────────
function ProfileTab() {
  const fetchUser = useAuthStore(s => s.fetchUser);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ displayName: '', email: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // 保存 File 对象用于 multipart 上传（替代 base64）
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      await fetchUser();
      const userInfo = useAuthStore.getState().user;
      if (userInfo) {
        const { data } = await api.get('/auth/me');
        setUser(data);
        setProfileForm({ displayName: data.displayName, email: data.email || '' });
      }
    } catch {
      toastStore.error('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toastStore.error('图片大小不能超过 5MB');
      return;
    }
    // 保存 File 对象供 multipart 上传使用，同时生成 base64 预览
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true);
    try {
      // 改用 FormData 文件流上传（避免 base64 编码 33% 体积膨胀）
      const { data } = await avatarApi.uploadFile(avatarFile);
      if (data.success) {
        toastStore.success('头像更新成功');
        setAvatarPreview(null);
        setAvatarFile(null);
        loadUser();
      }
    } catch {
      toastStore.error('头像上传失败');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile(profileForm);
      toastStore.success('保存成功');
      setEditing(false);
      loadUser();
    } catch {
      toastStore.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="text" count={1} className="h-8 w-1/4" />
        <Skeleton variant="post" count={2} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头像设置 */}
      <Card>
        <CardHeader icon={<UserIcon className="w-4 h-4" />} title="头像设置" />
        <div className="flex items-center gap-6">
          <Avatar.Root className="w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--line)] inline-flex items-center justify-center shrink-0">
            <Avatar.Fallback className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--g1)]" style={{ background: 'linear-gradient(135deg, var(--acc), var(--acc2))', fontFamily: 'var(--disp)' }}>
              {user?.displayName?.[0] || '?'}
            </Avatar.Fallback>
            {avatarPreview ? (
              <Avatar.Image src={avatarPreview} className="w-full h-full object-cover" alt="预览" />
            ) : user?.avatarUrl ? (
              <Avatar.Image src={user.avatarUrl} className="w-full h-full object-cover" alt="头像" />
            ) : null}
          </Avatar.Root>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--line)] text-[12px] cursor-pointer hover:border-[var(--acc)] transition-colors text-[var(--ink)]">
              <Upload className="w-3.5 h-3.5" />
              选择图片
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            {avatarPreview && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAvatarUpload}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] text-[var(--g1)] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--acc), var(--acc2))' }}
                >
                  {avatarUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {avatarUploading ? '上传中' : '确认上传'}
                </button>
                <button
                  onClick={() => setAvatarPreview(null)}
                  className="px-3 py-1.5 rounded-lg text-[12px] text-[var(--soft)] hover:text-[var(--ink)]"
                >
                  取消
                </button>
              </div>
            )}
            <p className="text-[11px] text-[var(--soft)]">支持 JPG/PNG，建议 200×200 以上，≤5MB</p>
          </div>
        </div>
      </Card>

      {/* 个人资料 */}
      <Card>
        <CardHeader
          icon={<Edit3 className="w-4 h-4" />}
          title="个人资料"
          action={
            !editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-[12px] text-[var(--acc)] hover:underline"
              >
                <Edit3 className="w-3.5 h-3.5" /> 编辑
              </button>
            ) : null
          }
        />
        <div className="space-y-4">
          <Row label="用户名" value={user?.username ?? '-'} />
          <Row
            label="显示名称"
            value={
              editing ? (
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={e => setProfileForm(p => ({ ...p, displayName: e.target.value }))}
                  className="realm-input-flat"
                />
              ) : (
                profileForm.displayName || user?.displayName || '-'
              )
            }
          />
          <Row
            label="邮箱"
            value={
              editing ? (
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                  className="realm-input-flat"
                />
              ) : (
                profileForm.email || '未设置'
              )
            }
          />
          {editing && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-[12px] text-[var(--g1)] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--acc), var(--acc2))' }}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                保存
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setProfileForm({
                    displayName: user?.displayName ?? '',
                    email: user?.email ?? '',
                  });
                }}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-[12px] text-[var(--soft)] hover:text-[var(--ink)] border border-[var(--line)]"
              >
                <X className="w-3 h-3" /> 取消
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── 修改密码 ─────────────────────────────────────
function PasswordTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ cur: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toastStore.error('两次输入的新密码不一致');
      return;
    }
    if (form.newPassword.length < 6) {
      toastStore.error('新密码至少 6 位');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      toastStore.success('密码修改成功');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader icon={<Lock className="w-4 h-4" />} title="修改密码" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          label="当前密码"
          value={form.currentPassword}
          onChange={v => setForm(p => ({ ...p, currentPassword: v }))}
          show={show.cur}
          toggle={() => setShow(s => ({ ...s, cur: !s.cur }))}
        />
        <PasswordField
          label="新密码"
          value={form.newPassword}
          onChange={v => setForm(p => ({ ...p, newPassword: v }))}
          show={show.new}
          toggle={() => setShow(s => ({ ...s, new: !s.new }))}
        />
        <PasswordField
          label="确认新密码"
          value={form.confirmPassword}
          onChange={v => setForm(p => ({ ...p, confirmPassword: v }))}
          show={show.confirm}
          toggle={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] text-[var(--g1)] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--acc), var(--acc2))' }}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
          {loading ? '修改中' : '确认修改'}
        </button>
      </form>
    </Card>
  );
}

// ── OAuth 绑定 ──────────────────────────────────
function OAuthTab() {
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const { data } = await oauthApi.getAccounts();
      setAccounts(data.accounts || []);
    } catch {
      toastStore.error('加载绑定信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async (provider: string) => {
    try {
      const { data } = await api.get(`/auth/oauth/${provider}/bind-url`);
      window.location.href = data.url;
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '获取授权链接失败');
    }
  };

  const handleUnbind = async (provider: string) => {
    if (!confirm(`确定解绑 ${provider} 账号？`)) return;
    try {
      await oauthApi.unbind(provider);
      toastStore.success('解绑成功');
      loadAccounts();
    } catch {
      toastStore.error('解绑失败');
    }
  };

  if (loading) {
    return <Skeleton variant="list" count={3} />;
  }

  const providers = [
    { id: 'weixin', name: '微信', color: '#07C160' },
    { id: 'qq', name: 'QQ', color: '#12B7F5' },
    { id: 'github', name: 'GitHub', color: '#24292f' },
  ];

  return (
    <Card>
      <CardHeader icon={<Link2 className="w-4 h-4" />} title="账号绑定" />
      <p className="text-[12px] text-[var(--soft)] mb-4">绑定第三方账号后，可使用对应平台快速登录</p>
      <div className="space-y-3">
        {providers.map(p => {
          const bound = accounts.find(a => a.provider === p.id);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--line)] bg-[var(--g1)]/40"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${p.color}20` }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[var(--ink)]">{p.name}</p>
                  {bound && (
                    <p className="text-[10px] text-[var(--soft)]">
                      已绑定 · {formatDate(bound.bindedAt)}
                    </p>
                  )}
                </div>
              </div>
              {bound ? (
                <button
                  onClick={() => handleUnbind(p.id)}
                  className="px-3 py-1 rounded-md text-[11px] text-[var(--hot)] border border-[var(--hot)]/40 hover:bg-[var(--hot)]/10 transition-colors"
                >
                  解绑
                </button>
              ) : (
                <button
                  onClick={() => handleBind(p.id)}
                  className="px-3 py-1 rounded-md text-[11px] text-[var(--g1)]"
                  style={{ background: 'linear-gradient(135deg, var(--acc), var(--acc2))' }}
                >
                  绑定
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── 界面风格（十三境选择器） ──────────────────────
function AppearanceTab() {
  const { currentTheme, setTheme, realmOrder, setRealmOrder } = useThemeStore();
  const [dragMode, setDragMode] = useState(false);

  return (
    <Card>
      <CardHeader icon={<Palette className="w-4 h-4" />} title="十三境主题" />
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-[var(--soft)]">
          选择一个境，整站配色、字体、粒子、版式将随之切换
        </p>
        <button
          onClick={() => setDragMode(v => !v)}
          className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-body transition-colors ${dragMode ? 'bg-[var(--acc)] text-white' : 'bg-[var(--line)] text-[var(--soft)] hover:text-[var(--ink)]'}`}
        >
          {dragMode ? '完成排序' : '调整顺序'}
        </button>
      </div>

      {dragMode ? (
        <DragSort
          items={realmOrder}
          getItemId={r => r.id}
          onSort={(newOrder) => setRealmOrder(newOrder.map(r => r.id))}
          renderItem={(r) => (
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${currentTheme === r.id ? 'border-[var(--acc)] bg-[var(--acc)]/5' : 'border-[var(--line)]'}`}>
              <span className="text-lg">{r.emoji}</span>
              <div className="min-w-0">
                <span className="text-[13px] font-medium text-[var(--ink)]" style={{ fontFamily: 'var(--disp)' }}>{r.name}</span>
                <span className="text-[10px] text-[var(--soft)] ml-2">{r.cat}</span>
              </div>
            </div>
          )}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {realmOrder.map(r => {
            const active = currentTheme === r.id;
            return (
              <motion.button
                key={r.id}
                onClick={() => setTheme(r.id as RealmId)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all border ${
                  active
                    ? 'border-[var(--acc)] ring-2 ring-[var(--acc)]/30 bg-[var(--acc)]/5'
                    : 'border-[var(--line)] hover:border-[var(--acc)]/50'
                }`}
              >
                {active && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[var(--g1)] text-[10px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--acc), var(--acc2))' }}
                  >
                    ✓
                  </span>
                )}
                {/* 配色预览 */}
                <div
                  className="w-full h-12 rounded-md mb-1 relative overflow-hidden border border-[var(--line)]"
                  data-theme-preview={r.id}
                  style={{
                    background: `linear-gradient(135deg, var(--g2, #f5f5f5), var(--g1, #fff))`,
                  }}
                >
                  <div
                    className="absolute top-1 left-1 right-1 h-1 rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--acc, #888), var(--acc2, #aaa))' }}
                  />
                  <div className="absolute bottom-1.5 left-1.5 flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--acc, #888)' }} />
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--acc2, #aaa)' }} />
                  </div>
                  <div
                    className="absolute bottom-1.5 right-1.5 text-[8px] text-[var(--soft)]"
                    style={{ fontFamily: 'var(--disp)' }}
                  >
                    {r.seal}
                  </div>
                </div>
                <span
                  className="text-[13px] font-medium text-[var(--ink)]"
                  style={{ fontFamily: 'var(--disp)' }}
                >
                  {r.name}
                </span>
                <span className="text-[10px] text-[var(--soft)] leading-tight">{r.desc}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── 设备管理 ─────────────────────────────────────
function DevicesTab() {
  const [devices, setDevices] = useState<(UserDevice & { isCurrent?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDevices(); }, []);

  const loadDevices = async () => {
    try {
      const { data } = await userDeviceApi.getMyDevices();
      setDevices(data.devices || []);
    } catch {
      toastStore.error('加载设备失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('确定退出该设备的登录状态？')) return;
    try {
      await userDeviceApi.revokeDevice(id);
      toastStore.success('已退出该设备');
      loadDevices();
    } catch {
      toastStore.error('操作失败');
    }
  };

  if (loading) {
    return <Skeleton variant="list" count={3} />;
  }

  return (
    <Card>
      <CardHeader icon={<Smartphone className="w-4 h-4" />} title="我的设备" />
      <p className="text-[12px] text-[var(--soft)] mb-4">
        管理已登录你账号的设备，可强制退出不认识的设备
      </p>
      {devices.length === 0 ? (
        <p className="text-[12px] text-[var(--soft)] text-center py-6">暂无设备数据</p>
      ) : (
        <div className="space-y-2">
          {devices.map(d => (
            <div
              key={d.id}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--line)] bg-[var(--g1)]/40"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-[var(--soft)] shrink-0" />
                  <span className="text-[12px] font-medium text-[var(--ink)] truncate">
                    {d.deviceName || d.deviceId.slice(0, 16)}
                  </span>
                  {d.isCurrent ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-[var(--acc)] bg-[var(--acc)]/15">
                      当前设备
                    </span>
                  ) : d.isActive === 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-[var(--hot)] bg-[var(--hot)]/15">
                      已禁用
                    </span>
                  ) : null}
                </div>
                {d.deviceInfo && (
                  <p className="text-[10px] text-[var(--soft)] mt-1">{d.deviceInfo}</p>
                )}
                <p className="text-[10px] text-[var(--soft)] mt-0.5">
                  最后登录: {d.lastLoginAt ? formatDate(d.lastLoginAt) : '-'}
                </p>
              </div>
              {!d.isCurrent && d.isActive !== 0 && (
                <button
                  onClick={() => handleRevoke(d.id)}
                  className="px-2.5 py-1 rounded-md text-[11px] text-[var(--hot)] border border-[var(--hot)]/40 hover:bg-[var(--hot)]/10 transition-colors shrink-0 ml-2"
                >
                  退出
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── 数据导出 ─────────────────────────────────────
function ExportTab() {
  const [exporting, setExporting] = useState(false);

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
    } catch {
      toastStore.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader icon={<Download className="w-4 h-4" />} title="数据导出" />
      <p className="text-[12px] text-[var(--soft)] mb-4">
        导出你的所有数据，包括帖子、评论、收藏等，便于备份和迁移
      </p>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] text-[var(--g1)] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, var(--acc), var(--acc2))' }}
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {exporting ? '导出中...' : '导出我的数据'}
      </button>
    </Card>
  );
}

// ── 通用子组件 ───────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)]/85 backdrop-blur-md border border-[var(--line)] rounded-xl p-5 shadow-sm">
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-[14px] font-bold text-[var(--ink)]">
        <span className="text-[var(--acc)]">{icon}</span>
        {title}
      </h3>
      {action}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label.Root className="text-[12px] text-[var(--soft)] shrink-0">
        {label}
      </Label.Root>
      <div className="text-[12px] text-[var(--ink)] text-right min-w-0 flex-1">
        {value}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  toggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
}) {
  return (
    <div>
      <Label.Root className="block text-[12px] text-[var(--soft)] mb-1.5">{label}</Label.Root>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="realm-input-flat pr-10"
          required
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--soft)] hover:text-[var(--acc)]"
          aria-label={show ? '隐藏密码' : '显示密码'}
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
