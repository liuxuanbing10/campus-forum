import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { toastStore } from '../App';
import { ArrowLeft, Mail, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';

type Step = 'email' | 'code' | 'success';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState('');

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      toastStore.success(res.data.message);
      if (res.data.token) setToken(res.data.token);
      if (res.data.devCode) {
        setDevCode(res.data.devCode);
        toastStore.info(`开发模式验证码：${res.data.devCode}`);
      }
      setStep('code');
    } catch (err: any) {
      const msg = err.response?.data?.error || '发送验证码失败';
      toastStore.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toastStore.error('密码长度不能少于 6 位');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword(token, code, newPassword);
      toastStore.success(res.data.message);
      setStep('success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.error || '重置失败';
      toastStore.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="w-full max-w-md bg-surface rounded-xl p-8 sm:p-10 shadow-card border border-border">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-campus-text-tertiary hover:text-primary transition-colors mb-6 font-body">
          <ArrowLeft className="w-4 h-4" /> 返回登录
        </Link>

        {step === 'email' && (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold font-display">找回密码</h2>
              <p className="text-sm text-campus-text-tertiary mt-2 font-body">输入注册邮箱，我们将发送验证码</p>
            </div>
            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">邮箱地址</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 px-4 border border-border rounded-lg bg-surface text-campus-text-primary font-body outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="请输入注册邮箱"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full font-body">
                {loading ? '发送中...' : '发送验证码'}
              </button>
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold font-display">输入验证码</h2>
              <p className="text-sm text-campus-text-tertiary mt-2 font-body">验证码已发送至 {email}</p>
              {devCode && (
                <p className="text-xs text-amber-500 mt-1 font-body">开发模式验证码：{devCode}</p>
              )}
            </div>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">验证码</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full h-12 px-4 border border-border rounded-lg bg-surface text-campus-text-primary font-body outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-center text-lg tracking-widest"
                  placeholder="6位验证码"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">新密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full h-12 pl-4 pr-12 border border-border rounded-lg bg-surface text-campus-text-primary font-body outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="至少6位新密码"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5">
                    {showPassword ? <EyeOff className="w-5 h-5 text-campus-text-tertiary" /> : <Eye className="w-5 h-5 text-campus-text-tertiary" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full font-body">
                {loading ? '重置中...' : '重置密码'}
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold font-display">密码重置成功</h2>
            <p className="text-sm text-campus-text-tertiary mt-2 font-body">2秒后自动跳转到登录页...</p>
          </div>
        )}
      </div>
    </div>
  );
}
