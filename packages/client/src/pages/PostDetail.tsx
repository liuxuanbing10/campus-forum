import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';
import { toastStore } from '../App';
import { ArrowLeft, Eye, ThumbsUp, Heart, MessageCircle, Edit3, Trash2, X } from 'lucide-react';

interface PostDetail {
  id: number; title: string; content: string; board_id: number; board_name: string;
  is_anonymous: number; is_pinned: number; images: string[];
  author_name: string; author_id: number; created_at: string; updated_at: string;
  like_count: number; comment_count: number; is_favorited: number; my_vote: number;
  view_count: number;
}

interface Comment {
  id: number; content: string; post_id: number; parent_id: number | null;
  is_anonymous: number; created_at: string; author_name: string;
  like_count: number;
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

  const fetchPost = () => {
    api.get(`/posts/${id}`).then(r => { setPost(r.data); setLoading(false); });
  };
  const fetchComments = () => {
    api.get(`/posts/${id}/comments`).then(r => setComments(r.data));
  };

  useEffect(() => { fetchPost(); fetchComments(); }, [id]);

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
          {user && (user.id === post.author_id || (user as any).isAdmin) && (
            <>
              <Link to={`/edit-post/${post.id}`} className="text-primary hover:text-primary-hover flex items-center gap-1">
                <Edit3 className="w-4 h-4" />
                编辑
              </Link>
              <button onClick={handleDelete} className="text-destructive hover:text-destructive-hover flex items-center gap-1">
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </>
          )}
        </div>
        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-campus-text-secondary font-body">
          {post.content}
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
            {post.like_count}
          </button>
          <button onClick={handleFavorite}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${post.is_favorited ? 'text-warning' : 'text-campus-text-tertiary'} hover:text-warning`}>
            <Heart className={`w-5 h-5 ${post.is_favorited ? 'fill-current' : ''}`} />
            收藏
          </button>
          <span className="flex items-center gap-2 text-sm text-campus-text-tertiary">
            <MessageCircle className="w-5 h-5" />
            {post.comment_count}
          </span>
        </div>
      </article>

      {/* 评论列表 */}
      <div className="mt-8">
        <h2 className="font-handwrite text-xl font-semibold text-campus-text-primary mb-6">
          评论 ({comments.length})
        </h2>
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-center justify-between text-sm text-campus-text-tertiary mb-3 font-body">
                <span className="font-medium text-campus-text-secondary">{c.author_name}</span>
                <span className="text-xs">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-campus-text-secondary font-body leading-relaxed">{c.content}</p>
              <div className="flex items-center gap-4 mt-3">
                <button onClick={() => setReplyTo({ id: c.id, name: c.author_name })}
                  className="text-xs text-campus-text-tertiary hover:text-primary transition-colors font-body">
                  回复
                </button>
                {user && (user.id === (c as any).author_id || (user as any).isAdmin) && (
                  <button onClick={() => handleDeleteComment(c.id)}
                    className="text-xs text-destructive hover:text-destructive-hover transition-colors font-body">
                    删除
                  </button>
                )}
              </div>
              {/* 子回复 */}
              {comments
                .filter(sub => sub.parent_id === c.id)
                .map(sub => (
                  <div key={sub.id} className="ml-4 mt-4 pl-4 border-l-2 border-border">
                    <div className="flex items-center justify-between text-xs text-campus-text-tertiary font-body">
                      <span className="font-medium text-campus-text-secondary">{sub.author_name}</span>
                      <span>{new Date(sub.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-campus-text-secondary font-body mt-1">{sub.content}</p>
                  </div>
                ))}
            </div>
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
    </div>
  );
}
