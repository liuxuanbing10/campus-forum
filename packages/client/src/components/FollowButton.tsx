import { useState, useEffect } from 'react';
import { followApi } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { toastStore } from '../App';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface Props {
  userId: number;
  className?: string;
  onToggle?: (isFollowing: boolean) => void;
}

export default function FollowButton({ userId, className = '', onToggle }: Props) {
  const { user } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    followApi.check(userId).then(r => {
      setIsFollowing(r.data.isFollowing);
    }).catch(() => {}).finally(() => setChecking(false));
  }, [userId, user]);

  const handleToggle = async () => {
    if (!user) { toastStore.warning('请先登录'); return; }
    setLoading(true);
    try {
      if (isFollowing) {
        await followApi.unfollow(userId);
        setIsFollowing(false);
        onToggle?.(false);
        toastStore.success('已取消关注');
      } else {
        await followApi.follow(userId);
        setIsFollowing(true);
        onToggle?.(true);
        toastStore.success('已关注');
      }
    } catch { toastStore.error('操作失败'); }
    finally { setLoading(false); }
  };

  if (checking) return <div className={`h-8 w-20 rounded-lg bg-surface-hover animate-pulse ${className}`} />;
  if (!user) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all font-body ${
        isFollowing
          ? 'bg-surface-hover text-campus-text-secondary hover:bg-red-50 hover:text-red-500 border border-border'
          : 'bg-primary text-white hover:bg-primary-hover'
      } ${loading ? 'opacity-60' : ''} ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
      {isFollowing ? '已关注' : '关注'}
    </button>
  );
}
