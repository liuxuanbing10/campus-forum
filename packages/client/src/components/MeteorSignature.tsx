import { useEffect, useRef } from 'react';
import HanziWriter from 'hanzi-writer';

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
}

export default function MeteorSignature({ lines, className }: MeteorSignatureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const writersRef = useRef<{ writer: HanziWriter; element: HTMLElement }[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const dprRef = useRef(1);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空容器
    container.innerHTML = '';
    writersRef.current = [];

    // 延迟初始化，等布局稳定
    const initTimer = setTimeout(() => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // 设置 canvas 尺寸
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const lineCount = lines.length;
      const lineH = h / lineCount;
      const fontSize = Math.min(w * 0.13, 64);

      lines.forEach((line, lineIdx) => {
        const chars = [...line];
        const totalChars = chars.length;
        const charW = w / totalChars;
        const startX = charW / 2;
        const yCenter = lineIdx * lineH + lineH / 2;

        chars.forEach((char, charIdx) => {
          const charDiv = document.createElement('div');
          charDiv.style.position = 'absolute';
          charDiv.style.left = `${startX + charIdx * charW - fontSize * 0.6}px`;
          charDiv.style.top = `${yCenter - fontSize * 0.6}px`;
          charDiv.style.width = `${fontSize * 1.2}px`;
          charDiv.style.height = `${fontSize * 1.2}px`;
          charDiv.style.filter = 'drop-shadow(0 0 8px rgba(255, 200, 50, 0.6)) drop-shadow(0 0 16px rgba(255, 150, 30, 0.3))';
          container.appendChild(charDiv);

          const writer = HanziWriter.create(charDiv, char, {
            width: fontSize * 1.2,
            height: fontSize * 1.2,
            padding: 2,
            strokeColor: '#ffd93d',
            radicalColor: '#ff9f1c',
            strokeAnimationSpeed: 1.2,
            delayBetweenStrokes: 80,
            showOutline: false,
            showCharacter: false,
            onComplete: () => {},
          });

          writersRef.current.push({ writer, element: charDiv });
        });
      });

      // 依次书写每一行
      const startWriting = () => {
        let charIndex = 0;
        const totalChars = writersRef.current.length;

        const writeNext = () => {
          if (charIndex >= totalChars) {
            // 全部写完，停留2秒后清空重写
            setTimeout(() => {
              writersRef.current.forEach(item => item.writer.hideCharacter());
              particlesRef.current = [];
              setTimeout(() => {
                charIndex = 0;
                writeNext();
              }, 600);
            }, 2500);
            return;
          }

          const { writer, element: charDiv } = writersRef.current[charIndex];
          const parentRect = container.getBoundingClientRect();
          const charRect = charDiv.getBoundingClientRect();
          const centerX = charRect.left - parentRect.left + charRect.width / 2;
          const centerY = charRect.top - parentRect.top + charRect.height / 2;

          // 在字的位置生成大量粒子（流星效果）
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            particlesRef.current.push({
              x: centerX + (Math.random() - 0.5) * fontSize * 0.5,
              y: centerY + (Math.random() - 0.5) * fontSize * 0.5,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 1,
              life: 1,
              maxLife: 0.5 + Math.random() * 0.8,
              size: 2 + Math.random() * 4,
            });
          }

          writer.animateCharacter({
            onComplete: () => {
              charIndex++;
              setTimeout(writeNext, 100);
            },
          });
        };

        writeNext();
      };

      // 启动书写动画
      setTimeout(startWriting, 300);

      // 粒子动画循环
      const animate = () => {
        ctx.clearRect(0, 0, w, h);

        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.03;
          p.life -= 1 / 60 / p.maxLife;
          p.vx *= 0.98;
          p.vy *= 0.98;

          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = p.life * 0.85;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          grad.addColorStop(0, 'rgba(255, 255, 220, 1)');
          grad.addColorStop(0.3, 'rgba(255, 220, 100, 0.9)');
          grad.addColorStop(0.7, 'rgba(255, 180, 50, 0.5)');
          grad.addColorStop(1, 'rgba(255, 130, 20, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 持续生成漂浮金粒子，增加氛围感
        if (Math.random() < 0.6) {
          const rx = Math.random() * w;
          const ry = Math.random() * h;
          particlesRef.current.push({
            x: rx,
            y: ry,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.3 - Math.random() * 0.5,
            life: 1,
            maxLife: 2 + Math.random() * 3,
            size: 0.8 + Math.random() * 2,
          });
        }

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }, 150);

    return () => {
      clearTimeout(initTimer);
      cancelAnimationFrame(animFrameRef.current);
      writersRef.current.forEach(item => {
        try { item.writer.cancelQuiz(); } catch {}
        try { item.writer.hideCharacter(); } catch {}
      });
    };
  }, [lines]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '140px',
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
          zIndex: 1,
        }}
      />
    </div>
  );
}
