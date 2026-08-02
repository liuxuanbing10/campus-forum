/**
 * 帖子类型定义（13 种版式共用）
 */
export interface Post {
  id: number;
  title: string;
  authorName: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  boardName: string;
  isPinned: number;
  isFavorited: number;
}
