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

export interface OAuthAccount {
  provider: string;
  provider_user_id: string;
  provider_username?: string;
  binded_at: string;
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

export interface ShareInfo {
  title: string;
  url: string;
  description?: string;
}

// ── DB Row types ──

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
