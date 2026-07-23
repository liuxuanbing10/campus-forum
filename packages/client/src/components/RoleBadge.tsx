import { Crown, Shield, User, Ban } from 'lucide-react';

const ROLE_CONFIG: Record<string, { icon: typeof Crown; label: string; color: string }> = {
  superadmin: { icon: Crown, label: '最高管理员', color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' },
  admin:      { icon: Shield, label: '共创者',     color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
  user:       { icon: User,   label: '一般用户',   color: 'text-gray-500 bg-gray-50 dark:bg-gray-500/10' },
  banned:     { icon: Ban,    label: '黑名单',     color: 'text-red-500 bg-red-50 dark:bg-red-500/10' },
};

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'xs';
}

export default function RoleBadge({ role, size = 'xs' }: RoleBadgeProps) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  const Icon = cfg.icon;
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[11px] gap-1' : 'px-1 py-0.5 text-[10px] gap-0.5';
  const iconSize = size === 'sm' ? 12 : 10;

  if (role === 'user') return null; // 一般用户不显示徽章

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${cfg.color}`}>
      <Icon size={iconSize} />
      <span>{cfg.label}</span>
    </span>
  );
}
