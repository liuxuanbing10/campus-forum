import { useState } from 'react';
import { X, Link as LinkIcon, Check, Share2, MessageCircle } from 'lucide-react';
import { toastStore } from '../App';
import { Dialog, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';

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

  const shareToWechat = () => {
    // 微信分享 - 复制链接引导
    copyLink();
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogClose onClick={onClose} />
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" /> 分享
        </DialogTitle>
      </DialogHeader>

      <p className="text-sm font-medium mb-1 font-display truncate">{title}</p>
      <p className="text-xs text-muted-foreground mb-4 font-body break-all">{shareUrl}</p>

      <div className="flex gap-3">
        <Button onClick={copyLink} className="flex-1">
          {copied ? <><Check className="w-4 h-4" /> 已复制</> : <><LinkIcon className="w-4 h-4" /> 复制链接</>}
        </Button>
      </div>
    </Dialog>
  );
}
