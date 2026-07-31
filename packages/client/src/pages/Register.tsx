import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toastStore } from '../App';
import {
  Eye, EyeOff, User, Lock, Loader2, ArrowRight, Sparkles, ShieldCheck, KeyRound,
} from 'lucide-react';
import * as Label from '@radix-ui/react-label';
import * as Progress from '@radix-ui/react-progress';
import { useAuthStore } from '../stores/auth';
import { useRealm } from '../components/realms/RealmProvider';
import MetaManager from '../components/MetaManager';

// ── 表单校验 Schema ──────────────────────────────
const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, '用户名至少 3 个字符')
      .max(32, '用户名最多 32 个字符')
      .regex(/^[a-zA-Z0-9_\-]+$/, '只允许字母、数字、下划线、连字符'),
    password: z
      .string()
      .min(6, '密码至少 6 位')
      .max(128, '密码最多 128 位')
      .regex(/[a-zA-Z]/, '需包含字母')
      .regex(/[0-9]/, '需包含数字'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── 密码强度计算 ─────────────────────────────────
function passwordStrength(pwd: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pwd) return { score: 0, label: '未输入' };
  let s = 0;
  if (pwd.length >= 6) s++;
  if (pwd.length >= 10) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) s++;
  const labels = ['太弱', '较弱', '中等', '较强', '极强'];
  return { score: s as 0 | 1 | 2 | 3 | 4, label: labels[s] };
}

/**
 * 注册页 - 十三境主题
 * - react-hook-form + zod 校验
 * - 密码强度指示器（Radix Progress）
 * - toast
 * - framer-motion 入场动画
 */
export default function RegisterPage() {
  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();
  const { realm } = useRealm();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  const pwd = watch('password') ?? '';
  const strength = passwordStrength(pwd);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await register(values.username, values.password, values.confirmPassword);
      toastStore.success('注册成功，欢迎加入十三境', 2200);
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || '注册失败';
      toastStore.error(msg, 3000);
    }
  };

  // 强度颜色
  const strengthColor = ['#d1d5db', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength.score];

  return (
    <>
      <MetaManager
        title={`注册 · ${realm.name}`}
        description="加入校园论坛，开启十三境之旅"
        keywords="注册,校园论坛,十三境"
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
                缘起
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[var(--acc)]" />
              <span className="block w-10 h-px bg-[var(--line)]" />
            </div>

            <div className="text-center mb-8">
              <h1
                className="text-3xl sm:text-4xl font-bold text-[var(--ink)]"
                style={{ fontFamily: 'var(--disp)' }}
              >
                加入我们
              </h1>
              <p className="text-[12px] text-[var(--soft)] mt-2 tracking-wide">
                创建账号，开启{realm.name}之旅
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {/* 用户名 */}
              <Field
                label="用户名"
                error={errors.username?.message}
                icon={<User className="w-4 h-4" />}
                hint="3-32 位字母、数字、下划线、连字符"
              >
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="给自己取一个独特的名字"
                  className="realm-input"
                  {...registerField('username')}
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
                  autoComplete="new-password"
                  placeholder="至少 6 位，包含字母和数字"
                  className="realm-input pr-12"
                  {...registerField('password')}
                />
              </Field>

              {/* 密码强度 */}
              {pwd && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="-mt-2 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--soft)]">密码强度</span>
                    <span style={{ color: strengthColor }} className="font-medium">
                      {strength.label}
                    </span>
                  </div>
                  <Progress.Root
                    className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]"
                    value={strength.score * 25}
                  >
                    <Progress.Indicator
                      className="h-full w-full transition-all duration-500"
                      style={{
                        transform: `translateX(-${100 - strength.score * 25}%)`,
                        backgroundColor: strengthColor,
                      }}
                    />
                  </Progress.Root>
                </motion.div>
              )}

              {/* 确认密码 */}
              <Field
                label="确认密码"
                error={errors.confirmPassword?.message}
                icon={<KeyRound className="w-4 h-4" />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--soft)] hover:text-[var(--acc)] hover:bg-[var(--g1)]/60 transition-colors"
                    aria-label={showConfirm ? '隐藏密码' : '显示密码'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              >
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="再次输入密码"
                  className="realm-input pr-12"
                  {...registerField('confirmPassword')}
                />
              </Field>

              {/* 设备绑定提示 */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--g1)]/50 border border-[var(--line)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--acc)] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[var(--soft)] leading-relaxed">
                  注册将自动绑定当前设备识别码，每台设备仅可注册一个账号。
                </p>
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
                      注册中
                    </>
                  ) : (
                    <>
                      注 册
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </span>
              </motion.button>

              {/* 登录引导 */}
              <p className="text-center text-[12px] text-[var(--soft)] mt-4">
                已有账号？{' '}
                <Link
                  to="/login"
                  className="text-[var(--acc)] font-medium hover:underline"
                >
                  立即登录
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
                每一段旅程，始于第一步
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
  hint,
  children,
}: {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  hint?: string;
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
      {hint && !error && (
        <p className="text-[10px] text-[var(--soft)] mt-1 ml-1">{hint}</p>
      )}
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
