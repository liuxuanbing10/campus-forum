import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Board {
  id: number;
  name: string;
}

export default function NewPostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [boardId, setBoardId] = useState<number>(0);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/boards').then(res => setBoards(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) return alert('请选择板块');

    setLoading(true);
    try {
      await axios.post('/api/posts', {
        title,
        content,
        boardId,
        isAnonymous,
      });
      navigate('/');
    } catch (err) {
      alert('发帖失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/"
        className="text-sm text-campus-text-tertiary hover:text-primary-600 transition-colors mb-6 inline-flex items-center gap-1"
      >
        &larr; 返回首页
      </Link>

      <div className="max-w-2xl mx-auto p-10 bg-white rounded-xl border border-border shadow-card">
        <h1 className="font-display text-2xl font-bold text-campus-text-primary mb-8">
          发表新帖
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-1.5">
              板块
            </label>
            <select
              value={boardId}
              onChange={e => setBoardId(Number(e.target.value))}
              className="w-full h-12 px-4 border border-border rounded-md bg-white text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 appearance-none"
              required
            >
              <option value={0}>请选择板块</option>
              {boards.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-1.5">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full h-12 px-4 border border-border rounded-md bg-white text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-primary mb-1.5">
              内容
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full min-h-[200px] p-4 border border-border rounded-md bg-primary-50 text-campus-text-primary focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 resize-none"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-campus-text-secondary">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="accent-primary-600"
            />
            匿名发帖
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all mt-6 disabled:opacity-50"
          >
            {loading ? '发布中...' : '发布'}
          </button>
        </form>
      </div>
    </div>
  );
}
