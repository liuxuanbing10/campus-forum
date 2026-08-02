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

export interface PostStats {
  view_count: number;
  like_count: number;
  comment_count: number;
  favorite_count: number;
}

export interface PostVersion {
  id: number;
  post_id: number;
  title: string;
  content: string;
  editor_name: string;
  created_at: string;
}

export interface PendingPost {
  id: number;
  title: string;
  author_name: string;
  created_at: string;
  status: string;
}

// ── DB Row types ──

export interface BoardRow {
  id: number;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_private?: number;
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

export interface CommentRow {
  id: number;
  content: string;
  author_id: number;
  post_id: number;
  parent_id: number | null;
}
