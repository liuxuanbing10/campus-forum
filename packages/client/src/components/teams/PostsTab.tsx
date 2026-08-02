import { FileText, Pin, Trash2, Plus } from 'lucide-react';
import { teamsApi } from '../../lib/api';
import type { TeamContentPost } from '../../types/api';
import { toastStore } from '../../App';

interface Props {
  posts: TeamContentPost[];
  postSearch: string;
  postSort: 'newest' | 'oldest';
  setPostSearch: (v: string) => void;
  setPostSort: (v: 'newest' | 'oldest') => void;
  isMember: boolean;
  isAdmin: boolean;
  teamId: number;
  loadData: () => Promise<void>;
  navigate: (to: string) => void;
  setShowPostModal: (v: boolean) => void;
}

export default function PostsTab({ posts, postSearch, postSort, setPostSearch, setPostSort, isMember, isAdmin, teamId, loadData, navigate, setShowPostModal }: Props) {
  const handleDeleteContentPost = async (postId: number) => {
    if (!confirm('确定删除该帖子吗？')) return;
    try {
      await teamsApi.deleteTeamContentPost(teamId, postId);
      toastStore.success('已删除');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-campus-text-tertiary">{posts.length} 篇帖子</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={postSearch}
            onChange={e => setPostSearch(e.target.value)}
            placeholder="搜索帖子..."
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 w-36"
          />
          <button
            onClick={() => setPostSort(postSort === 'newest' ? 'oldest' : 'newest')}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-campus-text-secondary hover:border-primary/30 transition-colors whitespace-nowrap"
          >
            {postSort === 'newest' ? '最新' : '最早'}
          </button>
        </div>
      </div>

      {isMember && (
        <button
          onClick={() => setShowPostModal(true)}
          className="w-full p-4 bg-surface border-2 border-dashed border-border rounded-xl text-campus-text-secondary hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          发表新帖
        </button>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-campus-text-tertiary mb-3" />
          <p className="text-campus-text-secondary">暂无帖子</p>
          {!isMember && <p className="text-xs text-campus-text-tertiary mt-2">加入团队后可发帖</p>}
        </div>
      ) : (
        posts.filter(p => !postSearch || p.title.toLowerCase().includes(postSearch.toLowerCase()))
          .sort((a, b) => postSort === 'newest'
            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ).map(post => (
          <div
            key={post.id}
            onClick={() => navigate(`/teams/${teamId}/post/${post.id}`)}
            className="bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-card transition-all"
          >
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-campus-text-primary hover:text-primary transition-colors mb-1">
                {post.isPinned === 1 && <Pin className="w-3.5 h-3.5 inline mr-1 text-primary" />}
                {post.title}
              </h4>
              {isAdmin && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleDeleteContentPost(post.id);
                  }}
                  className="p-1 text-campus-text-tertiary hover:text-destructive transition-colors flex-shrink-0 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-sm text-campus-text-secondary line-clamp-2 mb-2">{post.content}</p>
            <div className="flex items-center gap-3 text-xs text-campus-text-tertiary">
              <span>{post.displayName || post.username}</span>
              <span>{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
