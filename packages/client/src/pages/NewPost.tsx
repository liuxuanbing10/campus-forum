import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">发帖</h1>
      
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">板块</label>
          <select
            value={boardId}
            onChange={e => setBoardId(Number(e.target.value))}
            className="input"
            required
          >
            <option value={0}>请选择板块</option>
            {boards.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">标题</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">内容</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="input min-h-[200px]"
            required
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">匿名发帖</span>
        </label>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50"
        >
          {loading ? '发布中...' : '发布'}
        </button>
      </form>
    </div>
  );
}
