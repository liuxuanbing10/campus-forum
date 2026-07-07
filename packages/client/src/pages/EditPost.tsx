import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { postsApi } from '../lib/api';
import { toastStore } from '../App';
import { ArrowLeft, Edit3 } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

interface Board {
  id: number;
  name: string;
}

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [boardId, setBoardId] = useState<number>(0);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/boards').then(res => setBoards(res.data));
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadPost = async () => {
      try {
        setLoading(true);
        const res = await postsApi.getPost(Number(id));
        const post = res.data;
        if (user && post.author_id !== user.id) {
          toastStore.error('您无权编辑此帖子');
          navigate(`/post/${id}`);
          return;
        }
        setTitle(post.title);
        setContent(post.content);
        setBoardId(post.board_id);
        setIsAnonymous(post.is_anonymous === 1);
      } catch (err: any) {
        if (err.response?.status === 404) {
          toastStore.error('帖子不存在');
          navigate('/');
        } else {
          toastStore.error('加载帖子失败');
        }
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) {
      toastStore.warning('请选择板块');
      return;
    }
    setSubmitting(true);
    try {
      await postsApi.updatePost(Number(id), {
        title,
        content,
        board_id: boardId,
        is_anonymous: isAnonymous,
      });
      toastStore.success('编辑成功！');
      navigate(`/post/${id}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || '编辑失败';
      toastStore.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-campus-text-secondary">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[42rem] mx-auto py-8">
      <Link
        to={`/post/${id}`}
        className="text-sm text-campus-text-tertiary hover:text-primary transition-colors mb-6 inline-flex items-center gap-1 font-body"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </Link>

      <div className="card p-6 sm:p-10">
        <h1 className="font-handwrite text-2xl font-semibold text-campus-text-primary mb-8 flex items-center gap-2" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)' }}>
          <Edit3 className="w-6 h-6" />
          编辑帖子
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

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/post/${id}`)}
              className="flex-1 px-4 py-3 border border-border hover:border-primary/50 text-campus-text-primary rounded-xl font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary font-body"
            >
              {submitting ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
