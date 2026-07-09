import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import api, { postsApi, PostStats, commentApi, versionApi, reportApi } from '../lib/api';
import { toastStore } from '../App';
import { ArrowLeft, Eye, ThumbsUp, Heart, MessageCircle, Edit3, Trash2, X, Share2, Lock, Unlock, Pin, PinOff, Flag, History, Check, Copy } from 'lucide-react';
import FollowButton from '../components/FollowButton';
import ReportDialog from '../components/ReportDialog';
import ShareModal from '../components/ShareModal';
import MetaManager from '../components/MetaManager';

interface PostDetail {
  id: number; title: string; content: string; board_id: number; board_name: string;
  is_anonymous: number; is_pinned: number; is_private: number; images: string[];
  author_name: string; author_id: number; created_at: string; updated_at: string;
  like_count: number; comment_count: number; is_favorited: number; my_vote: number;
  view_count: number;
}

interface Comment {
  id: number; content: string; post_id: number; parent_id: number | null;
  is_anonymous: number; created_at: string; author_name: string; author_id?: number;
  like_count: number;
}

interface PostVersion {
  id: number; title: string; content: string; editor_name: string; created_at: string;
}

function CommentItem({ comment, allComments, user, onReply, onDelete, onReport, onEdit, depth }: {
  comment: Comment;
  allComments: Comment[];
  user: any;
  onReply: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onReport: (id: number) => void;
  onEdit: (id: number, content: string) => void;
  depth: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await commentApi.update(comment.id, editText.trim());
      toastStore.success('编辑成功');
      comment.content = editText.trim();
      setEditing(false);
    } catch { toastStore.error('编辑失败'); }
    finally { setSaving(false); }
  };

  const children = allComments.filter(c => c.parent_id === comment.id);
  return (
    <div className={`card ${depth > 0 ? 'ml-4 mt-3 pl-4 border-l-2 border-border' : ''}`}>
      <div className="flex items-center justify-between text-sm text-campus-text-tertiary mb-2 font-body">
        <span className="font-medium text-campus-text-secondary">{comment.author_name}</span>
        <span className="text-xs">{new Date(comment.created_at).toLocaleString()}</span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={editText} onChange={e => setEditText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body resize-none focus:outline-none focus:border-primary" rows={3} />
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} disabled={saving}
              className="px-3 py-1 text-xs rounded-lg bg-primary text-white hover:bg-primary-hover font-body">保存</button>
            <button onClick={() => setEditing(false)}
              className="px-3 py-1 text-xs rounded-lg bg-surface-hover text-campus-text-secondary hover:bg-border font-body">取消</button>
          </div>
        </div>
      ) : (
        <p className="text-campus-text-secondary font-body leading-relaxed text-sm">{comment.content}</p>
      )}
      <div className="flex items-center gap-4 mt-2">
        <button onClick={() => onReply(comment.id, comment.author_name)}
          className="text-xs text-campus-text-tertiary hover:text-primary transition-colors font-body">回复</button>
        {user && user.id === comment.author_id && (
          <button onClick={() => { setEditing(true); setEditText(comment.content); }}
            className="text-xs text-campus-text-tertiary hover:text-primary transition-colors font-body">编辑</button>
        )}
        <button onClick={() => onReport(comment.id)}
          className="text-xs text-campus-text-tertiary hover:text-destructive transition-colors font-body">举报</button>
        {user && (user.id === comment.author_id || user.isAdmin) && (
          <button onClick={() => onDelete(comment.id)}
            className="text-xs text-destructive hover:text-destructive-hover transition-colors font-body">删除</button>
        )}
      </div>
      {children.map(child => (
        <CommentItem key={child.id} comment={child} allComments={allComments}
          user={user} onReply={onReply} onDelete={onDelete} onReport={onReport} onEdit={onEdit} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState<{ type: 'post' | 'comment'; id: number } | null>(null);
  const [stats, setStats] = useState<PostStats | null>(null);
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const fetchPost = () => {
    api.get(`/posts/${id}`).then(r => { setPost(r.data); setLoading(false); });
  };
  const fetchComments = () => {
    api.get(`/posts/${id}/comments`).then(r => setComments(r.data));
  };
  const fetchStats = () => {
    postsApi.getStats(Number(id)).then(r => setStats(r.data)).catch(() => {});
  };
  const fetchVersions = async () => {
    try {
      const r = await versionApi.getVersions(Number(id));
      setVersions(r.data.versions || []);
      setShowVersions(true);
    } catch { toastStore.error('加载编辑历史失败'); }
  };

  useEffect(() => { fetchPost(); fetchComments(); fetchStats(); }, [id]);

  const handleVote = async (value: 1 | -1 | 0) => {
    if (!user) return navigate('/login');
    try {
      await api.post('/votes', { postId: Number(id), value });
      fetchPost();
      fetchStats();
    } catch { toastStore.error('点赞失败'); }
  };

  const handleFavorite = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/favorites', { postId: Number(id) });
      fetchPost();
      fetchStats();
    } catch { toastStore.error('收藏失败'); }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!commentText.trim()) { toastStore.warning('请输入评论内容'); return; }
    try {
      const body: any = { content: commentText.trim() };
      if (replyTo) body.parentId = replyTo.id;
      await api.post(`/posts/${id}/comments`, body);
      toastStore.success('评论成功');
      setCommentText('');
      setReplyTo(null);
      fetchComments();
      fetchPost();
      fetchStats();
    } catch { toastStore.error('评论失败'); }
  };

  const handleTogglePrivacy = async () => {
    if (!user) return;
    try { const res = await postsApi.togglePrivacy(Number(id)); toastStore.success(res.data.message); fetchPost(); }
    catch { toastStore.error('操作失败'); }
  };

  const handleTogglePin = async () => {
    if (!user) return;
    try { const res = await postsApi.togglePin(Number(id)); toastStore.success(res.data.message); fetchPost(); }
    catch { toastStore.error('操作失败'); }
  };

  const handleDelete = async () => {
    if (!confirm('确定删除此帖？')) return;
    try { await api.delete(`/posts/${id}`); toastStore.success('删除成功'); navigate('/'); }
    catch { toastStore.error('删除失败'); }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定删除此评论？')) return;
    try { await api.delete(`/comments/${commentId}`); toastStore.success('删除成功'); fetchComments(); fetchStats(); }
    catch { toastStore.error('删除失败'); }
  };

  if (loading) return <div className="text-center py-12 text-campus-text-tertiary font-body">加载中...</div>;
  if (!post) return <div className="text-center py-12 text-campus-text-tertiary font-body">帖子不存在</div>;

  const images: string[] = Array.isArray(post.images) ? post.images : [];

  return (
    <>
      <MetaManager
        title={post.title}
        description={post.content.substring(0, 150).replace(/[#*`]/g, '')}
        keywords={`${post.board_name},${post.title}`}
        ogType="article"
        ogTitle={post.title}
        ogDescription={post.content.substring(0, 200).replace(/[#*`]/g, '')}
        canonical={`${window.location.origin}/post/${id}`}
      />
    <div className="max-w-3xl mx-auto">
      <Link to={`/board/${post.board_id}`} className="inline-flex items-center gap-1 text-sm text-campus-text-tertiary hover:text-primary transition-colors font-body">
        <ArrowLeft className="w-4 h-4" /> 返回 {post.board_name}
      </Link>

      {/* Author info with follow */}
      <div className="flex items-center gap-3 mt-4 mb-2">
        <Link to={`/user/${post.author_id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-sm font-bold">
            {post.is_anonymous ? '匿' : post.author_name[0]}
          </div>
          <span className="text-sm font-medium font-body">{post.is_anonymous ? '匿名用户' : post.author_name}</span>
        </Link>
        {!post.is_anonymous && user && user.id !== post.author_id && <FollowButton userId={post.author_id} />}
      </div>

      <article className="card mt-2">
        <h1 className="font-handwrite text-2xl font-bold text-campus-text-primary mb-4">
          {post.is_pinned === 1 && <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mr-2 align-middle font-body"><Pin className="w-3 h-3" />置顶</span>}
          {post.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-campus-text-tertiary mb-6 flex-wrap font-body">
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{stats?.view_count ?? post.view_count}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" />{stats?.like_count ?? post.like_count}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />{stats?.comment_count ?? post.comment_count}</span>
          <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{stats?.favorite_count ?? 0} 收藏</span>
          {post.is_private === 1 && <span className="flex items-center gap-1 text-warning"><Lock className="w-3 h-3" />私密</span>}
          {user && (user.id === post.author_id || user.isAdmin) && (
            <>
              <Link to={`/edit-post/${post.id}`} className="text-primary hover:text-primary-hover flex items-center gap-1"><Edit3 className="w-4 h-4" />编辑</Link>
              {user.id === post.author_id && (
                <button onClick={handleTogglePrivacy} className="text-warning hover:text-warning/80 flex items-center gap-1">
                  {post.is_private === 1 ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {post.is_private === 1 ? '取消私密' : '设私密'}
                </button>
              )}
              {user.isAdmin && (
                <button onClick={handleTogglePin} className="text-primary hover:text-primary-hover flex items-center gap-1">
                  {post.is_pinned === 1 ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  {post.is_pinned === 1 ? '取消置顶' : '置顶'}
                </button>
              )}
              <button onClick={handleDelete} className="text-destructive hover:text-destructive-hover flex items-center gap-1"><Trash2 className="w-4 h-4" />删除</button>
            </>
          )}
        </div>

        <div className="prose dark:prose-invert max-w-none text-campus-text-secondary font-body" dangerouslySetInnerHTML={{ __html: post.content }} />

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {images.map((img, i) => <img key={i} src={img} alt="" className="rounded-lg max-h-48 object-cover" loading="lazy" />)}
          </div>
        )}

        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-border">
          <button onClick={() => handleVote(post.my_vote === 1 ? 0 : 1)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${post.my_vote === 1 ? 'text-primary' : 'text-campus-text-tertiary'} hover:text-primary`}>
            <ThumbsUp className={`w-5 h-5 ${post.my_vote === 1 ? 'fill-current' : ''}`} />{stats?.like_count ?? post.like_count}
          </button>
          <button onClick={handleFavorite}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${post.is_favorited ? 'text-warning' : 'text-campus-text-tertiary'} hover:text-warning`}>
            <Heart className={`w-5 h-5 ${post.is_favorited ? 'fill-current' : ''}`} />{stats?.favorite_count ? `${stats.favorite_count} 收藏` : '收藏'}
          </button>
          <span className="flex items-center gap-2 text-sm text-campus-text-tertiary"><MessageCircle className="w-5 h-5" />{stats?.comment_count ?? post.comment_count}</span>
          <button onClick={() => setShowReport({ type: 'post', id: post.id })} className="flex items-center gap-2 text-sm text-campus-text-tertiary hover:text-destructive transition-colors"><Flag className="w-4 h-4" />举报</button>
          <button onClick={() => setShowShare(true)} className="flex items-center gap-2 text-sm text-campus-text-tertiary hover:text-primary transition-colors ml-auto"><Share2 className="w-4 h-4" />分享</button>
          <button onClick={fetchVersions} className="flex items-center gap-2 text-sm text-campus-text-tertiary hover:text-primary transition-colors"><History className="w-4 h-4" />历史</button>
        </div>
      </article>

      {/* Stats card */}
      {stats && (
        <div className="card mt-4 p-4">
          <h3 className="text-sm font-semibold font-display mb-3">帖子统计</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div><div className="text-lg font-bold font-display">{stats.view_count}</div><div className="text-xs text-campus-text-tertiary font-body">浏览</div></div>
            <div><div className="text-lg font-bold font-display">{stats.like_count}</div><div className="text-xs text-campus-text-tertiary font-body">点赞</div></div>
            <div><div className="text-lg font-bold font-display">{stats.comment_count}</div><div className="text-xs text-campus-text-tertiary font-body">评论</div></div>
            <div><div className="text-lg font-bold font-display">{stats.favorite_count}</div><div className="text-xs text-campus-text-tertiary font-body">收藏</div></div>
          </div>
        </div>
      )}

      {/* Version history modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowVersions(false)}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-display flex items-center gap-2"><History className="w-5 h-5" />编辑历史</h3>
              <button onClick={() => setShowVersions(false)} className="p-1 hover:bg-background rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {versions.length === 0 && <p className="text-center text-campus-text-tertiary py-8 font-body">暂无编辑记录</p>}
            {versions.map(v => (
              <div key={v.id} className="p-3 mb-2 rounded-lg bg-surface-hover">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium font-body">{v.editor_name}</span>
                  <span className="text-xs text-campus-text-tertiary">{new Date(v.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-campus-text-secondary mt-1 line-clamp-2 font-body">{v.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="mt-8">
        <h2 className="font-handwrite text-xl font-semibold text-campus-text-primary mb-6">评论 ({comments.length})</h2>
        <div className="space-y-4">
          {comments.filter(c => c.parent_id === null).map(c => (
            <CommentItem key={c.id} comment={c} allComments={comments} user={user}
              onReply={(id, name) => setReplyTo({ id, name })}
              onDelete={handleDeleteComment}
              onReport={(cid) => setShowReport({ type: 'comment', id: cid })}
              onEdit={(cid, content) => {}}
              depth={0} />
          ))}
          {comments.length === 0 && (
            <div className="card text-center py-12"><p className="text-campus-text-tertiary font-body">暂无评论，快来发表第一条评论吧！</p></div>
          )}
        </div>
      </div>

      {/* Comment form */}
      <form onSubmit={handleComment} className="card mt-6">
        {replyTo && (
          <div className="flex items-center justify-between text-sm text-campus-text-secondary mb-3 font-body">
            <span>回复 @{replyTo.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-destructive hover:text-destructive-hover flex items-center gap-1"><X className="w-4 h-4" />取消</button>
          </div>
        )}
        <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
          className="input !min-h-[100px] resize-none" placeholder={user ? '写下你的评论...' : '请先登录'} maxLength={1000} required />
        <button type="submit" disabled={!user || !commentText.trim()} className="mt-4 btn-primary font-body">发表评论</button>
      </form>

      {showShare && <ShareModal postId={post.id} title={post.title} onClose={() => setShowShare(false)} />}
      {showReport && <ReportDialog targetType={showReport.type} targetId={showReport.id} onClose={() => setShowReport(null)} />}
    </div>
    </>
  );
}
