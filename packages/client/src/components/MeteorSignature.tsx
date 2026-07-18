import { useEffect, useRef } from 'react';

// opentype.js 的类型（简化）
interface OTPath {
  commands: { type: string; x: number; y: number; x1?: number; y1?: number; x2?: number; y2?: number }[];
}
interface OTGlyph {
  advanceWidth: number;
  getPath(x: number, y: number, fontSize: number): OTPath;
  getBoundingBox(): { x1: number; y1: number; x2: number; y2: number };
}
interface OTFont {
  unitsPerEm: number;
  charToGlyph(c: string): OTGlyph;
}

interface MeteorSignatureProps {
  lines: string[];
  className?: string;
}

interface PathCommand {
  cmd: string; // M, L, C, Q, Z
  points: { x: number; y: number }[];
}

interface CharPathData {
  char: string;
  paths: PathCommand[][]; // 一个字可能有多个子路径（笔画/部首）
  x: number; // 字在画布中的 x 坐标
  y: number; // baseline y
  width: number;
  height: number;
  advance: number; // 字距
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'glow' | 'spark' | 'trail' | 'dust';
  hue: number;
}

interface WritingState {
  lineIdx: number;
  charIdx: number;
  pathIdx: number; // 当前字的第几条子路径
  pathProgress: number; // 当前子路径的进度 0-1
  phase: 'writing' | 'pausing' | 'done';
  pauseTimer: number;
  fadeAlpha: number;
  cycle: number;
}

// 将 opentype.js 的 path 命令转换为简化结构
function parsePathCommands(pathData: OTPath): PathCommand[] {
  const commands: PathCommand[] = [];
  for (const cmd of pathData.commands) {
    if (cmd.type === 'M') {
      commands.push({ cmd: 'M', points: [{ x: cmd.x, y: cmd.y }] });
    } else if (cmd.type === 'L') {
      commands.push({ cmd: 'L', points: [{ x: cmd.x, y: cmd.y }] });
    } else if (cmd.type === 'C') {
      commands.push({
        cmd: 'C',
        points: [
          { x: cmd.x1!, y: cmd.y1! },
          { x: cmd.x2!, y: cmd.y2! },
          { x: cmd.x, y: cmd.y },
        ],
      });
    } else if (cmd.type === 'Q') {
      commands.push({
        cmd: 'Q',
        points: [
          { x: cmd.x1!, y: cmd.y1! },
          { x: cmd.x, y: cmd.y },
        ],
      });
    } else if (cmd.type === 'Z') {
      commands.push({ cmd: 'Z', points: [] });
    }
  }
  return commands;
}

// 将子路径分割成连续的段（M-L-C-Q-Z 为一组）
function splitSubPaths(commands: PathCommand[]): PathCommand[][] {
  const subPaths: PathCommand[][] = [];
  let current: PathCommand[] = [];
  for (const cmd of commands) {
    if (cmd.cmd === 'M' && current.length > 0) {
      subPaths.push(current);
      current = [];
    }
    current.push(cmd);
  }
  if (current.length > 0) subPaths.push(current);
  return subPaths;
}

// 计算贝塞尔曲线上的点
function bezierPoint(t: number, p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3?: { x: number; y: number }) {
  if (p3) {
    // 三次贝塞尔
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    };
  }
  // 二次贝塞尔
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

// 沿子路径采样点，返回路径上的离散点和总长度
function sampleSubPath(subPath: PathCommand[]): { points: { x: number; y: number }[]; length: number } {
  const points: { x: number; y: number }[] = [];
  if (subPath.length === 0) return { points, length: 0 };

  let currentPos = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };

  for (const cmd of subPath) {
    if (cmd.cmd === 'M') {
      currentPos = cmd.points[0];
      startPos = cmd.points[0];
      points.push(currentPos);
    } else if (cmd.cmd === 'L') {
      const target = cmd.points[0];
      // 直线段采样
      const steps = Math.max(2, Math.ceil(Math.hypot(target.x - currentPos.x, target.y - currentPos.y) / 3));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push({ x: currentPos.x + (target.x - currentPos.x) * t, y: currentPos.y + (target.y - currentPos.y) * t });
      }
      currentPos = target;
    } else if (cmd.cmd === 'C') {
      const p1 = cmd.points[0];
      const p2 = cmd.points[1];
      const p3 = cmd.points[2];
      // 贝塞尔曲线采样
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push(bezierPoint(t, currentPos, p1, p2, p3));
      }
      currentPos = p3;
    } else if (cmd.cmd === 'Q') {
      const p1 = cmd.points[0];
      const p2 = cmd.points[1];
      const steps = 15;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push(bezierPoint(t, currentPos, p1, p2));
      }
      currentPos = p2;
    } else if (cmd.cmd === 'Z') {
      // 闭合到起点
      const steps = Math.max(2, Math.ceil(Math.hypot(startPos.x - currentPos.x, startPos.y - currentPos.y) / 3));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push({ x: currentPos.x + (startPos.x - currentPos.x) * t, y: currentPos.y + (startPos.y - currentPos.y) * t });
      }
      currentPos = startPos;
    }
  }

  // 计算总长度
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  return { points, length };
}

// 动态加载脚本
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    if (window.opentype) { resolve(); return; }
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load ' + url));
    document.head.appendChild(script);
  });
}

export default function MeteorSignature({ lines, className }: MeteorSignatureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const fontRef = useRef<OTFont | null>(null);
  const charPathsRef = useRef<CharPathData[][]>([]);
  const sampledPathsRef = useRef<{ points: { x: number; y: number }[]; length: number }[][][]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const stateRef = useRef<WritingState>({
    lineIdx: 0,
    charIdx: 0,
    pathIdx: 0,
    pathProgress: 0,
    phase: 'writing',
    pauseTimer: 0,
    fadeAlpha: 1,
    cycle: 0,
  });

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = canvasRef.current!;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    let mounted = true;
    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;

    // 加载字体（用 UMD 版本避免 vite ESM 预构建问题）
    const otUrl = 'https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js';
    Promise.all([
      fetch('/ZCOOLKuaiLe.ttf').then((res) => res.arrayBuffer()),
      loadScript(otUrl),
    ])
      .then(([buffer]) => {
        if (!mounted) return;
        // @ts-ignore - opentype 是 UMD 全局变量
        const font = window.opentype.parse(buffer) as OTFont;
        fontRef.current = font;
        init();
      })
      .catch((err) => {
        console.error('字体加载失败', err);
      });

    function init() {
      const rect = container!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w === 0 || h === 0) {
        setTimeout(init, 100);
        return;
      }

      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + 'px';
      canvas!.style.height = h + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const font = fontRef.current;
      if (!font) return;

      const lineCount = lines.length;
      const lineH = h / lineCount;
      const fontSize = Math.min(w * 0.12, 52);

      const allCharPaths: CharPathData[][] = [];
      const allSampled: { points: { x: number; y: number }[]; length: number }[][][] = [];

      lines.forEach((line, lineIdx) => {
        const chars = [...line];
        // 计算整行宽度
        let totalAdvance = 0;
        const charAdvances: number[] = [];
        for (const c of chars) {
          const glyph = font.charToGlyph(c);
          const advance = (glyph.advanceWidth || 0) * (fontSize / font.unitsPerEm);
          charAdvances.push(advance);
          totalAdvance += advance;
        }

        const startX = (w - totalAdvance) / 2;
        const baselineY = lineIdx * lineH + lineH / 2 + fontSize * 0.35;

        const lineCharPaths: CharPathData[] = [];
        const lineSampled: { points: { x: number; y: number }[]; length: number }[][] = [];

        let curX = startX;
        chars.forEach((c, ci) => {
          const glyph = font.charToGlyph(c);
          const fontScale = fontSize / font.unitsPerEm;
          // 获取字形路径
          const path = glyph.getPath(curX, baselineY, fontSize);
          const commands = parsePathCommands(path);
          const subPaths = splitSubPaths(commands);

          // 采样每条子路径
          const sampled = subPaths.map((sp) => sampleSubPath(sp));

          // 计算字的边界
          const bbox = glyph.getBoundingBox();
          const charW = (bbox.x2 - bbox.x1) * fontScale;
          const charH = (bbox.y2 - bbox.y1) * fontScale;

          lineCharPaths.push({
            char: c,
            paths: subPaths,
            x: curX,
            y: baselineY,
            width: charAdvances[ci],
            height: charH,
            advance: charAdvances[ci],
          });
          lineSampled.push(sampled);

          curX += charAdvances[ci];
        });

        allCharPaths.push(lineCharPaths);
        allSampled.push(lineSampled);
      });

      charPathsRef.current = allCharPaths;
      sampledPathsRef.current = allSampled;

      // 重置状态
      stateRef.current = {
        lineIdx: 0,
        charIdx: 0,
        pathIdx: 0,
        pathProgress: 0,
        phase: 'writing',
        pauseTimer: 0,
        fadeAlpha: 1,
        cycle: 0,
      };
      particlesRef.current = [];

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animate();
    }

    // ── 粒子系统 ──
    function spawnParticle(x: number, y: number, type: Particle['type'], intensity = 1) {
      const particles = particlesRef.current;
      switch (type) {
        case 'glow':
          particles.push({ x, y, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, life: 1, maxLife: 30 + Math.random() * 20, size: 8 + Math.random() * 12, type, hue: 40 + Math.random() * 20 });
          break;
        case 'spark':
          for (let i = 0; i < 3 * intensity; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 3;
            particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.5, life: 1, maxLife: 20 + Math.random() * 30, size: 1 + Math.random() * 2, type, hue: 30 + Math.random() * 30 });
          }
          break;
        case 'trail':
          particles.push({ x, y, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, life: 1, maxLife: 15 + Math.random() * 15, size: 3 + Math.random() * 5, type, hue: 45 + Math.random() * 15 });
          break;
        case 'dust':
          if (Math.random() < 0.3) {
            particles.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 0.2, vy: -0.3 - Math.random() * 0.5, life: 1, maxLife: 40 + Math.random() * 30, size: 0.5 + Math.random() * 1.5, type, hue: 40 });
          }
          break;
      }
    }

    function updateParticles() {
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.type === 'spark') {
          p.vy += 0.05; // 重力
          p.vx *= 0.98;
        } else if (p.type === 'dust') {
          p.vy *= 0.99;
          p.vx *= 0.99;
        }
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
    }

    function drawParticles() {
      const particles = particlesRef.current;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const alpha = p.life;
        const r = p.size * (p.type === 'spark' ? p.life : 1);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        const color = `hsla(${p.hue}, 100%, ${p.type === 'dust' ? 50 : 65}%, ${alpha})`;
        grad.addColorStop(0, color);
        grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── 绘制笔尖 ──
    function drawPenTip(x: number, y: number, intensity: number) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // 外层光晕
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 25 * intensity);
      grad.addColorStop(0, 'rgba(255, 220, 150, 0.9)');
      grad.addColorStop(0.3, 'rgba(255, 180, 80, 0.5)');
      grad.addColorStop(1, 'rgba(255, 150, 50, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 25 * intensity, 0, Math.PI * 2);
      ctx.fill();
      // 核心亮点
      const core = ctx.createRadialGradient(x, y, 0, x, y, 6);
      core.addColorStop(0, 'rgba(255, 255, 240, 1)');
      core.addColorStop(1, 'rgba(255, 220, 150, 0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── 沿采样路径绘制已完成的笔画（填充） ──
    function drawCompletedChars(alpha: number) {
      const allChars = charPathsRef.current;
      const allSampled = sampledPathsRef.current;
      const state = stateRef.current;

      ctx.save();
      ctx.globalAlpha = alpha;

      // 已完成的行
      for (let li = 0; li <= state.lineIdx; li++) {
        const lineChars = allChars[li];
        const lineSampled = allSampled[li];
        if (!lineChars) continue;

        const isCurrentLine = li === state.lineIdx;
        const charEnd = isCurrentLine ? state.charIdx : lineChars.length;

        for (let ci = 0; ci < charEnd; ci++) {
          const sampled = lineSampled[ci];
          if (!sampled) continue;
          // 填充字的路径
          drawFilledChar(sampled);
        }
      }

      ctx.restore();
    }

    function drawFilledChar(sampled: { points: { x: number; y: number }[]; length: number }[]) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 220, 150, 0.95)';
      ctx.shadowColor = 'rgba(255, 180, 80, 0.6)';
      ctx.shadowBlur = 12;
      for (const subPath of sampled) {
        if (subPath.points.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(subPath.points[0].x, subPath.points[0].y);
        for (let i = 1; i < subPath.points.length; i++) {
          ctx.lineTo(subPath.points[i].x, subPath.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // ── 绘制当前正在写的笔画（描边动画） ──
    function drawCurrentChar(alpha: number) {
      const state = stateRef.current;
      const allChars = charPathsRef.current;
      const allSampled = sampledPathsRef.current;

      const currentLine = allSampled[state.lineIdx];
      if (!currentLine) return;

      const currentSampled = currentLine[state.charIdx];
      if (!currentSampled) return;

      ctx.save();
      ctx.globalAlpha = alpha;

      // 已完成的子路径（填充）
      for (let pi = 0; pi < state.pathIdx; pi++) {
        if (currentSampled[pi]) {
          drawFilledSubPath(currentSampled[pi]);
        }
      }

      // 当前子路径（部分描边）
      if (state.pathIdx < currentSampled.length) {
        const subPath = currentSampled[state.pathIdx];
        if (subPath && subPath.points.length > 1) {
          drawPartialPath(subPath, state.pathProgress);
        }
      }

      ctx.restore();
    }

    function drawFilledSubPath(sampled: { points: { x: number; y: number }[]; length: number }) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 220, 150, 0.95)';
      ctx.shadowColor = 'rgba(255, 180, 80, 0.6)';
      ctx.shadowBlur = 12;
      if (sampled.points.length < 3) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(sampled.points[0].x, sampled.points[0].y);
      for (let i = 1; i < sampled.points.length; i++) {
        ctx.lineTo(sampled.points[i].x, sampled.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawPartialPath(sampled: { points: { x: number; y: number }[]; length: number }, progress: number) {
      const totalLen = sampled.length;
      if (totalLen === 0) return;
      const targetLen = progress * totalLen;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 220, 150, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 180, 80, 0.8)';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(sampled.points[0].x, sampled.points[0].y);

      let accLen = 0;
      let penX = sampled.points[0].x;
      let penY = sampled.points[0].y;
      let drawn = false;

      for (let i = 1; i < sampled.points.length; i++) {
        const dx = sampled.points[i].x - sampled.points[i - 1].x;
        const dy = sampled.points[i].y - sampled.points[i - 1].y;
        const segLen = Math.hypot(dx, dy);
        if (accLen + segLen >= targetLen) {
          const t = (targetLen - accLen) / segLen;
          penX = sampled.points[i - 1].x + dx * t;
          penY = sampled.points[i - 1].y + dy * t;
          ctx.lineTo(penX, penY);
          drawn = true;
          break;
        }
        ctx.lineTo(sampled.points[i].x, sampled.points[i].y);
        accLen += segLen;
      }
      if (!drawn) {
        const last = sampled.points[sampled.points.length - 1];
        penX = last.x;
        penY = last.y;
      }
      ctx.stroke();
      ctx.restore();

      // 笔尖效果
      drawPenTip(penX, penY, 1);
      spawnParticle(penX, penY, 'trail');
      spawnParticle(penX, penY, 'glow');
      if (Math.random() < 0.4) spawnParticle(penX, penY, 'spark');
      if (Math.random() < 0.2) spawnParticle(penX, penY, 'dust');
    }

    // ── 动画主循环 ──
    function animate() {
      ctx.clearRect(0, 0, w, h);

      const state = stateRef.current;
      const allChars = charPathsRef.current;
      const allSampled = sampledPathsRef.current;

      if (allChars.length === 0) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // 绘制已完成的部分
      drawCompletedChars(state.fadeAlpha);

      // 绘制当前正在写的字
      if (state.phase === 'writing') {
        drawCurrentChar(state.fadeAlpha);
      }

      // 更新粒子
      updateParticles();
      drawParticles();

      // 更新状态
      if (state.phase === 'writing') {
        const currentLine = allSampled[state.lineIdx];
        if (!currentLine) {
          state.phase = 'pausing';
          state.pauseTimer = 0;
        } else {
          const currentChar = currentLine[state.charIdx];
          if (!currentChar) {
            // 换行
            state.lineIdx++;
            state.charIdx = 0;
            state.pathIdx = 0;
            state.pathProgress = 0;
            if (state.lineIdx >= allSampled.length) {
              state.phase = 'pausing';
              state.pauseTimer = 0;
            }
          } else if (state.pathIdx < currentChar.length) {
            const subPath = currentChar[state.pathIdx];
            if (subPath && subPath.length > 0) {
              // 速度：根据路径长度调整，保持视觉匀速
              const speed = Math.min(0.04, Math.max(0.015, 30 / subPath.length));
              state.pathProgress += speed;

              if (state.pathProgress >= 1) {
                state.pathProgress = 1;
                // 子路径完成，生成爆发粒子
                if (subPath.points.length > 0) {
                  const last = subPath.points[subPath.points.length - 1];
                  for (let i = 0; i < 8; i++) spawnParticle(last.x, last.y, 'spark', 1.5);
                }
                state.pathIdx++;
                state.pathProgress = 0;

                if (state.pathIdx >= currentChar.length) {
                  // 字写完了
                  state.charIdx++;
                  state.pathIdx = 0;
                  state.pathProgress = 0;

                  if (state.charIdx >= currentLine.length) {
                    state.lineIdx++;
                    state.charIdx = 0;
                    if (state.lineIdx >= allSampled.length) {
                      state.phase = 'pausing';
                      state.pauseTimer = 0;
                    }
                  }
                }
              }
            } else {
              state.pathIdx++;
            }
          } else {
            state.charIdx++;
            state.pathIdx = 0;
            state.pathProgress = 0;
          }
        }
      } else if (state.phase === 'pausing') {
        state.pauseTimer++;
        if (state.pauseTimer > 120) {
          // 淡出
          state.fadeAlpha -= 0.02;
          if (state.fadeAlpha <= 0) {
            // 重新开始
            state.lineIdx = 0;
            state.charIdx = 0;
            state.pathIdx = 0;
            state.pathProgress = 0;
            state.phase = 'writing';
            state.fadeAlpha = 1;
            state.cycle++;
            particlesRef.current = [];
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }

    // 等容器尺寸就绪后延迟初始化
    const timer = setTimeout(() => {
      if (fontRef.current) {
        init();
      }
    }, 200);

    const resizeObserver = new ResizeObserver(() => {
      if (fontRef.current) init();
    });
    resizeObserver.observe(container);

    return () => {
      mounted = false;
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [lines]);

  return (
    <div ref={containerRef} className={className} style={{ minHeight: '180px' }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
