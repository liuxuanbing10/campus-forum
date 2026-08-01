import { Link } from 'react-router';
import { Post } from './types';

interface Props {
  post: Post;
  variant?: 'default' | 'compact' | 'ghost';
}

/**
 * 通用帖子卡片 - 各版式共用
 * 不同 variant 适配不同版式
 */
export default function PostCard({ post, variant = 'default' }: Props) {
  const url = `/post/${post.id}`;

  if (variant === 'compact') {
    return (
      <Link
        to={url}
        className="block py-2 px-3 rounded-md hover:bg-[var(--line)] transition-colors"
      >
        <div className="text-[13px] text-[var(--ink)] truncate font-medium">
          {post.is_pinned ? '📌 ' : ''}{post.title}
        </div>
        <div className="text-[10px] text-[var(--soft)] mt-0.5 flex items-center gap-2">
          <span>{post.author_name}</span>
          <span>·</span>
          <span>{post.board_name}</span>
        </div>
      </Link>
    );
  }

  if (variant === 'ghost') {
    return (
      <Link
        to={url}
        className="block py-3 border-b border-[var(--line)] hover:pl-2 transition-all"
      >
        <div className="text-[14px] text-[var(--ink)] font-medium leading-snug">
          {post.is_pinned ? '📌 ' : ''}{post.title}
        </div>
        <div className="text-[11px] text-[var(--soft)] mt-1 flex items-center gap-3">
          <span>{post.author_name}</span>
          <span>{post.board_name}</span>
          <span className="tabular-nums">浏览 {post.view_count}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={url}
      className="block p-3 rounded-lg border border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)] hover:shadow-card transition-all group"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-[var(--ink)] leading-snug group-hover:text-[var(--acc)] transition-colors">
            {post.is_pinned ? '📌 ' : ''}{post.title}
          </div>
          <div className="text-[11px] text-[var(--soft)] mt-1.5 flex items-center flex-wrap gap-x-2.5 gap-y-1">
            <span>作者 {post.author_name}</span>
            <span>·</span>
            <span>{post.board_name}</span>
            <span>·</span>
            <span className="tabular-nums">浏览 {post.view_count}</span>
            <span>·</span>
            <span className="tabular-nums">赞 {post.like_count}</span>
            <span>·</span>
            <span className="tabular-nums">评 {post.comment_count}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
