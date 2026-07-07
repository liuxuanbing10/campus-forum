import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { authApi, User, default as api } from '../lib/api';
import { toastStore } from '../App';
import { Eye, EyeOff, User as UserIcon, Mail, Edit3, Check, X, Lock, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    email: '',
  });
  const [profileEditing, setProfileEditing] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchUser = useAuthStore(s => s.fetchUser);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      await fetchUser();
      const userInfo = useAuthStore.getState().user;
      if (userInfo) {
        const { data } = await api.get('/auth/me');
        setUser(data);
        setProfileForm({
          display_name: data.displayName,
          email: data.email || '',
        });
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await authApi.updateProfile({
        display_name: profileForm.display_name || undefined,
        email: profileForm.email || undefined,
      });
      toastStore.success(data.message);
      setUser(data.user);
      setProfileEditing(false);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || '更新失败';
      toastStore.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      const { data } = await authApi.changePassword(passwordForm);
      toastStore.success(data.message);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || '修改失败';
      toastStore.error(errMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-handwrite text-2xl font-bold text-campus-text-primary mb-6">设置</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg font-body transition-all duration-200 ${
            activeTab === 'profile'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface text-campus-text-secondary hover:bg-surface-hover border border-border'
          }`}
        >
          个人资料
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 rounded-lg font-body transition-all duration-200 ${
            activeTab === 'password'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface text-campus-text-secondary hover:bg-surface-hover border border-border'
          }`}
        >
          修改密码
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-campus-text-primary font-body">个人资料</h2>
            {!profileEditing && (
              <button
                onClick={() => setProfileEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:text-primary-hover bg-primary/10 rounded-lg transition-colors font-body"
              >
                <Edit3 className="w-4 h-4" />
                编辑
              </button>
            )}
          </div>

          {user && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-campus-text-tertiary text-sm font-body">用户名</p>
                  <p className="text-lg font-semibold text-campus-text-primary font-body">{user.username}</p>
                </div>
              </div>

              {profileEditing ? (
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
                      昵称
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profileForm.display_name}
                        onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                        className="w-full h-12 pl-4 pr-4 border border-border rounded-lg bg-surface text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="请输入昵称"
                        maxLength={50}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
                      邮箱
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-campus-text-tertiary" />
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full h-12 pl-12 pr-4 border border-border rounded-lg bg-surface text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="请输入邮箱（可选）"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileEditing(false);
                        setProfileForm({
                          display_name: user.displayName,
                          email: user.email || '',
                        });
                      }}
                      disabled={loading}
                      className="flex-1 h-12 px-4 border border-border rounded-lg text-campus-text-secondary font-body hover:bg-surface-hover transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4 inline-block mr-2" />
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-12 px-4 bg-primary text-white rounded-lg font-body hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 inline-block mr-2" />
                      {loading ? '保存中...' : '保存'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-campus-text-tertiary text-sm font-body">昵称</p>
                    <p className="text-campus-text-primary font-body">{user.displayName}</p>
                  </div>
                  <div>
                    <p className="text-campus-text-tertiary text-sm font-body">邮箱</p>
                    <p className="text-campus-text-primary font-body">{user.email || '未设置'}</p>
                  </div>
                  <div>
                    <p className="text-campus-text-tertiary text-sm font-body">注册时间</p>
                    <p className="text-campus-text-primary font-body">{user.createdAt || user.created_at}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-campus-text-primary font-body">修改密码</h2>
            <RefreshCw className="w-5 h-5 text-campus-text-tertiary" />
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
                当前密码
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-campus-text-tertiary" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full h-12 pl-12 pr-12 border border-border rounded-lg bg-surface text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="请输入当前密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                  aria-label={showCurrentPassword ? '隐藏密码' : '显示密码'}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5 text-campus-text-tertiary" />
                  ) : (
                    <Eye className="w-5 h-5 text-campus-text-tertiary" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
                新密码
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-campus-text-tertiary" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full h-12 pl-12 pr-12 border border-border rounded-lg bg-surface text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="请输入新密码（至少6位）"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                  aria-label={showNewPassword ? '隐藏密码' : '显示密码'}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5 text-campus-text-tertiary" />
                  ) : (
                    <Eye className="w-5 h-5 text-campus-text-tertiary" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
                确认新密码
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-campus-text-tertiary" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full h-12 pl-12 pr-12 border border-border rounded-lg bg-surface text-campus-text-primary text-base font-body outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="请再次输入新密码"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                  aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-campus-text-tertiary" />
                  ) : (
                    <Eye className="w-5 h-5 text-campus-text-tertiary" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full h-12 bg-primary text-white rounded-lg font-body hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {passwordLoading ? '修改中...' : '修改密码'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}