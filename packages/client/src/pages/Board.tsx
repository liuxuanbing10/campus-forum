import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

interface Post {
  id: number;
  title: string;
  author_name: string;
  created_at: string;
  view_count: number;
  vote_count: number;
}

export default function BoardPage() {
  const { id } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`/api/boards/${id}`),
      axios.get(`/api/boards/${id}/posts`),
    ]).then(([boardRes, postsRes]) => {
      setBoardName(boardRes.data.name);
      setPosts(postsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-8">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{boardName}</h1>
        <Link to="/new" className="btn-primary">
          发帖
        </Link>
      </div>

      <div className="space-y-3">
        {posts.map(post => (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="card hover:shadow-md transition-shadow block"
          >
            <h2 className="font-semibold">{post.title}</h2>
            <div className="text-sm text-gray-500 mt-2 flex gap-4">
              <span>{post.author_name}</span>
              <span>👁 {post.view_count}</span>
              <span>👍 {post.vote_count || 0}</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
        
        {posts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暂无帖子，来发第一个吧！
          </div>
        )}
      </div>
    </div>
  );
}
