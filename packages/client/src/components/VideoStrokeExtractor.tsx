import { useState, useRef, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

interface VideoStrokeExtractorProps {
  onExtract: (strokes: Stroke[]) => void;
  onClose: () => void;
}

export default function VideoStrokeExtractor({ onExtract, onClose }: VideoStrokeExtractorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [error, setError] = useState('');

  // 处理视频上传
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('请上传视频文件');
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setStrokes([]);
    setError('');
  }, [videoUrl]);

  // 检测笔尖：找"新变暗"的像素重心
  const detectPenTip = (cur: Uint8ClampedArray, prev: Uint8ClampedArray, w: number, h: number): Point | null => {
    let sumX = 0, sumY = 0, count = 0;
    // 步长 2 提速
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const curLum = (cur[idx] + cur[idx + 1] + cur[idx + 2]) / 3;
        const prevLum = (prev[idx] + prev[idx + 1] + prev[idx + 2]) / 3;
        // 当前暗且比上一帧明显变暗（新写的笔画）
        if (curLum < 100 && prevLum - curLum > 25) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }
    if (count > 5) {
      return { x: sumX / count, y: sumY / count };
    }
    return null;
  };

  // 主提取函数
  const extractStrokes = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError('视频未加载');
      return;
    }

    setProcessing(true);
    setError('');

    const canvas = document.createElement('canvas');
    // 降采样到 320 宽度提速
    const scale = Math.min(1, 320 / video.videoWidth);
    const w = Math.floor(video.videoWidth * scale);
    const h = Math.floor(video.videoHeight * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const duration = video.duration;
    const fps = 15; // 采样 15 帧/秒
    const totalFrames = Math.floor(duration * fps);
    const frameInterval = 1 / fps;

    const result: Stroke[] = [];
    let currentStroke: Point[] = [];
    let prevData: Uint8ClampedArray | null = null;

    // 抬笔距离阈值（视频坐标系下）
    const liftThreshold = w * 0.25;

    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = i * frameInterval;
      // 等待 seek 完成
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
      });

      ctx.drawImage(video, 0, 0, w, h);
      const frameData = ctx.getImageData(0, 0, w, h).data;

      if (prevData) {
        const tip = detectPenTip(frameData, prevData, w, h);
        if (tip) {
          if (currentStroke.length > 0) {
            const last = currentStroke[currentStroke.length - 1];
            const dist = Math.hypot(tip.x - last.x, tip.y - last.y);
            if (dist > liftThreshold) {
              // 抬笔，保存当前笔画
              if (currentStroke.length > 2) {
                result.push({ points: currentStroke });
              }
              currentStroke = [tip];
            } else if (dist > 1) {
              // 正常移动，过滤静止重复点
              currentStroke.push(tip);
            }
          } else {
            currentStroke = [tip];
          }
        }
      }

      prevData = new Uint8ClampedArray(frameData);
      setProgress(Math.round((i / totalFrames) * 100));
    }

    // 最后一笔
    if (currentStroke.length > 2) {
      result.push({ points: currentStroke });
    }

    // 坐标映射到编辑器画布（400x400）
    const canvasSize = 400;
    const mappedStrokes = result.map(stroke => ({
      points: stroke.points.map(p => ({
        x: (p.x / w) * canvasSize,
        y: (p.y / h) * canvasSize,
      })),
    }));

    setStrokes(mappedStrokes);
    drawPreview(mappedStrokes, w, h);
    setProcessing(false);
    setProgress(100);
  };

  // 预览提取结果
  const drawPreview = (strokes: Stroke[], vw: number, vh: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    // 画视频首帧作为背景参考
    const video = videoRef.current;
    if (video) {
      ctx.globalAlpha = 0.2;
      ctx.drawImage(video, 0, 0, size, size);
      ctx.globalAlpha = 1;
    }

    strokes.forEach((stroke, idx) => {
      ctx.strokeStyle = `hsl(${30 + idx * 15}, 100%, 60%)`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });
  };

  const handleUse = () => {
    if (strokes.length === 0) {
      setError('没有提取到笔画，请检查视频是否为白纸深色笔书写');
      return;
    }
    onExtract(strokes);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">视频导入笔画</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="mb-4">
          <label className="block text-slate-400 text-sm mb-2">
            上传手写视频（建议：白纸 + 深色笔 + 固定机位 + 均匀光线）
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFile}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-500 file:text-white file:cursor-pointer hover:file:bg-amber-400"
          />
        </div>

        {videoUrl && (
          <div className="mb-4">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full rounded-lg max-h-64 bg-black"
              controls
              playsInline
            />
          </div>
        )}

        {error && (
          <div className="mb-4 text-red-400 text-sm">{error}</div>
        )}

        {videoUrl && !processing && strokes.length === 0 && (
          <button
            onClick={extractStrokes}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:from-blue-400 hover:to-purple-400 mb-4"
          >
            开始提取笔画
          </button>
        )}

        {processing && (
          <div className="mb-4">
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-slate-400 text-sm mt-2">分析中... {progress}%</p>
          </div>
        )}

        {strokes.length > 0 && (
          <>
            <div className="mb-4">
              <canvas
                ref={previewCanvasRef}
                className="w-full rounded-lg bg-slate-800"
                style={{ aspectRatio: '1/1' }}
              />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-green-400 text-sm">
                ✓ 提取到 {strokes.length} 笔
              </span>
              <button
                onClick={extractStrokes}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                重新提取
              </button>
            </div>
            <button
              onClick={handleUse}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg hover:from-amber-400 hover:to-orange-400"
            >
              使用这些笔画
            </button>
          </>
        )}

        <div className="mt-4 text-slate-500 text-xs space-y-1">
          <p>· 拍摄要求：深色笔在白纸上书写，摄像头固定不动</p>
          <p>· 光线均匀，避免阴影和反光</p>
          <p>· 每个字单独拍一段视频效果最好</p>
          <p>· 提取后可在预览中确认，不满意可重新提取</p>
        </div>
      </div>
    </div>
  );
}
