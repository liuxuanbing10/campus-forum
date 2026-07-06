import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';

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
    await api.post('/votes', { postId: Number(id), value });
    fetchPost();
  };

  const handleFavorite = async () => {
    if (!user) return navigate('/login');
    await api.post('/favorites', { postId: Number(id) });
    fetchPost();
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!commentText.trim()) return;
    const body: any = { content: commentText.trim() };
    if (replyTo) body.parentId = replyTo.id;
    await api.post(`/posts/${id}/comments`, body);
    setCommentText('');
    setReplyTo(null);
    fetchComments();
    fetchPost();
  };

  const handleDelete = async () => {
    if (!confirm('确定删除此帖？')) return;
    await api.delete(`/posts/${id}`);
    navigate('/');
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定删除此评论？')) return;
    await api.delete(`/comments/${commentId}`);
    fetchComments();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>;
  if (!post) return <div className="text-center py-12 text-gray-500">帖子不存在</div>;

  const images: string[] = Array.isArray(post.images) ? post.images : [];

  return (
    <div className="max-w-3xl mx-auto">
      <Link to={`/board/${post.board_id}`} className="text-sm text-gray-400 hover:text-primary-600">&larr; 返回 {post.board_name}</Link>

      {/* 帖子内容 */}
      <article className="card mt-2">
        <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-4 flex-wrap">
          <span>{post.author_name}</span>
          <span>{post.created_at?.slice(0, 10)}</span>
          <span>👁 {post.view_count}</span>
          {user && (user.id === post.author_id || (user as any).isAdmin) && (
            <>
              <Link to={`/edit-post/${post.id}`} className="text-primary-600 hover:underline">编辑</Link>
              <button onClick={handleDelete} className="text-red-500 hover:underline">删除</button>
            </>
          )}
        </div>
        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{post.content}</div>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {images.map((img, i) => (
              <img key={i} src={img} alt="" className="rounded-lg max-h-48 object-cover" loading="lazy" />
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => handleVote(post.my_vote === 1 ? 0 : 1)}
            className={`flex items-center gap-1 text-sm ${post.my_vote === 1 ? 'text-primary-600' : 'text-gray-400'} hover:text-primary-600`}>
            👍 {post.like_count}
          </button>
          <button onClick={handleFavorite}
            className={`flex items-center gap-1 text-sm ${post.is_favorited ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}>
            {post.is_favorited ? '⭐' : '☆'} 收藏
          </button>
          <span className="text-sm text-gray-400">💬 {post.comment_count}</span>
        </div>
      </article>

      {/* 评论列表 */}
      <div className="mt-6">
        <h2 className="font-bold mb-4">评论 ({comments.length})</h2>
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="card !p-4">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                <span>{c.author_name}</span>
                <span className="text-xs">{c.created_at?.slice(0, 16)}</span>
              </div>
              <p className="text-sm">{c.content}</p>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => setReplyTo({ id: c.id, name: c.author_name })}
                  className="text-xs text-gray-400 hover:text-primary-600">回复</button>
                {user && (user.id === (c as any).author_id || (user as any).isAdmin) && (
                  <button onClick={() => handleDeleteComment(c.id)}
                    className="text-xs text-red-400 hover:text-red-600">删除</button>
                )}
              </div>
              {/* 子回复 */}
              {comments
                .filter(sub => sub.parent_id === c.id)
                .map(sub => (
                  <div key={sub.id} className="ml-4 mt-2 pl-3 border-l-2 border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{sub.author_name}</span>
                      <span>{sub.created_at?.slice(0, 16)}</span>
                    </div>
                    <p className="text-sm mt-0.5">{sub.content}</p>
                  </div>
                ))}
            </div>
          ))}
          {comments.length === 0 && <p className="text-gray-400 text-center py-4">暂无评论</p>}
        </div>
      </div>

      {/* 回复框 */}
      <form onSubmit={handleComment} className="card mt-4">
        {replyTo && (
          <div className="text-sm text-gray-400 mb-2">
            回复 @{replyTo.name}
            <button type="button" onClick={() => setReplyTo(null)} className="ml-2 text-red-400 hover:underline">取消</button>
          </div>
        )}
        <textarea
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          className="input !min-h-[80px]"
          placeholder={user ? '写下你的评论...' : '请先登录'}
          maxLength={1000}
          required
        />
        <button type="submit" disabled={!user || !commentText.trim()}
          className="mt-2 btn-primary text-sm disabled:opacity-50">
          发表评论
        </button>
      </form>
    </div>
  );
}
