import { UserPlus, Check, X } from 'lucide-react';
import { teamsApi } from '../../lib/api';
import type { TeamMember } from '@campus-forum/core';
import { toastStore } from '../../App';

interface Props {
  teamId: number;
  applications: TeamMember[];
  loadData: () => Promise<void>;
}

export default function PendingApplications({ teamId, applications, loadData }: Props) {
  const handleApprove = async (userId: number) => {
    try {
      await teamsApi.approveMember(teamId, userId);
      toastStore.success('已批准');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleReject = async (userId: number) => {
    try {
      await teamsApi.rejectMember(teamId, userId);
      toastStore.success('已拒绝');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
      <h3 className="font-semibold text-campus-text-primary mb-4 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        待审批申请 ({applications.length})
      </h3>
      <div className="space-y-3">
        {applications.map(app => (
          <div key={app.id} className="flex items-center justify-between p-3 bg-surface-hover rounded-xl">
            <span className="text-campus-text-primary">{app.display_name || app.username}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(app.user_id)}
                className="btn-primary btn-xs btn-inline flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                通过
              </button>
              <button
                onClick={() => handleReject(app.user_id)}
                className="btn-secondary btn-xs btn-inline flex items-center gap-1 text-destructive"
              >
                <X className="w-3.5 h-3.5" />
                拒绝
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
