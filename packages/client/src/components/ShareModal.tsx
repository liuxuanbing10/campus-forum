import { useState } from 'react';
import { postsApi } from '../lib/api';
import { X, Link as LinkIcon, Check, Share2, MessageCircle } from 'lucide-react';
import { toastStore } from '../App';

interface Props {
  postId: number;
  title: string;
  onClose: () => void;
}

export default function ShareModal({ postId, title, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/post/${postId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toastStore.success('链接已复制');
    }).catch(() => toastStore.error('复制失败'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-display flex items-center gap-2"><Share2 className="w-5 h-5" /> 分享</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm font-medium mb-1 font-display truncate">{title}</p>
        <p className="text-xs text-campus-text-tertiary mb-4 font-body">{shareUrl}</p>
        <div className="flex gap-3">
          <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-body">
            {copied ? <><Check className="w-4 h-4" /> 已复制</> : <><LinkIcon className="w-4 h-4" /> 复制链接</>}
          </button>
        </div>
      </div>
    </div>
  );
}
