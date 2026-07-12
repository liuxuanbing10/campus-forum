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
  display_name: string;
  avatar_url: string | null;
  role: string;
  is_banned: number;
  created_at: string;
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
