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
    <div className="max-w-[42rem] mx-auto py-8">
      <Link
        to="/"
        className="text-sm text-campus-text-tertiary hover:text-primary-600 transition-colors mb-6 inline-flex items-center gap-1"
      >
        &larr; 返回
      </Link>

      <div className="max-w-[42rem] mx-auto p-6 sm:p-10 bg-white rounded-xl border border-border shadow-card">
        <h1 className="font-display text-2xl font-semibold text-campus-text-primary mb-8" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)' }}>
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
              style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23a8a29e%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
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

          <label className="flex items-center gap-3 text-sm text-campus-text-secondary cursor-pointer">
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
            className="w-full h-12 bg-primary-600 text-white font-semibold rounded-md border border-primary-600 hover:opacity-90 hover:-translate-y-0.5 transition-all mt-6 disabled:opacity-50"
          >
            {loading ? '发布中...' : '发布'}
          </button>
        </form>
      </div>
    </div>
  );
}
