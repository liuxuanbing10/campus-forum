import { useState, useRef, useEffect, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

interface StrokeEditorProps {
  text: string;
  onSave: (strokes: Stroke[][]) => void;
  onClose: () => void;
}

export default function StrokeEditor({ text, onSave, onClose }: StrokeEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [charIdx, setCharIdx] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [fontSize, setFontSize] = useState(120);
  const lastPointRef = useRef<Point | null>(null);

  const chars = [...text];

  const initStrokes = useCallback(() => {
    const initial: Stroke[][] = [];
    for (let i = 0; i < chars.length; i++) {
      initial.push([]);
    }
    setStrokes(initial);
  }, [chars.length]);

  useEffect(() => {
    initStrokes();
  }, [initStrokes]);

  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const canvas = canvasRef.current;
    if (!bgCanvas || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    bgCanvas.width = w * dpr;
    bgCanvas.height = h * dpr;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const bgCtx = bgCanvas.getContext('2d')!;
    bgCtx.scale(dpr, dpr);

    bgCtx.fillStyle = '#1a1a2e';
    bgCtx.fillRect(0, 0, w, h);

    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    bgCtx.font = `bold ${fontSize}px "ZCOOL KuaiLe", "Ma Shan Zheng", "STXingkai", "Xingkai SC", cursive`;
    bgCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    bgCtx.fillText(chars[charIdx] || '', w / 2, h / 2);

    bgCtx.strokeStyle = 'rgba(255, 200, 100, 0.2)';
    bgCtx.lineWidth = 1;
    bgCtx.setLineDash([5, 5]);
    bgCtx.beginPath();
    bgCtx.moveTo(w / 2, 0);
    bgCtx.lineTo(w / 2, h);
    bgCtx.moveTo(0, h / 2);
    bgCtx.lineTo(w, h / 2);
    bgCtx.stroke();
    bgCtx.setLineDash([]);

    redrawStrokes();
  }, [charIdx, fontSize, chars]);

  const redrawStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const charStrokes = strokes[charIdx] || [];
    charStrokes.forEach((stroke, idx) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = `hsl(${30 + idx * 15}, 100%, 60%)`;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [strokes, charIdx]);

  useEffect(() => {
    redrawStrokes();
  }, [redrawStrokes]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    setCurrentStroke([pos]);
    lastPointRef.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const last = lastPointRef.current || pos;
    const colorIdx = (strokes[charIdx]?.length || 0);
    ctx.strokeStyle = `hsl(${30 + colorIdx * 15}, 100%, 60%)`;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setCurrentStroke(prev => [...prev, pos]);
    lastPointRef.current = pos;
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      setStrokes(prev => {
        const next = [...prev];
        next[charIdx] = [...(next[charIdx] || []), { points: currentStroke }];
        return next;
      });
    }
    setCurrentStroke([]);
    lastPointRef.current = null;
  };

  const undoStroke = () => {
    setStrokes(prev => {
      const next = [...prev];
      if (next[charIdx] && next[charIdx].length > 0) {
        next[charIdx] = next[charIdx].slice(0, -1);
      }
      return next;
    });
  };

  const clearChar = () => {
    setStrokes(prev => {
      const next = [...prev];
      next[charIdx] = [];
      return next;
    });
  };

  const clearAll = () => {
    if (confirm('确定清空所有字的笔画吗？')) {
      initStrokes();
    }
  };

  const prevChar = () => {
    if (charIdx > 0) setCharIdx(charIdx - 1);
  };

  const nextChar = () => {
    if (charIdx < chars.length - 1) setCharIdx(charIdx + 1);
  };

  const handleSave = () => {
    onSave(strokes);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">笔画编辑器</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {chars.map((c, i) => (
            <button
              key={i}
              onClick={() => setCharIdx(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg text-lg font-bold transition-all ${
                i === charIdx
                  ? 'bg-amber-500 text-white scale-110'
                  : strokes[i]?.length > 0
                  ? 'bg-green-600/50 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={prevChar}
            disabled={charIdx === 0}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-40 hover:bg-slate-600"
          >
            ← 上一个
          </button>
          <button
            onClick={nextChar}
            disabled={charIdx === chars.length - 1}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-40 hover:bg-slate-600"
          >
            下一个 →
          </button>
          <div className="flex-1" />
          <span className="px-4 py-2 text-amber-400 font-mono">
            第 {strokes[charIdx]?.length || 0} 笔
          </span>
        </div>

        <div className="relative rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '1/1' }}>
          <canvas
            ref={bgCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>

        <div className="flex gap-2 mb-4">
          <label className="text-slate-400 text-sm flex items-center gap-2">
            字号:
            <input
              type="range"
              min="60"
              max="180"
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-white font-mono w-12">{fontSize}</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={undoStroke}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500"
          >
            ↶ 撤销一笔
          </button>
          <button
            onClick={clearChar}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
          >
            清空当前字
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700"
          >
            清空全部
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg hover:from-amber-400 hover:to-orange-400"
          >
            ✓ 保存并使用
          </button>
        </div>

        <p className="mt-4 text-slate-500 text-sm">
          提示：用鼠标在字上面描笔画，每描完一笔松开鼠标。描完所有字后点击"保存并使用"。
        </p>
      </div>
    </div>
  );
}

export type { Stroke, Point };
