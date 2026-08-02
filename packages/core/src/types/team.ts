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

// ── DB Row types ──

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

export interface MemberRow {
  id: number;
  team_id: number;
  user_id: number;
  role: string;
  status: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  joined_at?: string;
}

export interface AnnouncementRow {
  id: number;
  team_id: number;
  title: string;
  content: string;
  author_id: number;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}
