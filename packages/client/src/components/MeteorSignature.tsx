import { useEffect, useRef, useCallback } from 'react';

interface MeteorSignatureProps {
  lines: string[];
  className?: string;
}

// 单个笔画点
interface StrokePoint {
  x: number;
  y: number;
  speed: number;
}

// 流星头部粒子
interface MeteorParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

export default function MeteorSignature({ lines, className }: MeteorSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const phaseRef = useRef(0); // 0=画第一行, 1=画第二行, 2=展示停留, 3=淡出
  const progressRef = useRef(0); // 当前行的绘制进度 0~1
  const fadeAlphaRef = useRef(1); // 淡出透明度
  const timerRef = useRef(0); // 停留/淡出计时器
  const strokesRef = useRef<StrokePoint[][]>([]); // 预计算的笔画路径
  const particlesRef = useRef<MeteorParticle[]>([]); // 流星拖尾粒子
  const drawSpeedRef = useRef(0.006); // 绘制速度
  const dprRef = useRef(1);

  // 预计算文字的笔画路径（将文字渲染到离屏 canvas 提取轮廓点）
  const computeStrokes = useCallback((width: number, height: number, dpr: number) => {
    const lineH = height / lines.length;
    const fontSize = Math.min(width * 0.12, 64);
    const result: StrokePoint[][] = [];

    const offscreen = document.createElement('canvas');
    offscreen.width = width * dpr;
    offscreen.height = height * dpr;
    const octx = offscreen.getContext('2d')!;

    lines.forEach((text, lineIdx) => {
      const y0 = lineIdx * lineH;

      // 在离屏 canvas 上绘制文字
      octx.clearRect(0, 0, offscreen.width, offscreen.height);
      octx.save();
      octx.scale(dpr, dpr);
      octx.font = `bold ${fontSize}px "ZCOOL KuaiLe", "Ma Shan Zheng", cursive`;
      octx.fillStyle = '#fff';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillText(text, width / 2, y0 + lineH / 2);
      octx.restore();

      // 提取像素
      const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
      const pixels = imgData.data;

      // 采样文字轮廓点
      const points: StrokePoint[] = [];
      const step = Math.max(2, Math.floor(3 / dpr)); // 采样步长

      for (let sy = 0; sy < offscreen.height; sy += step) {
        for (let sx = 0; sx < offscreen.width; sx += step) {
          const idx = (sy * offscreen.width + sx) * 4;
          if (pixels[idx + 3] > 128) {
            points.push({
              x: sx / dpr,
              y: sy / dpr,
              speed: 0.5 + Math.random() * 0.5,
            });
          }
        }
      }

      if (points.length === 0) {
        result.push([]);
        return;
      }

      // 按扫描线排序，模拟手写从左到右的笔画顺序
      points.sort((a, b) => {
        const rowA = Math.round(a.y / (step * 2));
        const rowB = Math.round(b.y / (step * 2));
        if (rowA !== rowB) return rowA - rowB;
        // 奇数行反向，减少笔画跳跃
        return rowA % 2 === 0 ? a.x - b.x : b.x - a.x;
      });

      // 简化路径：每隔几个点取一个，减少绘制量
      const simplified: StrokePoint[] = [];
      const skip = Math.max(1, Math.floor(points.length / 800));
      for (let i = 0; i < points.length; i += skip) {
        simplified.push(points[i]);
      }

      result.push(simplified);
    });

    return result;
  }, [lines]);

  // 生成流星拖尾粒子
  const spawnParticles = useCallback((x: number, y: number, count: number) => {
    const particles = particlesRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.4 + Math.random() * 0.6,
        size: 1 + Math.random() * 2.5,
        hue: 40 + Math.random() * 20, // 金色色相
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    // 延迟初始化，等布局稳定
    const initTimer = setTimeout(() => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 预计算笔画路径
      strokesRef.current = computeStrokes(w, h, dpr);

      // 根据路径长度调整绘制速度
      const totalPoints = strokesRef.current.reduce((sum, s) => sum + s.length, 0);
      drawSpeedRef.current = Math.max(0.003, Math.min(0.008, 600 / totalPoints));
    }, 100);

    // 动画循环
    const animate = () => {
      if (canvas.width === 0 || canvas.height === 0) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const w = canvas.width / dprRef.current;
      const h = canvas.height / dprRef.current;
      ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const phase = phaseRef.current;
      const progress = progressRef.current;
      const strokes = strokesRef.current;

      // ── 绘制已完成的笔画 ──
      const drawStroke = (strokeIdx: number, pct: number, alpha: number) => {
        const stroke = strokes[strokeIdx];
        if (!stroke || stroke.length === 0) return;
        const count = Math.floor(pct * stroke.length);
        if (count < 2) return;

        // 笔画主体 - 金色发光
        ctx.save();
        ctx.globalAlpha = alpha;

        // 外层光晕
        ctx.shadowColor = 'rgba(255, 180, 50, 0.6)';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255, 200, 80, 0.3)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < count; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();

        // 中层
        ctx.shadowColor = 'rgba(255, 160, 30, 0.8)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(255, 210, 100, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < count; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();

        // 核心高亮
        ctx.shadowColor = 'rgba(255, 255, 200, 1)';
        ctx.shadowBlur = 3;
        ctx.strokeStyle = 'rgba(255, 240, 180, 0.9)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < count; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();

        ctx.restore();
      };

      if (phase === 0) {
        // 画第一行
        drawStroke(0, progress, 1);
        // 流星头
        const s0 = strokes[0];
        if (s0 && s0.length > 0) {
          const idx = Math.min(Math.floor(progress * s0.length), s0.length - 1);
          const headPt = s0[idx];
          // 绘制流星头部光点
          ctx.save();
          const grad = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, 8);
          grad.addColorStop(0, 'rgba(255, 255, 230, 1)');
          grad.addColorStop(0.3, 'rgba(255, 200, 80, 0.8)');
          grad.addColorStop(1, 'rgba(255, 150, 30, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // 生成拖尾粒子
          spawnParticles(headPt.x, headPt.y, 2);
        }
        // 推进进度
        progressRef.current += drawSpeedRef.current;
        if (progressRef.current >= 1) {
          progressRef.current = 0;
          phaseRef.current = 1;
        }
      } else if (phase === 1) {
        // 画第二行（第一行已完成）
        drawStroke(0, 1, 1);
        drawStroke(1, progress, 1);
        // 流星头
        const s1 = strokes[1];
        if (s1 && s1.length > 0) {
          const idx = Math.min(Math.floor(progress * s1.length), s1.length - 1);
          const headPt = s1[idx];
          ctx.save();
          const grad = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, 8);
          grad.addColorStop(0, 'rgba(255, 255, 230, 1)');
          grad.addColorStop(0.3, 'rgba(255, 200, 80, 0.8)');
          grad.addColorStop(1, 'rgba(255, 150, 30, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          spawnParticles(headPt.x, headPt.y, 2);
        }
        progressRef.current += drawSpeedRef.current;
        if (progressRef.current >= 1) {
          progressRef.current = 0;
          phaseRef.current = 2;
          timerRef.current = 0;
        }
      } else if (phase === 2) {
        // 停留展示
        drawStroke(0, 1, 1);
        drawStroke(1, 1, 1);
        timerRef.current += 1 / 60;
        if (timerRef.current > 2) { // 展示2秒
          phaseRef.current = 3;
          fadeAlphaRef.current = 1;
        }
      } else if (phase === 3) {
        // 淡出
        fadeAlphaRef.current -= 0.015;
        if (fadeAlphaRef.current <= 0) {
          fadeAlphaRef.current = 0;
          // 重新开始
          phaseRef.current = 0;
          progressRef.current = 0;
          particlesRef.current = [];
        }
        drawStroke(0, 1, fadeAlphaRef.current);
        drawStroke(1, 1, fadeAlphaRef.current);
      }

      // ── 绘制拖尾粒子 ──
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / 60 / p.maxLife;
        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life * 0.7 * (phase === 3 ? fadeAlphaRef.current : 1);
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        pg.addColorStop(0, `hsla(${p.hue}, 100%, 80%, 1)`);
        pg.addColorStop(1, `hsla(${p.hue}, 100%, 60%, 0)`);
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(initTimer);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [computeStrokes, spawnParticles, lines]);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', minHeight: '80px' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
