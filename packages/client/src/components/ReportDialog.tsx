import { useState } from 'react';
import { reportApi } from '../lib/api';
import { toastStore } from '../App';
import { Flag, Loader2 } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';
import { Button } from './ui/button';

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
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogClose onClick={onClose} />
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-destructive" /> 举报
        </DialogTitle>
        <DialogDescription>请选择举报原因：</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {REASONS.map(r => (
          <button key={r} onClick={() => setReason(r)}
            className={`px-3 py-2 rounded-lg text-sm font-body transition-all ${
              reason === r ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground hover:bg-border'
            }`}>{r}</button>
        ))}
      </div>

      <textarea value={description} onChange={e => setDescription(e.target.value)}
        placeholder="补充说明（可选）" rows={3}
        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-body resize-none focus:outline-none focus:border-primary" />

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button variant="destructive" onClick={handleSubmit} disabled={loading || !reason}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          提交举报
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
