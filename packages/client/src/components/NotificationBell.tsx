import { useEffect, useState } from 'react';
import api from '../lib/api';

interface Notification {
  id: number; type: string; message: string;
  related_post_id: number | null; is_read: number;
  created_at: string; from_username: string | null;
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchUnread = async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnread(data.unreadCount || 0);
    } catch {}
  };

  const fetchAll = async () => {
    try {
      const { data } = await api.get('/notifications?page=1');
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => { fetchUnread(); }, []);
  useEffect(() => { if (open) fetchAll(); }, [open]);

  const markRead = async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    fetchAll();
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative text-sm text-gray-500 hover:text-primary-600 transition-colors">
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="font-semibold text-sm">通知</span>
              <button onClick={() => api.put('/notifications/read-all').then(fetchUnread)}
                className="text-xs text-primary-600 hover:underline">全部已读</button>
            </div>
            {notifs.length === 0 ? (
              <p className="p-4 text-center text-gray-400 text-sm">暂无通知</p>
            ) : (
              notifs.map(n => (
                <div key={n.id} onClick={() => { if (!n.is_read) markRead(n.id); }}
                  className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${!n.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <div className="flex gap-2">
                    <span className="text-lg">{n.type === 'reply' ? '💬' : '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.from_username || '系统'} · {n.created_at?.slice(0, 10)}</p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
