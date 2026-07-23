import type { FastifyInstance } from 'fastify';

// Plugin lifecycle states
export type PluginState = 'pending' | 'loading' | 'active' | 'failed' | 'disabled';

// Plugin manifest - defines metadata
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];  // Other plugin names this depends on
}

// Plugin context - injected into plugin's apply function
export interface PluginContext {
  // Fastify instance for adding routes
  app: FastifyInstance;

  // Database access
  db: DatabaseAdapter;

  // Event bus for inter-plugin communication
  events: EventBus;

  // Logger
  logger: Logger;

  // Config reader
  config: ConfigReader;

  // Register another plugin's service
  getService<T>(name: string): T;
}

// Plugin definition
export interface Plugin {
  manifest: PluginManifest;
  apply: (ctx: PluginContext) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

export interface RunResult {
  lastInsertRowid: number | bigint;
  changes: number;
}

// Database adapter interface（异步：适配本地 SQLite 和远程 Turso）
export interface DatabaseAdapter {
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<RunResult>;
  exec(sql: string): Promise<void>;
  prepare<T>(sql: string): PreparedStatement<T>;
}

export interface PreparedStatement<T> {
  get(...params: unknown[]): Promise<T | undefined>;
  all(...params: unknown[]): Promise<T[]>;
  run(...params: unknown[]): Promise<RunResult>;
}

// Event bus interface
export interface EventBus {
  emit(event: string, ...args: unknown[]): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

// Logger interface
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// Config reader interface
export interface ConfigReader {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: unknown): void;
}

// ===== Shared Data Types (used by client and server) =====

export interface User {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  avatar_url?: string;
  avatarUrl?: string;
  role: string;
  is_banned: number;
  isBanned: boolean;
  isAdmin: boolean;
  created_at: string;
  createdAt: string;
}

export interface UpdateProfileData {
  display_name?: string;
  email?: string;
  avatar_url?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  board_id: number;
  board_name?: string;
  author_id: number;
  author_name: string;
  avatar_url?: string;
  is_anonymous: number;
  is_pinned: number;
  is_private: number;
  images: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  favorite_count?: number;
  is_favorited: number;
  my_vote: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: number;
  title: string;
  content: string;
  board_id: number;
  board_name: string;
  author_id: number;
  author_name: string;
  is_anonymous: number;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  highlight: {
    title?: string;
    content?: string;
  };
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  content: string;
  related_id: number | null;
  related_type: string | null;
  is_read: number;
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_banned: number;
  role: string;
  created_at: string;
  device_code: string | null;
  post_count: number;
  comment_count: number;
}

export interface ShareInfo {
  title: string;
  url: string;
  description?: string;
}

export interface PostStats {
  view_count: number;
  like_count: number;
  comment_count: number;
  favorite_count: number;
}

export interface TeamCategory {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  avatar: string | null;
  is_public: number;
  creator_id: number;
  max_members: number;
  category_id: number | null;
  invite_code: string | null;
  hide_members: number;
  member_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
  myRole: string | null;
  myApplicationStatus: string | null;
  isFavorited: boolean;
  role?: string;
}

export interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: string;
  status: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  joined_at: string;
}

export interface TeamAnnouncement {
  id: number;
  team_id: number;
  title: string;
  content: string;
  author_id: number;
  is_pinned: number;
  username: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamPost {
  id: number;
  title: string;
  content: string;
  author_id: number;
  board_id: number;
  is_anonymous: number;
  is_pinned: number;
  is_private: number;
  view_count: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface TeamContentPost {
  id: number;
  team_id: number;
  title: string;
  content: string;
  author_id: number;
  is_pinned: number;
  images: string[];
  username: string;
  display_name?: string;
  avatar_url?: string;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamFile {
  id: number;
  team_id: number;
  author_id: number;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  username: string;
  display_name?: string;
  created_at: string;
  storage?: string;
  oss_key?: string;
}

export interface TeamContentComment {
  id: number;
  post_id: number;
  author_id: number;
  content: string;
  created_at: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface MyTeamsResponse {
  teams: Team[];
  owned: Team[];
  adminOf: Team[];
  memberOf: Team[];
}

export interface CreateTeamData {
  name: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  maxMembers?: number;
  categoryId?: number;
  hideMembers?: boolean;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  maxMembers?: number;
  categoryId?: number | null;
  hideMembers?: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  avatar_url?: string;
  role: string;
  is_banned: number;
  created_at: string;
  post_count: number;
  comment_count: number;
  follower_count: number;
  following_count: number;
  points: number;
  level: string;
  is_following: number;
}

export interface UserPost {
  id: number;
  title: string;
  board_name: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
}

export interface UserComment {
  id: number;
  content: string;
  post_id: number;
  post_title: string;
  created_at: string;
}

export interface FollowStatus {
  isFollowing: boolean;
}

export interface Conversation {
  id: number;
  other_user_id: number;
  other_username: string;
  other_avatar?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  is_read?: number;
  sender_name?: string;
  sender_avatar?: string;
}

export interface ReportData {
  target_type: 'post' | 'comment';
  target_id: number;
  reason: string;
  description?: string;
}

export interface OAuthAccount {
  provider: string;
  provider_user_id: string;
  provider_username?: string;
  binded_at: string;
}

export interface PendingPost {
  id: number;
  title: string;
  author_name: string;
  created_at: string;
  status: string;
}

export interface SensitiveWord {
  id: number;
  word: string;
  replacement: string;
  created_at: string;
}

export interface AdminReport {
  id: number;
  target_type: string;
  target_id: number;
  reporter_name: string;
  reason: string;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number;
  details: string;
  created_at: string;
}

export interface PostVersion {
  id: number;
  post_id: number;
  title: string;
  content: string;
  editor_name: string;
  created_at: string;
}

export interface CaptchaData {
  captchaId: string;
  imageBase64?: string;
  question?: string;
}

export interface AdminStats {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    totalTeams: number;
    totalBoards: number;
  };
  today: {
    users: number;
    posts: number;
    comments: number;
  };
  userGrowth: { date: string; count: number }[];
  postTrend: { date: string; count: number }[];
  boardDist: { name: string; count: number }[];
  teamRanking: { name: string; member_count: number; post_count: number }[];
  activeUsers: { username: string; display_name: string; points: number; post_count: number }[];
}

export interface DeviceBlacklistEntry {
  id: number;
  device_id: string;
  device_name?: string;
  reason?: string;
  created_by?: number;
  created_at: string;
}

export interface UserDevice {
  id: number;
  user_id: number;
  device_id: string;
  device_name?: string;
  device_info?: string;
  is_active: number;
  last_login_at: string;
  created_at: string;
}

// ── 成就系统类型 ──────────────────────────────

export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;                // emoji
  category: string;
  points: number;              // 成就积分奖励
  condition_desc: string;      // 解锁条件说明
  sort_order: number;
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
  achievement?: Achievement;
}

// ── 角色权限系统 ──────────────────────────────

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
 * 调用: can(user.role, PERMISSIONS.manageUsers)
 */
export const PERMISSIONS = {
  manageUsers: 'superadmin',
  manageContent: 'admin',
  viewAdminPanel: 'admin',
  manageAllTeams: 'admin',
  modifySite: 'superadmin',
  appointAdmin: 'superadmin',
} as const;

// ── 插件共享类型 ──────────────────────────────

export interface BoardRow {
  id: number;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  post_count?: number;
}

export interface PostRow {
  id: number;
  title: string;
  content: string;
  author_id: number;
  board_id: number;
  is_anonymous: number;
  created_at: string;
}

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  device_code: string | null;
  is_admin: number;
  email: string | null;
  avatar_url: string | null;
  role: string;
  is_banned: number;
  banned_until: string | null;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: number;
  content: string;
  author_id: number;
  post_id: number;
  parent_id: number | null;
}

export interface TeamRow {
  id: number;
  name: string;
  description: string;
  avatar: string | null;
  is_public: number;
  creator_id: number;
  max_members: number;
  category_id: number | null;
  invite_code: string;
  hide_members: number;
  member_count?: number;
  post_count?: number;
}
