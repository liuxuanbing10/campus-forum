import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Pin, Clock, User } from 'lucide-react';
import { teamsApi } from '../lib/api';
import type { TeamContentPost } from '@campus-forum/core';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';

export default function TeamContentPostDetail() {
  const { id, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const teamId = Number(id);
  const postIdNum = Number(postId);

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<TeamContentPost | null>(null);
  const [teamName, setTeamName] = useState('');
  const [myRole, setMyRole] = useState<string | null>(null);

  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const isAuthor = post && user && post.author_id === user.id;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [postRes, teamRes] = await Promise.all([
          teamsApi.getTeamContentPost(teamId, postIdNum),
          teamsApi.getTeam(teamId),
        ]);
        setPost(postRes.data);
        const imagesRaw = (postRes.data as any).images;
        if (imagesRaw && typeof imagesRaw === 'string') {
          try { postRes.data.images = JSON.parse(imagesRaw); } catch { postRes.data.images = []; }
        }
        setTeamName(teamRes.data.name);
        setMyRole(teamRes.data.myRole);
      } catch (err: any) {
        toastStore.error(err.response?.data?.error || '加载失败');
        navigate(`/teams/${teamId}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId, postIdNum]);

  const handleDelete = async () => {
    if (!confirm('确定删除该帖子吗？')) return;
    try {
      await teamsApi.deleteTeamContentPost(teamId, postIdNum);
      toastStore.success('已删除');
      navigate(`/teams/${teamId}`);
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-campus-text-secondary">加载中...</div>;
  }

  if (!post) {
    return <div className="text-center py-16 text-campus-text-secondary">帖子不存在</div>;
  }

  const images: string[] = Array.isArray(post.images) ? post.images :
    typeof post.images === 'string' ? (() => { try { return JSON.parse(post.images); } catch { return []; } })() : [];

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(`/teams/${teamId}`)}
        className="flex items-center gap-2 text-campus-text-secondary hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回团队
      </button>

      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-campus-text-primary font-display">{post.title}</h1>
            {post.is_pinned === 1 && (
              <span className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                <Pin className="w-3 h-3" />
                置顶
              </span>
            )}
          </div>
          {(isAdmin || isAuthor) && (
            <button
              onClick={handleDelete}
              className="p-2 text-campus-text-tertiary hover:text-destructive transition-colors"
              title="删除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-campus-text-tertiary mb-6 pb-4 border-b border-border">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {post.display_name || post.username}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {new Date(post.created_at).toLocaleString('zh-CN')}
          </span>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none text-campus-text-primary whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>

        {/* Images */}
        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`图片 ${i + 1}`}
                className="w-full h-48 object-cover rounded-xl border border-border"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
