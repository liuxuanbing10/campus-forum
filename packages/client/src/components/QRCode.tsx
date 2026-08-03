/** @file QRCode 二维码展示/生成组件 */
import React from 'react';
import QRCodeLib from 'qrcode';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QRCodeType = typeof import('qrcode');

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className = '' }: QRCodeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    QRCodeLib.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((dataUrl: string) => {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = dataUrl;
    }).catch(() => {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#6b7280';
      ctx.font = `${size / 20}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', size / 2, size / 2);
    });
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} className={className} />;
}

export function QRShareCard({ url, label = '扫码分享' }: { url: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg">
      <QRCode value={url} size={180} className="rounded" />
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
