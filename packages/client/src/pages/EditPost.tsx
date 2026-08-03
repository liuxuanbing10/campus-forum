import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api, { postsApi } from '../lib/api';
import { toastStore } from '../App';
import { ArrowLeft, Edit3, Lock, ImagePlus, X, Upload } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import MarkdownEditor from '../components/MarkdownEditor';
import Skeleton from '../components/Skeleton';

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
  const [isPrivate, setIsPrivate] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
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
        if (user && post.authorId !== user.id) {
          toastStore.error('您无权编辑此帖子');
          navigate(`/post/${id}`);
          return;
        }
        setTitle(post.title);
        setContent(post.content);
        setBoardId(post.boardId);
        setIsAnonymous(post.isAnonymous === 1);
        setIsPrivate(post.isPrivate === 1);
        setImages(Array.isArray(post.images) ? post.images : []);
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

  const uploadFile = useCallback(async (file: File) => {
    if (images.length >= 9) { toastStore.warning('最多上传9张图片'); return; }
    if (file.size > 5 * 1024 * 1024) { toastStore.warning('图片不能超过5MB'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImages(prev => [...prev, res.data.url]);
      toastStore.success('图片上传成功');
    } catch {
      toastStore.error('图片上传失败');
    } finally {
      setUploading(false);
    }
  }, [images.length]);

  const onDrop = useCallback((accepted: File[]) => {
    accepted.forEach(f => uploadFile(f));
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    disabled: uploading,
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

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
        boardId: boardId,
        isAnonymous: isAnonymous,
        isPrivate: isPrivate,
        images: images.length > 0 ? images : undefined,
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
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Skeleton variant="text" count={1} className="h-8 w-1/2" />
        <Skeleton variant="post" count={1} />
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
            <MarkdownEditor
              content={content}
              onChange={setContent}
              placeholder="请输入内容"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-campus-text-secondary mb-2 font-body">
              图片 ({images.length}/9)
            </label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-white rounded-full hover:bg-destructive-hover"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 9 && (
                <div
                  {...getRootProps()}
                  className={`w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <input {...getInputProps()} />
                  {isDragActive
                    ? <Upload className="w-6 h-6 text-primary animate-bounce" />
                    : <><ImagePlus className="w-6 h-6 text-campus-text-tertiary" /><span className="text-xs text-campus-text-tertiary mt-1">{uploading ? '上传中...' : '拖拽/点击'}</span></>
                  }
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-3 text-sm text-campus-text-secondary cursor-pointer font-body">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="accent-primary"
              />
              匿名发帖
            </label>
            <label className="flex items-center gap-3 text-sm text-campus-text-secondary cursor-pointer font-body">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="accent-primary"
              />
              <Lock className="w-3.5 h-3.5" />
              仅自己可见
            </label>
          </div>

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
              disabled={submitting || uploading}
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
