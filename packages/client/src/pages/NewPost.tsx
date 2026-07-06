import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toastStore } from '../App';
import { ArrowLeft } from 'lucide-react';

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
    api.get('/boards').then(res => setBoards(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) {
      toastStore.warning('请选择板块');
      return;
    }

    setLoading(true);
    try {
      await api.post('/posts', {
        title,
        content,
        boardId,
        isAnonymous,
      });
      toastStore.success('发帖成功！');
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || '发帖失败';
      toastStore.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[42rem] mx-auto py-8">
      <Link
        to="/"
        className="text-sm text-campus-text-tertiary hover:text-primary transition-colors mb-6 inline-flex items-center gap-1 font-body"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </Link>

      <div className="card p-6 sm:p-10">
        <h1 className="font-handwrite text-2xl font-semibold text-campus-text-primary mb-8" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)' }}>
          发表新帖
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              板块
            </label>
            <select
              value={boardId}
              onChange={e => setBoardId(Number(e.target.value))}
              className="input appearance-none"
              required
            >
              <option value={0}>请选择板块</option>
              {boards.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input"
              placeholder="请输入标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              内容
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="input min-h-[200px] resize-none p-4"
              placeholder="请输入内容"
              required
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-campus-text-secondary cursor-pointer font-body">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="accent-primary"
            />
            匿名发帖
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary font-body mt-6"
          >
            {loading ? '发布中...' : '发布'}
          </button>
        </form>
      </div>
    </div>
  );
}
