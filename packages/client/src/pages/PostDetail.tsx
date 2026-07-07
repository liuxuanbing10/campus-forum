import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import api, { postsApi, PostStats } from '../lib/api';
import { toastStore } from '../App';
import { ArrowLeft, Eye, ThumbsUp, Heart, MessageCircle, Edit3, Trash2, X, Share2, Copy, Check, Lock, Unlock, Pin, PinOff } from 'lucide-react';

interface PostDetail {
  id: number; title: string; content: string; board_id: number; board_name: string;
  is_anonymous: number; is_pinned: number; is_private: number; images: string[];
  author_name: string; author_id: number; created_at: string; updated_at: string;
  like_count: number; comment_count: number; is_favorited: number; my_vote: number;
  view_count: number;
}

interface Comment {
  id: number; content: string; post_id: number; parent_id: number | null;
  is_anonymous: number; created_at: string; author_name: string;
  like_count: number;
}

function CommentItem({ comment, allComments, user, onReply, onDelete, depth }: {
  comment: Comment;
  allComments: Comment[];
  user: any;
  onReply: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  depth: number;
}) {
  const children = allComments.filter(c => c.parent_id === comment.id);
  return (
    <div className={`card ${depth > 0 ? 'ml-4 mt-3 pl-4 border-l-2 border-border' : ''}`}>
      <div className="flex items-center justify-between text-sm text-campus-text-tertiary mb-2 font-body">
        <span className="font-medium text-campus-text-secondary">{comment.author_name}</span>
        <span className="text-xs">{new Date(comment.created_at).toLocaleString()}</span>
      </div>
      <p className="text-campus-text-secondary font-body leading-relaxed text-sm">{comment.content}</p>
      <div className="flex items-center gap-4 mt-2">
        <button onClick={() => onReply(comment.id, comment.author_name)}
          className="text-xs text-campus-text-tertiary hover:text-primary transition-colors font-body">
          回复
        </button>
        {user && (user.id === (comment as any).author_id || (user as any).isAdmin) && (
          <button onClick={() => onDelete(comment.id)}
            className="text-xs text-destructive hover:text-destructive-hover transition-colors font-body">
            删除
          </button>
        )}
      </div>
      {children.map(child => (
        <CommentItem
          key={child.id}
          comment={child}
          allComments={allComments}
          user={user}
          onReply={onReply}
          onDelete={onDelete}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<PostStats | null>(null);

  const fetchPost = () => {
    api.get(`/posts/${id}`).then(r => { setPost(r.data); setLoading(false); });
  };
  const fetchComments = () => {
    api.get(`/posts/${id}/comments`).then(r => setComments(r.data));
  };
  const fetchStats = () => {
    postsApi.getStats(Number(id)).then(r => setStats(r.data)).catch(() => {});
  };

  useEffect(() => { fetchPost(); fetchComments(); fetchStats(); }, [id]);

  const handleShare = () => {
    setShowShareModal(true);
    setCopied(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toastStore.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastStore.error('复制失败，请手动复制');
    }
  };

  const handleVote = async (value: 1 | -1 | 0) => {
    if (!user) return navigate('/login');
    try {
      await api.post('/votes', { postId: Number(id), value });
      fetchPost();
    } catch {
      toastStore.error('点赞失败');
    }
  };

  const handleFavorite = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/favorites', { postId: Number(id) });
      fetchPost();
    } catch {
      toastStore.error('收藏失败');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!commentText.trim()) {
      toastStore.warning('请输入评论内容');
      return;
    }
    try {
      const body: any = { content: commentText.trim() };
      if (replyTo) body.parentId = replyTo.id;
      await api.post(`/posts/${id}/comments`, body);
      toastStore.success('评论成功');
      setCommentText('');
      setReplyTo(null);
      fetchComments();
      fetchPost();
    } catch {
      toastStore.error('评论失败');
    }
  };

  const handleTogglePrivacy = async () => {
    if (!user) return;
    try {
      const res = await postsApi.togglePrivacy(Number(id));
      toastStore.success(res.data.message);
      fetchPost();
    } catch {
      toastStore.error('操作失败');
    }
  };

  const handleTogglePin = async () => {
    if (!user) return;
    try {
      const res = await postsApi.togglePin(Number(id));
      toastStore.success(res.data.message);
      fetchPost();
    } catch {
      toastStore.error('操作失败');
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定删除此帖？')) return;
    try {
      await api.delete(`/posts/${id}`);
      toastStore.success('删除成功');
      navigate('/');
    } catch {
      toastStore.error('删除失败');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定删除此评论？')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      toastStore.success('删除成功');
      fetchComments();
    } catch {
      toastStore.error('删除失败');
    }
  };

  if (loading) return <div className="text-center py-12 text-campus-text-tertiary font-body">加载中...</div>;
  if (!post) return <div className="text-center py-12 text-campus-text-tertiary font-body">帖子不存在</div>;

  const images: string[] = Array.isArray(post.images) ? post.images : [];

  return (
    <div className="max-w-3xl mx-auto">
      <Link to={`/board/${post.board_id}`} className="inline-flex items-center gap-1 text-sm text-campus-text-tertiary hover:text-primary transition-colors font-body">
        <ArrowLeft className="w-4 h-4" />
        返回 {post.board_name}
      </Link>

      {/* 帖子内容 */}
      <article className="card mt-4">
        <h1 className="font-handwrite text-2xl font-bold text-campus-text-primary mb-4">
          {post.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-campus-text-tertiary mb-6 flex-wrap font-body">
          <span>{post.author_name}</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {post.view_count}
          </span>
          {post.is_private === 1 && (
            <span className="flex items-center gap-1 text-warning">
              <Lock className="w-3 h-3" />
              私密
            </span>
          )}
          {post.is_pinned === 1 && (
            <span className="flex items-center gap-1 text-primary">
              <Pin className="w-3 h-3" />
              置顶
            </span>
          )}
          {user && (user.id === post.author_id || (user as any).isAdmin) && (
            <>
              <Link to={`/edit-post/${post.id}`} className="text-primary hover:text-primary-hover flex items-center gap-1">
                <Edit3 className="w-4 h-4" />
                编辑
              </Link>
              {user.id === post.author_id && (
                <button onClick={handleTogglePrivacy} className="text-warning hover:text-warning/80 flex items-center gap-1">
                  {post.is_private === 1 ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {post.is_private === 1 ? '取消私密' : '设私密'}
                </button>
              )}
              {(user as any).isAdmin && (
                <button onClick={handleTogglePin} className="text-primary hover:text-primary-hover flex items-center gap-1">
                  {post.is_pinned === 1 ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  {post.is_pinned === 1 ? '取消置顶' : '置顶'}
                </button>
              )}
              <button onClick={handleDelete} className="text-destructive hover:text-destructive-hover flex items-center gap-1">
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </>
          )}
        </div>
        <div className="prose dark:prose-invert max-w-none campus-prose">
          {post.content.startsWith('<') ? (
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          ) : (
            <div className="whitespace-pre-wrap">{post.content}</div>
          )}
        </div>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {images.map((img, i) => (
              <img key={i} src={img} alt="" className="rounded-lg max-h-48 object-cover" loading="lazy" />
            ))}
          </div>
        )}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-border">
          <button onClick={() => handleVote(post.my_vote === 1 ? 0 : 1)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${post.my_vote === 1 ? 'text-primary' : 'text-campus-text-tertiary'} hover:text-primary`}>
            <ThumbsUp className={`w-5 h-5 ${post.my_vote === 1 ? 'fill-current' : ''}`} />
            {stats?.like_count ?? post.like_count}
          </button>
          <button onClick={handleFavorite}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${post.is_favorited ? 'text-warning' : 'text-campus-text-tertiary'} hover:text-warning`}>
            <Heart className={`w-5 h-5 ${post.is_favorited ? 'fill-current' : ''}`} />
            {stats?.favorite_count ? `${stats.favorite_count} 收藏` : '收藏'}
          </button>
          <span className="flex items-center gap-2 text-sm text-campus-text-tertiary">
            <MessageCircle className="w-5 h-5" />
            {stats?.comment_count ?? post.comment_count}
          </span>
          <button onClick={handleShare}
            className="flex items-center gap-2 text-sm font-medium text-campus-text-tertiary hover:text-primary transition-colors ml-auto">
            <Share2 className="w-5 h-5" />
            分享
          </button>
        </div>
      </article>

      {/* 评论列表 */}
      <div className="mt-8">
        <h2 className="font-handwrite text-xl font-semibold text-campus-text-primary mb-6">
          评论 ({comments.length})
        </h2>
        <div className="space-y-4">
          {comments.filter(c => c.parent_id === null).map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              allComments={comments}
              user={user}
              onReply={(id, name) => setReplyTo({ id, name })}
              onDelete={handleDeleteComment}
              depth={0}
            />
          ))}
          {comments.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-campus-text-tertiary font-body">暂无评论，快来发表第一条评论吧！</p>
            </div>
          )}
        </div>
      </div>

      {/* 回复框 */}
      <form onSubmit={handleComment} className="card mt-6">
        {replyTo && (
          <div className="flex items-center justify-between text-sm text-campus-text-secondary mb-3 font-body">
            <span>回复 @{replyTo.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-destructive hover:text-destructive-hover flex items-center gap-1">
              <X className="w-4 h-4" />
              取消
            </button>
          </div>
        )}
        <textarea
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          className="input !min-h-[100px] resize-none"
          placeholder={user ? '写下你的评论...' : '请先登录'}
          maxLength={1000}
          required
        />
        <button type="submit" disabled={!user || !commentText.trim()}
          className="mt-4 btn-primary font-body">
          发表评论
        </button>
      </form>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-campus-text-primary font-display">分享帖子</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-background rounded-lg transition-colors">
                <X className="w-5 h-5 text-campus-text-secondary" />
              </button>
            </div>
            <p className="text-sm text-campus-text-secondary mb-4">{post?.title}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={typeof window !== 'undefined' ? window.location.href : ''}
                readOnly
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-campus-text-primary focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
