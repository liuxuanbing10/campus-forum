import { useState } from 'react';
import { reportApi } from '../lib/api';
import { toastStore } from '../App';
import { X, Flag, Loader2 } from 'lucide-react';

interface Props {
  targetType: 'post' | 'comment';
  targetId: number;
  onClose: () => void;
}

const REASONS = ['垃圾广告', '色情低俗', '人身攻击', '侵犯版权', '虚假信息', '其他'];

export default function ReportDialog({ targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { toastStore.warning('请选择举报原因'); return; }
    setLoading(true);
    try {
      await reportApi.create({ target_type: targetType, target_id: targetId, reason, description });
      toastStore.success('举报已提交，感谢您的反馈');
      onClose();
    } catch (e: any) {
      toastStore.error(e.response?.data?.error || '举报失败');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-display flex items-center gap-2"><Flag className="w-5 h-5 text-red-500" /> 举报</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-campus-text-secondary mb-4 font-body">请选择举报原因：</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`px-3 py-2 rounded-lg text-sm font-body transition-all ${
                reason === r ? 'bg-primary text-white' : 'bg-surface-hover text-campus-text-secondary hover:bg-border'
              }`}>{r}</button>
          ))}
        </div>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="补充说明（可选）" rows={3}
          className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body resize-none focus:outline-none focus:border-primary" />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-hover text-campus-text-secondary font-body hover:bg-border transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={loading || !reason}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-body hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} 提交举报
          </button>
        </div>
      </div>
    </div>
  );
}
