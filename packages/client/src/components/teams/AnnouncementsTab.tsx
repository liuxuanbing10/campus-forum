import { Megaphone, Pin, Trash2 } from 'lucide-react';
import { teamsApi } from '../../lib/api';
import type { TeamAnnouncement } from '../../types/api';
import { toastStore } from '../../App';

interface Props {
  announcements: TeamAnnouncement[];
  isAdmin: boolean;
  teamId: number;
  loadData: () => Promise<void>;
}

export default function AnnouncementsTab({ announcements, isAdmin, teamId, loadData }: Props) {
  const handleDeleteAnnouncement = async (annId: number) => {
    if (!confirm('确定删除该公告吗？')) return;
    try {
      await teamsApi.deleteAnnouncement(teamId, annId);
      toastStore.success('已删除');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      {announcements.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="w-12 h-12 mx-auto text-campus-text-tertiary mb-3" />
          <p className="text-campus-text-secondary">暂无公告</p>
        </div>
      ) : (
        announcements.map(ann => (
          <div key={ann.id} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {ann.isPinned === 1 && (
                  <span className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    <Pin className="w-3 h-3" />
                    置顶
                  </span>
                )}
                <h4 className="font-semibold text-campus-text-primary">{ann.title}</h4>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="p-1 text-campus-text-tertiary hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-campus-text-secondary text-sm whitespace-pre-wrap mb-3">{ann.content}</p>
            <div className="text-xs text-campus-text-tertiary">
              {ann.displayName || ann.username} · {new Date(ann.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
