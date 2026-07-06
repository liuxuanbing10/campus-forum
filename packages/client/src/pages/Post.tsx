import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';

interface Post {
  id: number;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
  view_count: number;
}

interface Comment {
  id: number;
  content: string;
  author_name: string;
  created_at: string;
}

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/posts/${id}`),
      api.get(`/posts/${id}/comments`),
    ]).then(([postRes, commentsRes]) => {
      setPost(postRes.data);
      setComments(commentsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await api.post(`/posts/${id}/comments`, { content: newComment });
    setNewComment('');

    const { data } = await api.get(`/posts/${id}/comments`);
    setComments(data);
  };

  if (loading) return <div className="text-center py-8 text-campus-text-tertiary">加载中...</div>;
  if (!post) return <div className="text-center py-8 text-campus-text-tertiary">帖子不存在</div>;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-campus-text-tertiary hover:text-primary-600 transition-colors mb-6">
        <span className="text-base leading-none">←</span>
        课程交流 &gt; 帖子详情
      </Link>

      {/* Article Card */}
      <article className="relative p-5 sm:p-8 md:p-10 bg-white border border-border rounded-xl shadow-card">
        {/* Decorative quote mark */}
        <div className="absolute top-4 left-6 text-6xl text-primary-200 font-display leading-none select-none pointer-events-none">
          ❝
        </div>

        {/* Title */}
        <h1
          className="font-display text-3xl md:text-4xl font-bold text-campus-text-primary mb-6 relative"
          style={{ fontSize: 'clamp(28px, 3.5vw, 48px)' }}
        >
          {post.title}
        </h1>

        {/* Author Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 pb-5 border-b border-border-light text-xs sm:text-sm relative">
          <span className="font-medium text-campus-text-secondary">{post.author_name}</span>
          <span className="text-campus-text-tertiary">👁 {post.view_count}</span>
          <span className="text-campus-text-tertiary ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>

        {/* Post Body */}
        <div className="mt-6 text-base leading-relaxed text-campus-text-primary whitespace-pre-wrap">
          {post.content}
        </div>
      </article>

      {/* Comments Section */}
      <h2 className="font-display text-2xl md:text-3xl font-semibold text-campus-text-primary mt-10 mb-6" style={{ fontSize: 'clamp(22px, 2.4vw, 32px)' }}>
        评论 ({comments.length})
      </h2>

      {/* Comments List */}
      <div className="space-y-4 mb-6">
        {comments.map(comment => (
          <div key={comment.id} className="p-5 bg-white border border-border rounded-lg shadow-card">
            <p className="text-campus-text-primary leading-relaxed">{comment.content}</p>
            <div className="flex items-center gap-3 mt-3 text-sm text-campus-text-tertiary">
              <span className="font-medium text-campus-text-secondary">{comment.author_name}</span>
              <span>{new Date(comment.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Form */}
      <form onSubmit={handleComment} className="mb-10">
        <div className="p-6 bg-white border border-border rounded-lg shadow-card">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="写下你的想法..."
            className="w-full min-h-[120px] p-4 border border-border rounded-md bg-primary-50/30 text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 resize-none"
            required
          />
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              className="inline-flex items-center justify-center h-10 px-8 font-body text-sm font-semibold text-white bg-primary-600 border border-primary-600 rounded-md cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5"
            >
              发表评论
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
