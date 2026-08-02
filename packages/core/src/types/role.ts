export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user',
  BANNED: 'banned',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** 角色中文名 */
export const ROLE_NAMES: Record<Role, string> = {
  superadmin: '最高管理员',
  admin: '共创者',
  user: '一般用户',
  banned: '黑名单用户',
};

/** 角色等级（数值越大权限越高） */
export const ROLE_LEVEL: Record<Role, number> = {
  superadmin: 100,
  admin: 50,
  user: 10,
  banned: 0,
};

/**
 * 权限检查：source 是否拥有不低于 target 的权限
 */
export function hasPermission(source: string, target: string): boolean {
  const s = ROLE_LEVEL[source as Role] ?? 0;
  const t = ROLE_LEVEL[target as Role] ?? 0;
  return s >= t;
}

/**
 * 权限标识符常量
 */
export const PERMISSIONS = {
  manageUsers: 'superadmin',
  manageContent: 'admin',
  viewAdminPanel: 'admin',
  manageAllTeams: 'admin',
  modifySite: 'superadmin',
  appointAdmin: 'superadmin',
} as const;
