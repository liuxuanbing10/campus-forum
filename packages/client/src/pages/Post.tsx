import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

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
      axios.get(`/api/posts/${id}`),
      axios.get(`/api/posts/${id}/comments`),
    ]).then(([postRes, commentsRes]) => {
      setPost(postRes.data);
      setComments(commentsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await axios.post(`/api/posts/${id}/comments`, { content: newComment });
    setNewComment('');
    
    const { data } = await axios.get(`/api/posts/${id}/comments`);
    setComments(data);
  };

  if (loading) return <div className="text-center py-8">加载中...</div>;
  if (!post) return <div className="text-center py-8">帖子不存在</div>;

  return (
    <div>
      <article className="card mb-6">
        <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
        <div className="prose dark:prose-invert max-w-none mb-4">
          {post.content}
        </div>
        <div className="text-sm text-gray-500 flex gap-4">
          <span>{post.author_name}</span>
          <span>👁 {post.view_count}</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
      </article>

      <h2 className="text-lg font-semibold mb-4">
        评论 ({comments.length})
      </h2>

      <div className="space-y-4 mb-6">
        {comments.map(comment => (
          <div key={comment.id} className="card">
            <p>{comment.content}</p>
            <div className="text-sm text-gray-500 mt-2">
              {comment.author_name} · {new Date(comment.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleComment} className="card">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="写评论..."
          className="input min-h-[100px] mb-3"
          required
        />
        <button type="submit" className="btn-primary">
          发表评论
        </button>
      </form>
    </div>
  );
}
