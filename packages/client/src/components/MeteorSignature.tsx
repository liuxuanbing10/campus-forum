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

  const stateRef = useRef({
    lineIdx: 0,
    charIdx: 0,
    charProgress: 0,
    phase: 'writing',
    pauseTimer: 0,
    fadeAlpha: 1,
  });

  // 每个字的轮廓数据：每列的中心y坐标（用于笔尖起伏）
  const charContoursRef = useRef<{
    centerYs: number[]; // 每列的中心y（相对于字的top）
    width: number;
    height: number;
    x: number; // 字的左边界
    y: number; // 字的中心y
  }[][]>([]);

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
      const fontSize = Math.min(w * 0.11, 56);

      // 预渲染文字（仅 alpha，用于提取轮廓）
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = w * dpr;
      alphaCanvas.height = h * dpr;
      const actx = alphaCanvas.getContext('2d')!;
      actx.scale(dpr, dpr);
      actx.textAlign = 'center';
      actx.textBaseline = 'middle';
      actx.font = `bold ${fontSize}px "ZCOOL KuaiLe", "Ma Shan Zheng", "STXingkai", "Xingkai SC", cursive`;

      // 离屏 canvas：带渐变发光的彩色文字
      const offscreen = document.createElement('canvas');
      offscreen.width = w * dpr;
      offscreen.height = h * dpr;
      const octx = offscreen.getContext('2d')!;
      octx.scale(dpr, dpr);
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.font = `bold ${fontSize}px "ZCOOL KuaiLe", "Ma Shan Zheng", "STXingkai", "Xingkai SC", cursive`;

      const allContours: typeof charContoursRef.current = [];

      lines.forEach((line, lineIdx) => {
        const chars = [...line];
        const charCount = chars.length;
        const charW = w / charCount;
        const yCenter = lineIdx * lineH + lineH / 2;
        const lineContours: typeof allContours[0] = [];

        chars.forEach((char, charIdx) => {
          const xCenter = charIdx * charW + charW / 2;
          const m = actx.measureText(char);
          const cw = m.width;
          const left = xCenter - cw / 2;

          // 渲染到 alpha canvas（纯黑色，只取 alpha）
          actx.fillStyle = '#000';
          actx.fillText(char, xCenter, yCenter);

          // 提取该字的轮廓：每列的中心y
          const colCount = Math.ceil(cw);
          const centerYs: number[] = [];
          const charTop = yCenter - fontSize / 2;

          // 获取该字区域的像素数据
          const imgData = actx.getImageData(
            Math.floor(left * dpr),
            Math.floor(charTop * dpr),
            Math.ceil(cw * dpr),
            Math.ceil(fontSize * dpr)
          );
          const data = imgData.data;
          const pxW = Math.ceil(cw * dpr);
          const pxH = Math.ceil(fontSize * dpr);

          for (let cx = 0; cx < colCount; cx++) {
            // 每列对应的像素范围
            const pxStart = Math.floor(cx / colCount * pxW);
            const pxEnd = Math.min(Math.ceil((cx + 1) / colCount * pxW), pxW);

            let topY = Infinity;
            let bottomY = -Infinity;

            for (let px = pxStart; px < pxEnd; px++) {
              for (let py = 0; py < pxH; py++) {
                const idx = (py * pxW + px) * 4 + 3; // alpha
                if (data[idx] > 128) {
                  const yReal = py / dpr;
                  if (yReal < topY) topY = yReal;
                  if (yReal > bottomY) bottomY = yReal;
                }
              }
            }

            if (topY !== Infinity && bottomY !== -Infinity) {
              centerYs.push((topY + bottomY) / 2); // 相对于字顶部
            } else {
              centerYs.push(-1); // 该列没有文字
            }
          }

          lineContours.push({
            centerYs,
            width: cw,
            height: fontSize,
            x: left,
            y: yCenter,
          });
        });

        allContours.push(lineContours);
      });

      // 渲染彩色文字（多层渐变 + 发光）
      lines.forEach((line, lineIdx) => {
        const chars = [...line];
        const charCount = chars.length;
        const charW = w / charCount;
        const yCenter = lineIdx * lineH + lineH / 2;

        chars.forEach((char, charIdx) => {
          const xCenter = charIdx * charW + charW / 2;

          // 底层外发光
          octx.save();
          octx.shadowColor = 'rgba(255, 120, 0, 0.6)';
          octx.shadowBlur = 20;
          octx.globalAlpha = 0.5;
          octx.fillStyle = '#ff7b00';
          octx.fillText(char, xCenter, yCenter);
          octx.restore();

          // 中层渐变主体
          octx.save();
          octx.shadowColor = 'rgba(255, 200, 50, 0.4)';
          octx.shadowBlur = 10;
          const grad = octx.createLinearGradient(0, yCenter - fontSize / 2, 0, yCenter + fontSize / 2);
          grad.addColorStop(0, '#fff5cc');
          grad.addColorStop(0.4, '#ffd93d');
          grad.addColorStop(0.7, '#ff9f1c');
          grad.addColorStop(1, '#e85d04');
          octx.fillStyle = grad;
          octx.fillText(char, xCenter, yCenter);
          octx.restore();

          // 顶层高光
          octx.save();
          octx.globalCompositeOperation = 'source-atop';
          octx.globalAlpha = 0.35;
          const hlGrad = octx.createLinearGradient(0, yCenter - fontSize / 2, 0, yCenter);
          hlGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
          hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
          octx.fillStyle = hlGrad;
          octx.fillRect(xCenter - fontSize / 2, yCenter - fontSize / 2, fontSize, fontSize);
          octx.restore();
        });
      });

      textCanvasRef.current = offscreen;
      charContoursRef.current = allContours;

      // ── 粒子生成 ──
      const spawnBurst = (x: number, y: number, count: number, intensity: number) => {
        particlesRef.current.push({
          x, y, vx: 0, vy: 0, life: 1, maxLife: 0.25,
          size: 16 * intensity, type: 'glow', hue: 45,
        });
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = (1 + Math.random() * 4) * intensity;
          particlesRef.current.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 1.5 * intensity,
            life: 1,
            maxLife: 0.3 + Math.random() * 0.4,
            size: 1.5 + Math.random() * 2.5,
            type: 'spark',
            hue: 20 + Math.random() * 40,
          });
        }
        for (let i = 0; i < 6; i++) {
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 6,
            vx: -1 - Math.random() * 2,
            vy: (Math.random() - 0.5) * 1,
            life: 1,
            maxLife: 0.4 + Math.random() * 0.3,
            size: 2 + Math.random() * 3,
            type: 'trail',
            hue: 30 + Math.random() * 25,
          });
        }
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.3 - Math.random() * 0.6,
            life: 1,
            maxLife: 1 + Math.random() * 2,
            size: 0.6 + Math.random() * 1.8,
            type: 'dust',
            hue: 35 + Math.random() * 25,
          });
        }
      };

      const spawnPenTip = (x: number, y: number) => {
        if (Math.random() < 0.7) {
          for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 0.5 + Math.random() * 2;
            particlesRef.current.push({
              x, y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd - 0.5,
              life: 1,
              maxLife: 0.25 + Math.random() * 0.3,
              size: 1 + Math.random() * 1.5,
              type: 'spark',
              hue: 30 + Math.random() * 30,
            });
          }
        }
        if (Math.random() < 0.6) {
          particlesRef.current.push({
            x: x - 2, y: y + (Math.random() - 0.5) * 2,
            vx: -0.8 - Math.random() * 1.2,
            vy: (Math.random() - 0.5) * 0.4,
            life: 1,
            maxLife: 0.3 + Math.random() * 0.2,
            size: 1.5 + Math.random() * 1.5,
            type: 'trail',
            hue: 35 + Math.random() * 20,
          });
        }
      };

      // 获取笔尖的 y 坐标（沿文字轮廓起伏）
      const getPenY = (contour: typeof charContoursRef.current[0][0], progress: number) => {
        const { centerYs, height, y } = contour;
        const charTop = y - height / 2;
        const idx = Math.floor(progress * (centerYs.length - 1));
        const clampedIdx = Math.max(0, Math.min(centerYs.length - 1, idx));
        const cy = centerYs[clampedIdx];
        if (cy < 0) {
          // 该列没有文字，用前后插值
          let prevIdx = clampedIdx - 1;
          while (prevIdx >= 0 && centerYs[prevIdx] < 0) prevIdx--;
          let nextIdx = clampedIdx + 1;
          while (nextIdx < centerYs.length && centerYs[nextIdx] < 0) nextIdx++;
          if (prevIdx >= 0 && nextIdx < centerYs.length) {
            const t = (clampedIdx - prevIdx) / (nextIdx - prevIdx);
            return charTop + centerYs[prevIdx] + (centerYs[nextIdx] - centerYs[prevIdx]) * t;
          } else if (prevIdx >= 0) {
            return charTop + centerYs[prevIdx];
          } else if (nextIdx < centerYs.length) {
            return charTop + centerYs[nextIdx];
          }
          return y; // fallback
        }
        return charTop + cy;
      };

      // ── 动画主循环 ──
      const animate = () => {
        ctx.clearRect(0, 0, w, h);

        const state = stateRef.current;
        const allContours = charContoursRef.current;
        const textCanvas = textCanvasRef.current;

        if (!textCanvas || allContours.length === 0) {
          animFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        ctx.save();
        ctx.globalAlpha = state.fadeAlpha;

        // 已完成的整行
        for (let li = 0; li < state.lineIdx; li++) {
          const lineContour = allContours[li];
          if (!lineContour || lineContour.length === 0) continue;
          const firstChar = lineContour[0];
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, firstChar.y - firstChar.height * 1.2, w, firstChar.height * 2.4);
          ctx.clip();
          ctx.drawImage(textCanvas, 0, 0, textCanvas.width / dpr, textCanvas.height / dpr);
          ctx.restore();
        }

        // 当前行
        const currentLine = allContours[state.lineIdx];
        if (currentLine && currentLine.length > 0) {
          const firstChar = currentLine[0];
          const yCenter = firstChar.y;

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, yCenter - firstChar.height * 1.2, w, firstChar.height * 2.4);
          ctx.clip();

          // 已完成的字
          if (state.charIdx > 0) {
            const prevChar = currentLine[state.charIdx - 1];
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, yCenter - firstChar.height * 1.2, prevChar.x + prevChar.width + 4, firstChar.height * 2.4);
            ctx.clip();
            ctx.drawImage(textCanvas, 0, 0, textCanvas.width / dpr, textCanvas.height / dpr);
            ctx.restore();
          }

          // 正在写的字
          if (state.charIdx < currentLine.length) {
            const cc = currentLine[state.charIdx];
            const revealW = cc.width * state.charProgress;

            // 水平揭示文字
            ctx.save();
            ctx.beginPath();
            ctx.rect(cc.x - 2, yCenter - cc.height * 1.2, cc.x + revealW + 4, cc.height * 2.4);
            ctx.clip();
            ctx.drawImage(textCanvas, 0, 0, textCanvas.width / dpr, textCanvas.height / dpr);
            ctx.restore();

            // 笔尖位置（沿轮廓起伏）
            const penX = cc.x + revealW;
            const penY = getPenY(cc, state.charProgress);

            // 笔尖光球（三层）
            ctx.save();
            // 外层
            const outerG = ctx.createRadialGradient(penX, penY, 0, penX, penY, 24);
            outerG.addColorStop(0, 'rgba(255, 200, 80, 0.5)');
            outerG.addColorStop(0.6, 'rgba(255, 140, 20, 0.15)');
            outerG.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = outerG;
            ctx.beginPath();
            ctx.arc(penX, penY, 24, 0, Math.PI * 2);
            ctx.fill();

            // 中层
            const midG = ctx.createRadialGradient(penX, penY, 0, penX, penY, 14);
            midG.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
            midG.addColorStop(0.5, 'rgba(255, 200, 80, 0.5)');
            midG.addColorStop(1, 'rgba(255, 150, 30, 0)');
            ctx.fillStyle = midG;
            ctx.beginPath();
            ctx.arc(penX, penY, 14, 0, Math.PI * 2);
            ctx.fill();

            // 核心
            const coreG = ctx.createRadialGradient(penX, penY, 0, penX, penY, 6);
            coreG.addColorStop(0, 'rgba(255, 255, 255, 1)');
            coreG.addColorStop(0.5, 'rgba(255, 240, 200, 0.8)');
            coreG.addColorStop(1, 'rgba(255, 200, 100, 0)');
            ctx.fillStyle = coreG;
            ctx.beginPath();
            ctx.arc(penX, penY, 6, 0, Math.PI * 2);
            ctx.fill();

            // 彗星尾（椭圆形）
            const tailG = ctx.createLinearGradient(penX - 60, penY, penX + 5, penY);
            tailG.addColorStop(0, 'rgba(255, 120, 20, 0)');
            tailG.addColorStop(0.4, 'rgba(255, 180, 40, 0.25)');
            tailG.addColorStop(0.8, 'rgba(255, 220, 100, 0.6)');
            tailG.addColorStop(1, 'rgba(255, 250, 200, 0.9)');
            ctx.fillStyle = tailG;
            ctx.beginPath();
            ctx.ellipse(penX - 27, penY, 32, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // 笔尖粒子
            spawnPenTip(penX, penY);
          }

          ctx.restore();
        }

        ctx.restore();

        // 更新状态
        if (state.phase === 'writing') {
          const lineChars = currentLine;
          if (!lineChars) {
            state.phase = 'pausing';
            state.pauseTimer = 0;
          } else if (state.charIdx < lineChars.length) {
            // 书写速度：起笔慢、行笔快、收笔稍慢
            let speed = 0.032;
            const p = state.charProgress;
            if (p < 0.15) speed = 0.018 + p * 0.1;
            else if (p > 0.85) speed = 0.028 - (p - 0.85) * 0.15;
            else speed = 0.032;

            state.charProgress += speed;

            if (state.charProgress >= 1) {
              state.charProgress = 1;
              const cc = lineChars[state.charIdx];
              // 字写完爆发
              const penY = getPenY(cc, 1);
              spawnBurst(cc.x + cc.width, penY, 16, 1.3);
              state.charIdx++;
              state.charProgress = 0;

              if (state.charIdx >= lineChars.length) {
                state.lineIdx++;
                state.charIdx = 0;
                if (state.lineIdx >= allContours.length) {
                  state.phase = 'pausing';
                  state.pauseTimer = 0;
                }
              }
            }
          }
        } else if (state.phase === 'pausing') {
          state.pauseTimer += 1 / 60;
          if (state.pauseTimer > 2.2) {
            state.phase = 'fading';
            state.fadeAlpha = 1;
          }
        } else if (state.phase === 'fading') {
          state.fadeAlpha -= 0.022;
          if (state.fadeAlpha <= 0) {
            state.lineIdx = 0;
            state.charIdx = 0;
            state.charProgress = 0;
            state.phase = 'writing';
            state.fadeAlpha = 1;
            state.pauseTimer = 0;
            particlesRef.current = [];
          }
        }

        // 粒子更新绘制
        const particles = particlesRef.current;
        const fadeMult = state.fadeAlpha;

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          if (p.type === 'spark') {
            p.vy += 0.07;
            p.vx *= 0.97;
          } else if (p.type === 'trail') {
            p.vx *= 0.94;
            p.vy *= 0.94;
          } else if (p.type === 'dust') {
            p.vy -= 0.004;
          } else if (p.type === 'glow') {
            p.size *= 0.94;
          }

          p.life -= 1 / 60 / p.maxLife;

          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = p.life * fadeMult;

          if (p.type === 'glow') {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, `hsla(${p.hue}, 100%, 85%, 1)`);
            g.addColorStop(0.5, `hsla(${p.hue}, 100%, 60%, 0.4)`);
            g.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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
            ctx.globalAlpha = p.life * 0.55 * fadeMult;
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
