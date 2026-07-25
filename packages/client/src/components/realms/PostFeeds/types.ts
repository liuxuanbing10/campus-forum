/**
 * 帖子类型定义（13 种版式共用）
 */
export interface Post {
  id: number;
  title: string;
  author_name: string;
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  board_name: string;
  is_pinned: number;
  is_favorited: number;
}
