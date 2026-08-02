import { Upload, FileText, Download as DownloadIcon, Trash2 } from 'lucide-react';
import { teamsApi } from '../../lib/api';
import type { TeamFile } from '../../types/api';
import type { User } from '../../stores/auth';
import { toastStore } from '../../App';
import { useState } from 'react';

interface Props {
  files: TeamFile[];
  isMember: boolean;
  isAdmin: boolean;
  user: User | null;
  teamId: number;
  loadData: () => Promise<void>;
  setShowFileUploadModal: (v: boolean) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export default function FilesTab({ files, isMember, isAdmin, user, teamId, loadData, setShowFileUploadModal }: Props) {
  const [fileDeleteLoading, setFileDeleteLoading] = useState<number | null>(null);

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('确定删除该文件吗？')) return;
    setFileDeleteLoading(fileId);
    try {
      await teamsApi.deleteTeamFile(teamId, fileId);
      toastStore.success('已删除');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    } finally { setFileDeleteLoading(null); }
  };

  return (
    <div className="space-y-3">
      {isMember && (
        <button
          onClick={() => setShowFileUploadModal(true)}
          className="w-full p-4 bg-surface border-2 border-dashed border-border rounded-xl text-campus-text-secondary hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          上传文件
        </button>
      )}

      {files.length === 0 ? (
        <div className="text-center py-12">
          <Upload className="w-12 h-12 mx-auto text-campus-text-tertiary mb-3" />
          <p className="text-campus-text-secondary">暂无文件</p>
          {!isMember && <p className="text-xs text-campus-text-tertiary mt-2">加入团队后可上传文件</p>}
        </div>
      ) : (
        files.map(file => (
          <div key={file.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-campus-text-primary truncate">{file.originalName}</h4>
              <div className="flex items-center gap-3 text-xs text-campus-text-tertiary mt-0.5">
                <span>{file.displayName || file.username}</span>
                <span>{formatFileSize(file.size)}</span>
                <span>{new Date(file.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <a
                href={teamsApi.getTeamFileDownloadUrl(teamId, file.id)}
                download={file.originalName}
                className="p-2 rounded-lg hover:bg-primary/10 text-campus-text-secondary hover:text-primary transition-colors"
                title="下载"
              >
                <DownloadIcon className="w-5 h-5" />
              </a>
              {(isAdmin || file.authorId === user?.id) && (
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  disabled={fileDeleteLoading === file.id}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-campus-text-secondary hover:text-destructive transition-colors"
                  title="删除"
                >
                  {fileDeleteLoading === file.id ? (
                    <span className="w-5 h-5 block animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
