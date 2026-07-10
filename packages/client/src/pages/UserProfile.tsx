import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { userApi, followApi } from '../lib/api';
import type { UserProfile as UserProfileType, UserPost, UserComment } from '@campus-forum/core';
import { toastStore } from '../App';
import { ArrowLeft, Calendar, Edit3, MessageCircle, Eye, ThumbsUp, Users, Award, ChevronRight } from 'lucide-react';
import FollowButton from '../components/FollowButton';
import LevelBadge from '../components/LevelBadge';
import MetaManager from '../components/MetaManager';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id || '0');
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState({ points: 0, level: '' });

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      userApi.getProfile(userId),
      userApi.getPosts(userId),
      userApi.getComments(userId),
      userApi.getPoints(userId),
    ]).then(([p, ps, cs, pt]) => {
      setProfile(p.data);
      setPosts(ps.data.posts);
      setComments(cs.data.comments);
      setPoints(pt.data);
    }).catch(() => toastStore.error('加载用户信息失败'))
    .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-center py-12 text-campus-text-tertiary font-body">加载中...</div>;
  if (!profile) return <div className="text-center py-12 text-campus-text-tertiary font-body">用户不存在</div>;

  const isOwn = currentUser?.id === userId;

  return (
    <>
      <MetaManager
        title={`${profile.displayName || profile.username} 的个人主页`}
        description={`${profile.displayName} 的校园论坛个人主页，查看其发布的帖子和评论`}
        keywords={`${profile.username},个人主页,校园论坛`}
        ogType="profile"
        canonical={`${window.location.origin}/user/${id}`}
      />
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-campus-text-tertiary hover:text-primary transition-colors font-body mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Link>

      {/* Profile card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : profile.displayName?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold font-display">{profile.displayName}</h1>
              <LevelBadge points={points.points || 0} size="sm" />
            </div>
            <p className="text-sm text-campus-text-tertiary mt-1 font-body">@{profile.username}</p>
            {!isOwn && currentUser && <FollowButton userId={userId} className="mt-3" />}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
          {[
            { icon: Edit3, label: '帖子', value: profile.post_count || 0 },
            { icon: MessageCircle, label: '评论', value: profile.comment_count || 0 },
            { icon: Users, label: '粉丝', value: profile.follower_count || 0 },
            { icon: Award, label: '积分', value: points.points || 0 },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-lg font-bold font-display">{s.value}</div>
              <div className="text-xs text-campus-text-tertiary font-body flex items-center justify-center gap-1 mt-0.5">
                <s.icon className="w-3 h-3" /> {s.label}
              </div>
            </div>
          ))}
        </div>
        {points.points > 0 && (
          <div className="mt-3 flex justify-center">
            <LevelBadge points={points.points || 0} size="md" showProgress />
          </div>
        )}
        <div className="text-xs text-campus-text-tertiary mt-3 font-body flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {new Date(profile.created_at).toLocaleDateString('zh-CN')} 加入
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setActiveTab('posts')} className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}>帖子 {posts.length}</button>
        <button onClick={() => setActiveTab('comments')} className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}>评论 {comments.length}</button>
      </div>

      {activeTab === 'posts' && (
        <div className="space-y-3">
          {posts.length === 0 && <p className="text-center text-campus-text-tertiary py-8 font-body">暂无帖子</p>}
          {posts.map(p => (
            <Link key={p.id} to={`/post/${p.id}`} className="card p-4 block hover:bg-surface-hover transition-colors">
              <h3 className="font-medium font-display mb-1">{p.title}</h3>
              <div className="flex items-center gap-4 text-xs text-campus-text-tertiary font-body">
                <span>{p.board_name}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.view_count}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{p.like_count}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{p.comment_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-3">
          {comments.length === 0 && <p className="text-center text-campus-text-tertiary py-8 font-body">暂无评论</p>}
          {comments.map(c => (
            <Link key={c.id} to={`/post/${c.post_id}`} className="card p-4 block hover:bg-surface-hover transition-colors">
              <p className="text-sm text-campus-text-secondary mb-1 line-clamp-2 font-body">{c.content}</p>
              <div className="flex items-center gap-2 text-xs text-campus-text-tertiary font-body">
                <span>回复了 {c.post_title}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .tab-btn { padding: 8px 20px; border-radius: 8px; font-size: 14px; font-family: inherit; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--color-text-secondary); border: 1px solid transparent; }
        .tab-btn.active { background: var(--color-primary); color: white; }
        .tab-btn:hover:not(.active) { background: var(--color-surface-hover); }
      `}</style>
    </div>
    </>
  );
}
