import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../lib/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  content: string;
  related_id: number | null;
  related_type: string | null;
  is_read: number;
  created_at: string;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchUnread = async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnread(data.unread_count || data.unreadCount || 0);
    } catch {}
  };

  const fetchAll = async () => {
    try {
      const { data } = await api.get('/notifications?page=1');
      setNotifs(data.notifications || []);
    } catch {}
  };

  useEffect(() => { fetchUnread(); }, []);
  useEffect(() => { if (open) fetchAll(); }, [open]);

  const markRead = async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    setUnread(prev => Math.max(0, prev - 1));
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setUnread(0);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    if (n.related_type === 'post' && n.related_id) {
      navigate(`/post/${n.related_id}`);
    }
  };

  const goToNotifications = () => {
    setOpen(false);
    navigate('/notifications');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-background rounded-lg transition-colors relative"
      >
        <Bell className="w-5 h-5 text-campus-text-secondary" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-destructive text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-80 bg-surface border border-border rounded-xl shadow-card max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-border flex justify-between items-center sticky top-0 bg-surface">
              <span className="font-semibold text-sm text-campus-text-primary">通知</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                >
                  全部已读
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <p className="p-8 text-center text-campus-text-tertiary text-sm">暂无通知</p>
            ) : (
              <div>
                {notifs.slice(0, 10).map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 border-b border-border cursor-pointer transition-colors ${
                      !n.is_read ? 'bg-primary/5' : 'hover:bg-background'
                    }`}
                  >
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-campus-text-primary font-medium truncate">
                          {n.title}
                        </p>
                        <p className="text-xs text-campus-text-secondary mt-0.5 line-clamp-1">
                          {n.content}
                        </p>
                        <p className="text-xs text-campus-text-tertiary mt-1">
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={goToNotifications}
                  className="w-full p-3 text-sm text-primary hover:bg-background transition-colors text-center border-t border-border"
                >
                  查看全部 →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
