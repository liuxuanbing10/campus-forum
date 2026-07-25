import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import * as Label from '@radix-ui/react-label';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';
import { useRealm } from '../components/realms/RealmProvider';
import MetaManager from '../components/MetaManager';

// ── 表单校验 Schema ──────────────────────────────
const loginSchema = z.object({
  username: z
    .string()
    .min(2, '用户名至少 2 个字符')
    .max(32, '用户名最多 32 个字符')
    .regex(/^[a-zA-Z0-9_\-]+$/, '只允许字母、数字、下划线、连字符'),
  password: z
    .string()
    .min(6, '密码至少 6 位')
    .max(128, '密码最多 128 位'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * 登录页 - 十三境主题
 * - react-hook-form + zod 校验
 * - sonner 替代旧 toastStore
 * - Radix Label + 自定义输入框
 * - framer-motion 入场动画
 */
export default function LoginPage() {
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const { realm } = useRealm();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.username, values.password);
      toast.success('登录成功，欢迎回来', { duration: 2000 });
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || '登录失败';
      toast.error(msg, { duration: 3000 });
    }
  };

  const handleOAuth = (provider: string) => async () => {
    try {
      const { data } = await api.get(`/auth/oauth/${provider}/url`);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.response?.data?.error || '获取授权链接失败');
    }
  };

  return (
    <>
      <MetaManager
        title={`登录 · ${realm.name}`}
        description="登录校园论坛，开启十三境之旅"
        keywords="登录,校园论坛,十三境"
        ogType="website"
      />

      <div className="relative min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-10">
        {/* 背景光晕 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden
          style={{
            background:
              'radial-gradient(60% 50% at 50% 30%, var(--glow, transparent) 0%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 0.8, 0.28, 1] }}
          className="relative w-full max-w-md"
        >
          <div className="relative bg-[var(--card)]/85 backdrop-blur-xl border border-[var(--line)] rounded-2xl p-8 sm:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
            {/* 顶部装饰条 */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--acc), var(--acc2), transparent)',
              }}
              aria-hidden
            />

            {/* 站眉 */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="block w-10 h-px bg-[var(--line)]" />
              <Sparkles className="w-3.5 h-3.5 text-[var(--acc)]" />
              <span
                className="text-[11px] tracking-[0.3em] text-[var(--soft)] uppercase"
                style={{ fontFamily: 'var(--disp)' }}
              >
                {realm.seal}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[var(--acc)]" />
              <span className="block w-10 h-px bg-[var(--line)]" />
            </div>

            <div className="text-center mb-8">
              <h1
                className="text-3xl sm:text-4xl font-bold text-[var(--ink)]"
                style={{ fontFamily: 'var(--disp)' }}
              >
                欢迎回来
              </h1>
              <p className="text-[12px] text-[var(--soft)] mt-2 tracking-wide">
                登录账号，续写{realm.name}之卷
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {/* 用户名 */}
              <Field
                label="用户名"
                error={errors.username?.message}
                icon={<User className="w-4 h-4" />}
              >
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="请输入用户名"
                  className="realm-input"
                  {...register('username')}
                />
              </Field>

              {/* 密码 */}
              <Field
                label="密码"
                error={errors.password?.message}
                icon={<Lock className="w-4 h-4" />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--soft)] hover:text-[var(--acc)] hover:bg-[var(--g1)]/60 transition-colors"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  className="realm-input pr-12"
                  {...register('password')}
                />
              </Field>

              {/* 忘记密码 */}
              <div className="flex justify-end -mt-2">
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[var(--soft)] hover:text-[var(--acc)] transition-colors"
                >
                  忘记密码？
                </Link>
              </div>

              {/* 提交按钮 */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="relative w-full h-11 rounded-xl font-medium text-[var(--g1)] overflow-hidden transition-shadow disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_20px_-6px_var(--glow,rgba(0,0,0,0.3))]"
                style={{
                  background:
                    'linear-gradient(135deg, var(--acc), var(--acc2))',
                  fontFamily: 'var(--disp)',
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-sm tracking-widest">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      登录中
                    </>
                  ) : (
                    <>
                      登 录
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </span>
              </motion.button>

              {/* 第三方登录 */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--line)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[var(--card)] px-3 text-[10px] tracking-[0.2em] text-[var(--soft)] uppercase">
                    或使用
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <OAuthButton provider="weixin" label="微信" color="#07C160" onClick={handleOAuth('weixin')} />
                <OAuthButton provider="qq" label="QQ" color="#12B7F5" onClick={handleOAuth('qq')} />
                <OAuthButton provider="github" label="GitHub" color="#24292f" onClick={handleOAuth('github')} />
              </div>

              {/* 注册引导 */}
              <p className="text-center text-[12px] text-[var(--soft)] mt-4">
                还没有账号？{' '}
                <Link
                  to="/register"
                  className="text-[var(--acc)] font-medium hover:underline"
                >
                  立即注册
                </Link>
              </p>
            </form>

            {/* 页脚题跋 */}
            <div
              className="mt-8 pt-5 border-t border-[var(--line)] text-center"
              aria-hidden
            >
              <p
                className="text-[11px] text-[var(--soft)] italic"
                style={{ fontFamily: 'var(--disp)' }}
              >
                {realm.sub}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .realm-input {
          width: 100%;
          height: 2.75rem;
          padding-left: 2.5rem;
          padding-right: 1rem;
          background: var(--g1, transparent);
          border: 1px solid var(--line);
          border-radius: 0.625rem;
          color: var(--ink);
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .realm-input::placeholder { color: var(--soft); }
        .realm-input:focus {
          border-color: var(--acc);
          box-shadow: 0 0 0 3px var(--glow, rgba(0,0,0,0.08));
        }
      `}</style>
    </>
  );
}

// ── 子组件 ───────────────────────────────────────
function Field({
  label,
  error,
  icon,
  trailing,
  children,
}: {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label.Root className="block text-[12px] font-medium text-[var(--soft)] mb-1.5 tracking-wide">
        {label}
      </Label.Root>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--soft)] pointer-events-none">
            {icon}
          </span>
        )}
        {children}
        {trailing}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-[var(--hot)] mt-1.5 ml-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

function OAuthButton({
  label,
  color,
  onClick,
}: {
  provider: string;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center justify-center gap-1.5 h-10 rounded-xl border border-[var(--line)] text-[12px] text-[var(--ink)] hover:border-[var(--acc)] transition-colors"
      style={{ backgroundColor: `${color}10` }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </motion.button>
  );
}
