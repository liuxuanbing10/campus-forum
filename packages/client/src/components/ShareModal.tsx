import { useState } from 'react';
import { X, Link as LinkIcon, Check, Share2, QrCode } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { QRCode } from './QRCode';
import { copy } from '../lib/copy';

interface Props {
  postId: number;
  title: string;
  onClose: () => void;
}

export default function ShareModal({ postId, title, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const shareUrl = `${window.location.origin}/post/${postId}`;

  const copyLink = async () => {
    const ok = await copy(shareUrl, '链接已复制');
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

      {showQR && (
        <div className="flex justify-center mb-4">
          <QRCode value={shareUrl} size={160} className="rounded-lg border border-border" />
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={copyLink} className="flex-1">
          {copied ? <><Check className="w-4 h-4" /> 已复制</> : <><LinkIcon className="w-4 h-4" /> 复制链接</>}
        </Button>
        <Button variant="outline" onClick={() => setShowQR(v => !v)}>
          <QrCode className="w-4 h-4" />
          {showQR ? '隐藏' : '二维码'}
        </Button>
      </div>
    </Dialog>
  );
}
