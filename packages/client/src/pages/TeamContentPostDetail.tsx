import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Pin, Clock, User, Send, MessageSquare } from 'lucide-react';
import { teamsApi } from '../lib/api';
import type { TeamContentPost, TeamContentComment } from '@campus-forum/core';
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
  const [isMember, setIsMember] = useState(false);

  const [comments, setComments] = useState<TeamContentComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const isAuthor = post && user && post.author_id === user.id;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [postRes, teamRes, commentsRes] = await Promise.all([
          teamsApi.getTeamContentPost(teamId, postIdNum),
          teamsApi.getTeam(teamId),
          teamsApi.getComments(teamId, postIdNum),
        ]);
        setPost(postRes.data);
        const imagesRaw = (postRes.data as any).images;
        if (imagesRaw && typeof imagesRaw === 'string') {
          try { postRes.data.images = JSON.parse(imagesRaw); } catch { postRes.data.images = []; }
        }
        setTeamName(teamRes.data.name);
        setMyRole(teamRes.data.myRole);
        setIsMember(!!teamRes.data.myRole);
        setComments(commentsRes.data.comments);
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

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const res = await teamsApi.createComment(teamId, postIdNum, commentText.trim());
      setComments(prev => [...prev, res.data.comment]);
      setCommentText('');
      toastStore.success('评论成功');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '评论失败');
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定删除该评论吗？')) return;
    try {
      await teamsApi.deleteComment(teamId, postIdNum, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toastStore.success('已删除');
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

      {/* Post */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
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
            <button onClick={handleDelete} className="p-2 text-campus-text-tertiary hover:text-destructive transition-colors" title="删除">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-campus-text-tertiary mb-6 pb-4 border-b border-border">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {post.display_name || post.username}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {new Date(post.created_at).toLocaleString('zh-CN')}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" />
            {comments.length} 条评论
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-campus-text-primary leading-relaxed" dangerouslySetInnerHTML={{ __html: post.content }} />

        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, i) => (
              <img key={i} src={img} alt={`图片 ${i + 1}`}
                className="w-full h-48 object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(img, '_blank')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-campus-text-primary mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          评论 ({comments.length})
        </h2>

        {/* Comment list */}
        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-center text-campus-text-tertiary py-8">暂无评论</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {(comment.display_name || comment.username || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-campus-text-primary">
                      {comment.display_name || comment.username}
                    </span>
                    <span className="text-xs text-campus-text-tertiary">
                      {new Date(comment.created_at).toLocaleString('zh-CN')}
                    </span>
                    {(isAdmin || user?.id === comment.author_id) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="ml-auto text-xs text-campus-text-tertiary hover:text-destructive transition-colors"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-campus-text-primary leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input */}
        {isMember ? (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0 mt-1">
              {user ? (user.displayName || user.username || '?')[0] : '?'}
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="写下你的评论..."
                rows={2}
                className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-sm text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || commenting}
                className="self-end px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
                {commenting ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-campus-text-tertiary py-3">仅团队成员可评论</p>
        )}
      </div>
    </div>
  );
}
