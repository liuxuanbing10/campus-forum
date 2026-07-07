import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, CheckCheck, MessageCircle, Heart, UserPlus, AtSign, AlertCircle } from 'lucide-react';
import { notificationsApi, Notification } from '../lib/api';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'comment':
    case 'reply':
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'like':
      return <Heart className="w-5 h-5 text-red-500" />;
    case 'mention':
      return <AtSign className="w-5 h-5 text-yellow-500" />;
    case 'team_join':
    case 'team_application':
      return <UserPlus className="w-5 h-5 text-green-500" />;
    case 'system':
    default:
      return <AlertCircle className="w-5 h-5 text-primary" />;
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications(page);
      if (page === 1) {
        setNotifications(res.data.notifications);
      } else {
        setNotifications(prev => [...prev, ...res.data.notifications]);
      }
      setHasMore(res.data.notifications.length >= 20);
    } catch {
      toastStore.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.data.unread_count);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      toastStore.warning('请先登录');
      navigate('/login');
      return;
    }
    fetchNotifications();
    fetchUnreadCount();
  }, [user, page, fetchNotifications, fetchUnreadCount]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      toastStore.success('已全部标记为已读');
    } catch {
      toastStore.error('操作失败');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.is_read === 0) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, is_read: 1 } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    }
    if (notification.related_type === 'post' && notification.related_id) {
      navigate(`/post/${notification.related_id}`);
    }
  };

  const loadMore = () => setPage(p => p + 1);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-campus-text-secondary" />
          </button>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-campus-text-primary font-display">消息通知</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-destructive text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            全部已读
          </button>
        )}
      </div>

      {loading && page === 1 && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-campus-text-secondary">加载中...</p>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-16">
          <Bell className="w-16 h-16 text-campus-text-tertiary mx-auto mb-4" />
          <p className="text-campus-text-secondary text-lg">暂无通知</p>
          <p className="text-campus-text-tertiary text-sm mt-2">有新消息会在这里显示</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`bg-surface border rounded-xl p-4 cursor-pointer transition-all hover:shadow-card ${
              notification.is_read === 0
                ? 'border-primary/30 bg-primary/5'
                : 'border-border'
            }`}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-campus-text-primary text-sm">
                    {notification.title}
                    {notification.is_read === 0 && (
                      <span className="inline-block w-2 h-2 bg-destructive rounded-full ml-2 mb-0.5" />
                    )}
                  </h4>
                  <span className="text-xs text-campus-text-tertiary flex-shrink-0">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-campus-text-secondary mt-1 line-clamp-2">
                  {notification.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 border border-border hover:border-primary/50 text-campus-text-primary rounded-xl text-sm transition-colors"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  );
}
