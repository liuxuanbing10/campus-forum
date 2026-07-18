import { useEffect, useRef } from 'react';

interface MeteorSignatureProps {
  lines: string[];
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'spark' | 'trail' | 'dust' | 'glow';
  hue: number;
}

export default function MeteorSignature({ lines, className }: MeteorSignatureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const dprRef = useRef(1);
  const phaseRef = useRef(0); // 0=画第一行, 1=画第二行, 2=停留, 3=淡出
  const progressRef = useRef(0);
  const fadeAlphaRef = useRef(1);
  const timerRef = useRef(0);
  const lineMetricsRef = useRef<{ y: number; height: number; left: number; right: number }[]>([]);
  const lastPenPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    const initTimer = setTimeout(() => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w === 0 || h === 0) return;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const lineCount = lines.length;
      const lineH = h / lineCount;
      const fontSize = Math.min(w * 0.11, 58);

      // 预渲染手写体文字到离屏 canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = w * dpr;
      offscreen.height = h * dpr;
      const octx = offscreen.getContext('2d')!;
      octx.scale(dpr, dpr);

      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.font = `bold ${fontSize}px "ZCOOL KuaiLe", "Ma Shan Zheng", "STXingkai", "Xingkai SC", cursive`;

      const metrics: { y: number; height: number; left: number; right: number }[] = [];

      lines.forEach((text, lineIdx) => {
        const yCenter = lineIdx * lineH + lineH / 2;
        const m = octx.measureText(text);
        const textW = m.width;
        const left = (w - textW) / 2;
        const right = (w + textW) / 2;

        // 多层渐变文字
        // 底层发光
        octx.save();
        octx.shadowColor = 'rgba(255, 140, 0, 0.7)';
        octx.shadowBlur = 25;
        octx.globalAlpha = 0.6;
        octx.fillStyle = '#ff8c00';
        octx.fillText(text, w / 2, yCenter);
        octx.restore();

        // 中层
        octx.save();
        octx.shadowColor = 'rgba(255, 200, 50, 0.5)';
        octx.shadowBlur = 12;
        const grad = octx.createLinearGradient(left, yCenter - fontSize / 2, right, yCenter + fontSize / 2);
        grad.addColorStop(0, '#fff4c2');
        grad.addColorStop(0.3, '#ffe066');
        grad.addColorStop(0.6, '#ffa94d');
        grad.addColorStop(1, '#ff6b35');
        octx.fillStyle = grad;
        octx.fillText(text, w / 2, yCenter);
        octx.restore();

        // 顶层高光
        octx.save();
        octx.globalCompositeOperation = 'source-atop';
        octx.globalAlpha = 0.4;
        const highlightGrad = octx.createLinearGradient(0, yCenter - fontSize / 2, 0, yCenter + fontSize / 2);
        highlightGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
        highlightGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
        highlightGrad.addColorStop(1, 'rgba(255,200,100,0.3)');
        octx.fillStyle = highlightGrad;
        octx.fillRect(left - 10, yCenter - fontSize / 2 - 10, textW + 20, fontSize + 20);
        octx.restore();

        metrics.push({ y: yCenter, height: fontSize, left, right });
      });

      textCanvasRef.current = offscreen;
      lineMetricsRef.current = metrics;

      // 生成流星头的粒子
      const spawnMeteorHead = (x: number, y: number, speed: number) => {
        // 主流星头 - 大而亮的核心
        particlesRef.current.push({
          x, y, vx: 0, vy: 0, life: 1, maxLife: 0.2,
          size: 14, type: 'glow', hue: 45,
        });
        // 第二层光晕
        particlesRef.current.push({
          x, y, vx: 0, vy: 0, life: 1, maxLife: 0.35,
          size: 22, type: 'glow', hue: 35,
        });
        // 火花 - 四散飞溅，带重力
        for (let i = 0; i < 12; i++) {
          const angle = -Math.PI + Math.random() * Math.PI * 2;
          const spd = 1.5 + Math.random() * 4;
          particlesRef.current.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 2,
            life: 1,
            maxLife: 0.35 + Math.random() * 0.35,
            size: 1.5 + Math.random() * 2.5,
            type: 'spark',
            hue: 25 + Math.random() * 35,
          });
        }
        // 长拖尾粒子 - 向左后方延伸
        for (let i = 0; i < 8; i++) {
          const offset = i * 6;
          particlesRef.current.push({
            x: x - offset,
            y: y + (Math.random() - 0.5) * 5,
            vx: -0.5 - Math.random() * 1,
            vy: (Math.random() - 0.5) * 0.8,
            life: 1,
            maxLife: 0.4 + Math.random() * 0.3,
            size: 2.5 + Math.random() * 2.5,
            type: 'trail',
            hue: 30 + Math.random() * 25,
          });
        }
      };

      // 生成星尘粒子
      const spawnDust = (x: number, y: number, range: number) => {
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * range,
            y: y + (Math.random() - 0.5) * range * 0.7,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -0.3 - Math.random() * 0.5,
            life: 1,
            maxLife: 1.2 + Math.random() * 2,
            size: 0.6 + Math.random() * 2,
            type: 'dust',
            hue: 35 + Math.random() * 25,
          });
        }
      };

      const animate = () => {
        ctx.clearRect(0, 0, w, h);

        const phase = phaseRef.current;
        const progress = progressRef.current;
        const metrics = lineMetricsRef.current;
        const textCanvas = textCanvasRef.current;

        if (!textCanvas || metrics.length === 0) {
          animFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        const drawLineWithReveal = (lineIdx: number, pct: number, alpha: number) => {
          const m = metrics[lineIdx];
          if (!m) return;
          const lineW = m.right - m.left;
          const revealW = lineW * pct;
          if (revealW <= 0) return;

          const penX = m.left + revealW;
          const penY = m.y;

          ctx.save();
          ctx.globalAlpha = alpha;

          // 裁剪到当前行
          ctx.beginPath();
          ctx.rect(0, m.y - m.height * 0.9, w, m.height * 1.8);
          ctx.clip();

          // 裁剪水平显示范围
          ctx.beginPath();
          ctx.rect(m.left - 5, m.y - m.height, revealW + 10, m.height * 2);
          ctx.clip();

          // 绘制文字
          ctx.drawImage(textCanvas, 0, 0, textCanvas.width / dpr, textCanvas.height / dpr);

          ctx.restore();

          // 笔尖流星效果（不裁剪，自然溢出）
          if (pct > 0 && pct < 1) {
            // 笔尖核心光球 - 三层渐变
            ctx.save();
            ctx.globalAlpha = alpha;

            // 外层大光晕
            const outerGrad = ctx.createRadialGradient(penX, penY, 0, penX, penY, 25);
            outerGrad.addColorStop(0, 'rgba(255, 200, 80, 0.5)');
            outerGrad.addColorStop(0.5, 'rgba(255, 150, 30, 0.2)');
            outerGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.arc(penX, penY, 25, 0, Math.PI * 2);
            ctx.fill();

            // 中层
            const midGrad = ctx.createRadialGradient(penX, penY, 0, penX, penY, 15);
            midGrad.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
            midGrad.addColorStop(0.4, 'rgba(255, 200, 80, 0.6)');
            midGrad.addColorStop(1, 'rgba(255, 150, 30, 0)');
            ctx.fillStyle = midGrad;
            ctx.beginPath();
            ctx.arc(penX, penY, 15, 0, Math.PI * 2);
            ctx.fill();

            // 核心亮点
            const coreGrad = ctx.createRadialGradient(penX, penY, 0, penX, penY, 6);
            coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            coreGrad.addColorStop(0.5, 'rgba(255, 240, 200, 0.8)');
            coreGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(penX, penY, 6, 0, Math.PI * 2);
            ctx.fill();

            // 横向彗星尾（椭圆形）
            const tailGrad = ctx.createLinearGradient(penX - 70, penY, penX + 5, penY);
            tailGrad.addColorStop(0, 'rgba(255, 120, 20, 0)');
            tailGrad.addColorStop(0.4, 'rgba(255, 180, 40, 0.25)');
            tailGrad.addColorStop(0.8, 'rgba(255, 220, 100, 0.6)');
            tailGrad.addColorStop(1, 'rgba(255, 250, 200, 0.9)');
            ctx.fillStyle = tailGrad;
            ctx.beginPath();
            ctx.ellipse(penX - 32, penY, 37, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // 生成粒子
            spawnMeteorHead(penX, penY, 1);
            spawnDust(penX, penY, m.height * 0.6);
          }

          lastPenPosRef.current = { x: penX, y: penY };
        };

        const drawFullLine = (lineIdx: number, alpha: number) => {
          const m = metrics[lineIdx];
          if (!m) return;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.rect(0, m.y - m.height * 0.9, w, m.height * 1.8);
          ctx.clip();
          ctx.drawImage(textCanvas, 0, 0, textCanvas.width / dpr, textCanvas.height / dpr);
          ctx.restore();
        };

        // 状态机
        if (phase === 0) {
          drawLineWithReveal(0, progress, 1);
          progressRef.current += 0.028;
          if (progressRef.current >= 1) {
            progressRef.current = 0;
            phaseRef.current = 1;
            lastPenPosRef.current = null;
          }
        } else if (phase === 1) {
          drawFullLine(0, 1);
          drawLineWithReveal(1, progress, 1);
          progressRef.current += 0.028;
          if (progressRef.current >= 1) {
            progressRef.current = 0;
            phaseRef.current = 2;
            timerRef.current = 0;
            lastPenPosRef.current = null;
          }
        } else if (phase === 2) {
          drawFullLine(0, 1);
          drawFullLine(1, 1);
          timerRef.current += 1 / 60;
          if (timerRef.current > 2) {
            phaseRef.current = 3;
            fadeAlphaRef.current = 1;
          }
        } else if (phase === 3) {
          fadeAlphaRef.current -= 0.025;
          if (fadeAlphaRef.current <= 0) {
            fadeAlphaRef.current = 0;
            phaseRef.current = 0;
            progressRef.current = 0;
            particlesRef.current = [];
            lastPenPosRef.current = null;
          }
          drawFullLine(0, fadeAlphaRef.current);
          drawFullLine(1, fadeAlphaRef.current);
        }

        // 绘制所有粒子
        const particles = particlesRef.current;
        const fadeMult = phase === 3 ? fadeAlphaRef.current : 1;

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          if (p.type === 'spark') {
            p.vy += 0.08;
            p.vx *= 0.97;
          } else if (p.type === 'trail') {
            p.vx *= 0.95;
            p.vy *= 0.95;
          } else if (p.type === 'dust') {
            p.vy -= 0.005;
          }

          p.life -= 1 / 60 / p.maxLife;

          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = p.life * fadeMult;

          if (p.type === 'glow') {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
            g.addColorStop(0, `hsla(${p.hue}, 100%, 90%, 1)`);
            g.addColorStop(0.5, `hsla(${p.hue}, 100%, 60%, 0.5)`);
            g.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'spark') {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.5);
            g.addColorStop(0, `hsla(${p.hue}, 100%, 85%, 1)`);
            g.addColorStop(1, `hsla(${p.hue}, 100%, 55%, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'trail') {
            ctx.globalAlpha = p.life * 0.6 * fadeMult;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, `hsla(${p.hue}, 100%, 75%, 0.8)`);
            g.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // dust
            ctx.globalAlpha = p.life * 0.5 * fadeMult;
            ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }, 150);

    return () => {
      clearTimeout(initTimer);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [lines]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '120px',
        overflow: 'visible',
      }}
    >
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
