import { useEffect, useRef } from 'react';
import rough from 'roughjs';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { gsap } from 'gsap';
import { useCallback } from 'react';

export default function SignatureDemo() {
  const inkRef = useRef<HTMLDivElement>(null);
  const pencilRef = useRef<HTMLDivElement>(null);
  const brushRef = useRef<HTMLCanvasElement>(null);
  const meteorRef = useRef<HTMLCanvasElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const proRef = useRef<HTMLCanvasElement>(null);
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  // 效果一：墨水晕染风格
  useEffect(() => {
    if (!inkRef.current) return;
    const container = inkRef.current;
    const text = '指尖流淌星辰海';
    container.innerHTML = '';
    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.cssText = `
        display: inline-block;
        font-family: "Ma Shan Zheng", "ZCOOL XiaoWei", cursive;
        font-size: 2.5rem;
        color: #1f2937;
        position: relative;
        opacity: 0;
        transform: scale(1.2);
        filter: blur(4px);
        animation: ink-in 1.2s ease-out ${i * 0.25}s forwards infinite;
      `;
      // 墨迹扩散外圈
      const blur = document.createElement('span');
      blur.textContent = char;
      blur.style.cssText = `
        position: absolute;
        inset: 0;
        color: #374151;
        opacity: 0;
        filter: blur(8px);
        transform: scale(1.1);
        animation: ink-blob 1.2s ease-out ${i * 0.25}s forwards infinite;
      `;
      span.appendChild(blur);
      container.appendChild(span);
    });
  }, []);

  // 效果二：铅笔手绘风格（rough.js）
  useEffect(() => {
    if (!pencilRef.current) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 400 120');
    svg.setAttribute('width', '100%');
    svg.style.maxWidth = '320px';
    svg.style.height = 'auto';
    const rc = rough.svg(svg);
    const strokeData = [
      'M80,25 L80,95',
      'M45,55 Q80,65 115,55',
      'M55,25 Q80,20 105,25',
      'M60,90 Q80,95 100,90',
      'M180,25 L180,95',
      'M145,55 Q180,65 215,55',
      'M155,25 Q180,20 205,25',
      'M160,90 Q180,95 200,90',
      'M220,30 L220,100',
      'M185,60 Q220,70 255,60',
      'M195,30 Q220,25 245,30',
      'M200,95 Q220,100 240,95',
      'M290,35 L310,35 L300,60 L280,60 L305,100',
    ];
    const allPaths: SVGPathElement[] = [];
    strokeData.forEach((d) => {
      const g = rc.path(d, { stroke: '#4b5563', strokeWidth: 2, roughness: 2.5, bowing: 2 });
      svg.appendChild(g);
      g.querySelectorAll('path').forEach((p) => allPaths.push(p));
    });
    pencilRef.current.innerHTML = '';
    pencilRef.current.appendChild(svg);
    // 按笔画组加逐笔出现动画（每笔画的双线一起出现）
    let strokeIndex = 0;
    for (let i = 0; i < allPaths.length; i += 2) {
      const idx = strokeIndex;
      const p1 = allPaths[i];
      const p2 = allPaths[i + 1];
      const len1 = p1.getTotalLength();
      const len2 = p2 ? p2.getTotalLength() : 0;
      p1.style.strokeDasharray = String(len1);
      p1.style.strokeDashoffset = String(len1);
      p1.animate(
        [{ strokeDashoffset: len1 }, { strokeDashoffset: 0 }],
        { duration: 800, delay: idx * 350, iterations: Infinity, direction: 'normal', easing: 'ease-out' }
      );
      if (p2) {
        p2.style.strokeDasharray = String(len2);
        p2.style.strokeDashoffset = String(len2);
        p2.animate(
          [{ strokeDashoffset: len2 }, { strokeDashoffset: 0 }],
          { duration: 800, delay: idx * 350, iterations: Infinity, direction: 'normal', easing: 'ease-out' }
        );
      }
      strokeIndex++;
    }
  }, []);

  // 效果三：毛笔笔刷（Canvas 粒子）
  useEffect(() => {
    const canvas = brushRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 140 * dpr;
    canvas.style.width = '400px';
    canvas.style.height = '140px';
    ctx!.scale(dpr, dpr);
    // 定义笔画路径（"山"字的简化版，用贝塞尔曲线）
    const strokes = [
      // 竖
      { points: generateBezierPoints(60, 30, 60, 110, 55, 70, 65, 70, 80) },
      // 竖折
      { points: generateBezierPoints(100, 30, 140, 30, 120, 28, 120, 32, 60) },
      { points: generateBezierPoints(140, 30, 140, 110, 135, 70, 145, 70, 80) },
      // 中间竖
      { points: generateBezierPoints(100, 15, 100, 125, 95, 70, 105, 70, 100) },
      // 第二座山
      { points: generateBezierPoints(190, 50, 230, 50, 210, 48, 210, 52, 50) },
      { points: generateBezierPoints(230, 50, 230, 110, 225, 80, 235, 80, 70) },
      { points: generateBezierPoints(190, 50, 190, 110, 185, 80, 195, 80, 70) },
      { points: generateBezierPoints(210, 35, 210, 125, 205, 80, 215, 80, 90) },
    ];
    let animId: number;
    let progress = 0;
    const totalDuration = 3500;
    let startTime: number | null = null;

    function drawStroke(points: { x: number; y: number; width: number }[], t: number) {
      const count = Math.floor(points.length * t);
      if (count < 2) return;
      for (let i = 1; i < count; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        // 用多个小圆点模拟毛笔笔刷，越靠近中间越粗
        const steps = Math.ceil(p1.width);
        for (let s = 0; s < steps; s++) {
          const alpha = 0.15 + (s / steps) * 0.2;
          const r = (p0.width * (1 - s / steps)) / 2 + 0.5;
          const mx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 1.5;
          const my = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * 1.5;
          ctx!.beginPath();
          ctx!.arc(mx, my, r, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(31, 41, 55, ${alpha})`;
          ctx!.fill();
        }
      }
    }

    function animate(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      progress = (elapsed % totalDuration) / totalDuration;
      ctx!.clearRect(0, 0, 400, 140);
      // 按进度依次显示笔画
      const strokeProgress = progress * strokes.length;
      strokes.forEach((stroke, idx) => {
        const localT = Math.min(Math.max(strokeProgress - idx, 0), 1);
        if (localT > 0) {
          drawStroke(stroke.points, localT);
        }
      });
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 效果五：流星笔画（Canvas）
  useEffect(() => {
    const canvas = meteorRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 140 * dpr;
    canvas.style.width = '400px';
    canvas.style.height = '140px';
    ctx!.scale(dpr, dpr);
    // 定义笔画路径（"山"和"川"的简化）
    const strokes = [
      // 第一笔
      { points: genMeteorPath(50, 20, 50, 120, 45, 70, 55, 70) },
      // 第二笔竖
      { points: genMeteorPath(100, 10, 100, 130, 95, 70, 105, 70) },
      // 第三笔竖
      { points: genMeteorPath(150, 20, 150, 120, 145, 70, 155, 70) },
      // 川字第一笔
      { points: genMeteorPath(210, 25, 210, 115, 205, 70, 215, 70) },
      // 川字第二笔
      { points: genMeteorPath(260, 15, 260, 125, 255, 70, 265, 70) },
      // 川字第三笔
      { points: genMeteorPath(310, 25, 310, 115, 305, 70, 315, 70) },
    ];
    type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number };
    const particles: Particle[] = [];
    let animId: number;
    let progress = 0;
    const totalDuration = 4000;
    let startTime: number | null = null;
    // 生成贝塞尔曲线路径
    function genMeteorPath(x0: number, y0: number, x3: number, y3: number, x1: number, y1: number, x2: number, y2: number) {
      const pts: { x: number; y: number }[] = [];
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
        const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
        pts.push({ x, y });
      }
      return pts;
    }
    // 添加尾迹粒子
    function addParticles(x: number, y: number, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.5 + 0.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 30 + Math.random() * 20,
          size: Math.random() * 2 + 1,
        });
      }
    }
    // 更新粒子
    function updateParticles() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // 轻微重力
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
    }
    // 绘制粒子
    function drawParticles() {
      particles.forEach((p) => {
        const alpha = p.life * 0.8;
        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        grad.addColorStop(0, `rgba(255, 220, 150, ${alpha})`);
        grad.addColorStop(0.5, `rgba(255, 180, 80, ${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(255, 150, 50, 0)');
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
      });
    }
    // 绘制流星头
    function drawMeteorHead(x: number, y: number) {
      // 外发光
      const outerGrad = ctx!.createRadialGradient(x, y, 0, x, y, 20);
      outerGrad.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
      outerGrad.addColorStop(0.3, 'rgba(255, 200, 100, 0.5)');
      outerGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
      ctx!.beginPath();
      ctx!.arc(x, y, 20, 0, Math.PI * 2);
      ctx!.fillStyle = outerGrad;
      ctx!.fill();
      // 核心亮点
      const innerGrad = ctx!.createRadialGradient(x, y, 0, x, y, 6);
      innerGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      innerGrad.addColorStop(0.5, 'rgba(255, 240, 200, 1)');
      innerGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx!.beginPath();
      ctx!.arc(x, y, 6, 0, Math.PI * 2);
      ctx!.fillStyle = innerGrad;
      ctx!.fill();
    }
    // 绘制笔画尾迹（光带）
    function drawStrokeTrail(points: { x: number; y: number }[], progress: number) {
      if (progress < 0.01) return;
      const count = Math.floor(points.length * progress);
      if (count < 2) return;
      // 外层光晕
      ctx!.beginPath();
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < count; i++) {
        ctx!.lineTo(points[i].x, points[i].y);
      }
      ctx!.strokeStyle = 'rgba(255, 180, 80, 0.3)';
      ctx!.lineWidth = 10;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.filter = 'blur(4px)';
      ctx!.stroke();
      ctx!.filter = 'none';
      // 内层亮线
      ctx!.beginPath();
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < count; i++) {
        ctx!.lineTo(points[i].x, points[i].y);
      }
      const grad = ctx!.createLinearGradient(
        points[0].x, points[0].y,
        points[count - 1].x, points[count - 1].y
      );
      grad.addColorStop(0, 'rgba(255, 200, 100, 0)');
      grad.addColorStop(0.5, 'rgba(255, 220, 150, 0.6)');
      grad.addColorStop(1, 'rgba(255, 240, 200, 1)');
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = 3;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.stroke();
    }
    function animate(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      progress = (elapsed % totalDuration) / totalDuration;
      ctx!.clearRect(0, 0, 400, 140);
      // 绘制已完成的笔画（淡淡的底色）
      const strokeProgress = progress * strokes.length;
      strokes.forEach((stroke, idx) => {
        const localT = Math.min(Math.max(strokeProgress - idx, 0), 1);
        if (localT > 0) {
          // 已完成的笔画：淡淡的金色痕迹
          const pts = stroke.points;
          const count = Math.floor(pts.length * localT);
          if (count >= 2) {
            ctx!.beginPath();
            ctx!.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < count; i++) {
              ctx!.lineTo(pts[i].x, pts[i].y);
            }
            ctx!.strokeStyle = 'rgba(255, 210, 120, 0.5)';
            ctx!.lineWidth = 2.5;
            ctx!.lineCap = 'round';
            ctx!.lineJoin = 'round';
            ctx!.stroke();
          }
          // 流星尾迹
          drawStrokeTrail(pts, localT);
          // 流星头（只在当前正在画的笔画上）
          if (localT < 1 && localT > 0) {
            const headIdx = Math.floor(pts.length * localT);
            const head = pts[Math.min(headIdx, pts.length - 1)];
            drawMeteorHead(head.x, head.y);
            addParticles(head.x, head.y, 2);
          }
        }
      });
      updateParticles();
      drawParticles();
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 效果六：终极粒子笔（GSAP + Canvas 粒子 + tsParticles背景）
  useEffect(() => {
    const canvas = proRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 500 * dpr;
    canvas.height = 180 * dpr;
    canvas.style.width = '500px';
    canvas.style.height = '180px';
    ctx!.scale(dpr, dpr);
    // 笔画路径（"山川"两个字，更丰富的笔画）
    const strokePaths: { x: number; y: number }[][] = [];
    function bezierPath(x0: number, y0: number, x3: number, y3: number, x1: number, y1: number, x2: number, y2: number) {
      const pts: { x: number; y: number }[] = [];
      const steps = 100;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
        const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
        pts.push({ x, y });
      }
      return pts;
    }
    // 山字
    strokePaths.push(bezierPath(80, 30, 80, 150, 75, 80, 85, 100));
    strokePaths.push(bezierPath(40, 75, 120, 75, 60, 85, 100, 65));
    strokePaths.push(bezierPath(150, 25, 150, 155, 145, 85, 155, 95));
    strokePaths.push(bezierPath(110, 70, 190, 70, 130, 80, 170, 60));
    // 川字
    strokePaths.push(bezierPath(240, 35, 240, 145, 235, 85, 245, 95));
    strokePaths.push(bezierPath(300, 25, 300, 155, 295, 85, 305, 95));
    strokePaths.push(bezierPath(360, 35, 360, 145, 355, 85, 365, 95));
    // 一横装饰
    strokePaths.push(bezierPath(410, 90, 470, 90, 425, 80, 455, 100));
    // 粒子类型
    type Spark = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number };
    type TrailPoint = { x: number; y: number; alpha: number; size: number };
    type BurstParticle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number };
    const sparks: Spark[] = [];
    const bursts: BurstParticle[] = [];
    const trailPoints: TrailPoint[] = [];
    let animId: number;
    let currentStrokeIdx = 0;
    let strokeProgress = 0;
    let cycleStartTime = 0;
    const strokeDurations = [1.2, 0.8, 1.3, 0.9, 1.1, 1.4, 1.1, 0.7];
    const pauseBetween = 0.15;
    let totalCycleDuration = strokeDurations.reduce((a, b) => a + b, 0) + pauseBetween * strokePaths.length;
    let gsapTimeline: gsap.core.Timeline | null = null;
    // 创建 GSAP 时间线控制笔画进度
    const state = { progress: 0 };
    gsapTimeline = gsap.timeline({ repeat: -1 });
    let timeOffset = 0;
    strokePaths.forEach((_, idx) => {
      gsapTimeline!.to(state, {
        progress: idx + 1,
        duration: strokeDurations[idx],
        ease: 'power2.out',
        onUpdate: () => {
          strokeProgress = state.progress - idx;
          currentStrokeIdx = idx;
        },
        onComplete: () => {
          // 笔画完成时触发绽放
          const pts = strokePaths[idx];
          const endPt = pts[pts.length - 1];
          triggerBurst(endPt.x, endPt.y);
        },
      }, timeOffset);
      timeOffset += strokeDurations[idx] + pauseBetween;
    });
    // 笔尖绽放粒子
    function triggerBurst(x: number, y: number) {
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.3;
        const speed = 2 + Math.random() * 5;
        bursts.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 40 + Math.random() * 30,
          size: 1.5 + Math.random() * 2.5,
          hue: 30 + Math.random() * 30,
        });
      }
    }
    // 添加火花粒子
    function addSparks(x: number, y: number, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2;
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          life: 1,
          maxLife: 25 + Math.random() * 20,
          size: 0.8 + Math.random() * 1.5,
          hue: 25 + Math.random() * 35,
        });
      }
    }
    // 更新粒子
    function updateParticles() {
      // 火花
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) sparks.splice(i, 1);
      }
      // 绽放粒子
      for (let i = bursts.length - 1; i >= 0; i--) {
        const p = bursts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.98;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) bursts.splice(i, 1);
      }
    }
    // 绘制流星笔尖
    function drawPenTip(x: number, y: number) {
      // 最外层光晕
      const glow1 = ctx!.createRadialGradient(x, y, 0, x, y, 35);
      glow1.addColorStop(0, 'hsla(40, 100%, 70%, 0.6)');
      glow1.addColorStop(0.4, 'hsla(30, 100%, 60%, 0.25)');
      glow1.addColorStop(1, 'hsla(20, 100%, 50%, 0)');
      ctx!.beginPath();
      ctx!.arc(x, y, 35, 0, Math.PI * 2);
      ctx!.fillStyle = glow1;
      ctx!.fill();
      // 中层光
      const glow2 = ctx!.createRadialGradient(x, y, 0, x, y, 18);
      glow2.addColorStop(0, 'hsla(50, 100%, 85%, 0.9)');
      glow2.addColorStop(0.5, 'hsla(35, 100%, 70%, 0.5)');
      glow2.addColorStop(1, 'hsla(25, 100%, 60%, 0)');
      ctx!.beginPath();
      ctx!.arc(x, y, 18, 0, Math.PI * 2);
      ctx!.fillStyle = glow2;
      ctx!.fill();
      // 核心亮点
      const core = ctx!.createRadialGradient(x, y, 0, x, y, 7);
      core.addColorStop(0, 'rgba(255, 255, 255, 1)');
      core.addColorStop(0.4, 'hsla(50, 100%, 90%, 0.95)');
      core.addColorStop(1, 'hsla(40, 100%, 70%, 0)');
      ctx!.beginPath();
      ctx!.arc(x, y, 7, 0, Math.PI * 2);
      ctx!.fillStyle = core;
      ctx!.fill();
    }
    // 绘制尾迹
    function drawTrail(points: { x: number; y: number }[], progress: number) {
      if (progress < 0.02) return;
      const count = Math.floor(points.length * progress);
      if (count < 3) return;
      const activePoints = points.slice(0, count);
      // 外层模糊光晕
      ctx!.save();
      ctx!.filter = 'blur(6px)';
      ctx!.beginPath();
      ctx!.moveTo(activePoints[0].x, activePoints[0].y);
      for (let i = 1; i < activePoints.length; i++) {
        ctx!.lineTo(activePoints[i].x, activePoints[i].y);
      }
      ctx!.strokeStyle = 'hsla(35, 100%, 65%, 0.4)';
      ctx!.lineWidth = 12;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.stroke();
      ctx!.restore();
      // 中层光带
      const midGrad = ctx!.createLinearGradient(
        activePoints[0].x, activePoints[0].y,
        activePoints[activePoints.length - 1].x, activePoints[activePoints.length - 1].y
      );
      midGrad.addColorStop(0, 'hsla(30, 100%, 60%, 0)');
      midGrad.addColorStop(0.6, 'hsla(40, 100%, 70%, 0.5)');
      midGrad.addColorStop(1, 'hsla(50, 100%, 85%, 0.9)');
      ctx!.beginPath();
      ctx!.moveTo(activePoints[0].x, activePoints[0].y);
      for (let i = 1; i < activePoints.length; i++) {
        ctx!.lineTo(activePoints[i].x, activePoints[i].y);
      }
      ctx!.strokeStyle = midGrad;
      ctx!.lineWidth = 4.5;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.stroke();
      // 内层亮线
      const innerGrad = ctx!.createLinearGradient(
        activePoints[0].x, activePoints[0].y,
        activePoints[activePoints.length - 1].x, activePoints[activePoints.length - 1].y
      );
      innerGrad.addColorStop(0, 'hsla(40, 100%, 80%, 0)');
      innerGrad.addColorStop(0.7, 'hsla(50, 100%, 90%, 0.7)');
      innerGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx!.beginPath();
      ctx!.moveTo(activePoints[0].x, activePoints[0].y);
      for (let i = 1; i < activePoints.length; i++) {
        ctx!.lineTo(activePoints[i].x, activePoints[i].y);
      }
      ctx!.strokeStyle = innerGrad;
      ctx!.lineWidth = 1.5;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.stroke();
    }
    // 绘制已完成笔画的残留发光
    function drawCompletedStroke(points: { x: number; y: number }[], intensity: number) {
      if (intensity <= 0) return;
      ctx!.save();
      ctx!.filter = 'blur(3px)';
      ctx!.beginPath();
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx!.lineTo(points[i].x, points[i].y);
      }
      ctx!.strokeStyle = `hsla(40, 100%, 70%, ${0.25 * intensity})`;
      ctx!.lineWidth = 5;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.stroke();
      ctx!.restore();
      ctx!.beginPath();
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx!.lineTo(points[i].x, points[i].y);
      }
      ctx!.strokeStyle = `hsla(45, 100%, 80%, ${0.6 * intensity})`;
      ctx!.lineWidth = 2;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.stroke();
    }
    // 绘制火花粒子
    function drawSparks() {
      sparks.forEach(p => {
        const alpha = p.life;
        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 85%, ${alpha})`);
        grad.addColorStop(0.5, `hsla(${p.hue - 10}, 100%, 65%, ${alpha * 0.5})`);
        grad.addColorStop(1, `hsla(${p.hue - 20}, 100%, 50%, 0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
      });
    }
    // 绘制绽放粒子
    function drawBursts() {
      bursts.forEach(p => {
        const alpha = p.life;
        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 90%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(${p.hue}, 100%, 70%, ${alpha * 0.6})`);
        grad.addColorStop(1, `hsla(${p.hue - 15}, 100%, 50%, 0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
      });
    }
    let frameCount = 0;
    function animate() {
      frameCount++;
      ctx!.clearRect(0, 0, 500, 180);
      // 绘制已完成的笔画（带渐变消失效果）
      strokePaths.forEach((pts, idx) => {
        if (idx < currentStrokeIdx) {
          // 已完成的笔画，逐渐变暗
          const age = currentStrokeIdx - idx;
          const intensity = Math.max(0, 1 - age * 0.15);
          drawCompletedStroke(pts, intensity);
        }
      });
      // 当前笔画的尾迹
      if (currentStrokeIdx < strokePaths.length && strokeProgress > 0) {
        const currentPts = strokePaths[currentStrokeIdx];
        drawTrail(currentPts, strokeProgress);
        // 笔尖位置
        const tipIdx = Math.floor(currentPts.length * Math.min(strokeProgress, 1));
        const tip = currentPts[Math.min(tipIdx, currentPts.length - 1)];
        if (tip) {
          drawPenTip(tip.x, tip.y);
          // 添加火花
          if (frameCount % 2 === 0) {
            addSparks(tip.x, tip.y, 3);
          }
        }
      }
      updateParticles();
      drawSparks();
      drawBursts();
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
      if (gsapTimeline) gsapTimeline.kill();
    };
  }, []);

  // 生成贝塞尔曲线路径点（带宽度变化）
  function generateBezierPoints(
    x0: number, y0: number, x3: number, y3: number,
    x1: number, y1: number, x2: number, y2: number,
    maxWidth: number
  ) {
    const points: { x: number; y: number; width: number }[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
      const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
      // 笔锋效果：两头细中间粗
      const width = maxWidth * Math.sin(t * Math.PI) * 0.7 + maxWidth * 0.3;
      points.push({ x, y, width });
    }
    return points;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-stone-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          手写签名效果合集
        </h1>
        <p className="text-center text-gray-500 mb-10">
          五种不同风格，挑一个你喜欢的
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 效果一：墨水晕染 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-gray-800 text-white text-xs rounded-full">效果一</span>
              <h2 className="text-lg font-semibold text-gray-700">墨水晕染</h2>
            </div>
            <div className="flex justify-center items-center h-32 bg-gradient-to-br from-stone-100 to-amber-50 rounded-xl border border-stone-200">
              <div ref={inkRef} className="flex gap-1"></div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              真实手写字体 + 墨迹扩散 + 模糊渐显，像墨水滴在宣纸上
            </p>
          </div>

          {/* 效果二：铅笔手绘 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-amber-600 text-white text-xs rounded-full">效果二</span>
              <h2 className="text-lg font-semibold text-gray-700">铅笔手绘</h2>
            </div>
            <div className="flex justify-center items-center h-32 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div ref={pencilRef}></div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              rough.js 生成带抖动的手绘线条，像铅笔在纸上画的
            </p>
          </div>

          {/* 效果三：毛笔笔刷 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-rose-700 text-white text-xs rounded-full">效果三</span>
              <h2 className="text-lg font-semibold text-gray-700">毛笔笔刷</h2>
            </div>
            <div className="flex justify-center items-center h-32 bg-gradient-to-br from-rose-50 to-amber-50 rounded-xl border border-rose-200">
              <canvas ref={brushRef} style={{ maxWidth: '100%', height: 'auto' }}></canvas>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              Canvas 粒子模拟毛笔，有粗细笔锋变化，最真实的书写感
            </p>
          </div>

          {/* 效果四：印章盖印 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-red-700 text-white text-xs rounded-full">效果四</span>
              <h2 className="text-lg font-semibold text-gray-700">印章盖印</h2>
            </div>
            <div ref={stampRef} className="flex justify-center items-center h-32 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl border border-stone-300">
              <div className="stamp-box">
                <div className="stamp-text">文采飞扬</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              中式印章盖印效果，配合手写文字有古风感
            </p>
          </div>

          {/* 效果五：流星笔画 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">效果五 ⭐</span>
              <h2 className="text-lg font-semibold text-gray-700">流星笔画</h2>
            </div>
            <div className="flex justify-center items-center h-40 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-xl border border-purple-500">
              <canvas ref={meteorRef} style={{ maxWidth: '100%', height: 'auto' }}></canvas>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              流星划过般的笔画，笔尖带光尾和粒子火花，炫酷的星空书写感
            </p>
          </div>

          {/* 效果六：终极粒子笔 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs rounded-full font-bold">效果六 🏆 Pro</span>
              <h2 className="text-lg font-semibold text-gray-700">终极粒子笔</h2>
            </div>
            <div className="relative flex justify-center items-center h-48 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 rounded-xl border border-amber-500/30 overflow-hidden">
              <div className="absolute inset-0 w-full h-full">
                <ParticlesProvider init={particlesInit}>
                  <Particles
                    id="tsparticles-pro"
                    style={{ width: '100%', height: '100%' }}
                    options={{
                      fullScreen: { enable: false },
                      background: { color: { value: 'transparent' } },
                      fpsLimit: 60,
                      particles: {
                        number: { value: 60, density: { enable: true } },
                        color: { value: ['#ffffff', '#ffd700', '#87ceeb'] },
                        shape: { type: 'circle' },
                        opacity: {
                          value: { min: 0.1, max: 0.8 },
                          animation: { enable: true, speed: 1, minimumValue: 0.1, sync: false }
                        },
                        size: {
                          value: { min: 0.5, max: 2.5 },
                          animation: { enable: true, speed: 2, minimumValue: 0.3, sync: false }
                        },
                        move: {
                          enable: true,
                          speed: 0.3,
                          direction: 'none',
                          random: true,
                          straight: false,
                          outModes: { default: 'out' },
                        },
                        twinkle: {
                          particles: { enable: true, frequency: 0.05, opacity: 1 },
                        },
                      },
                      detectRetina: true,
                    }}
                  />
                </ParticlesProvider>
              </div>
              <canvas ref={proRef} className="relative z-10" style={{ maxWidth: '100%', height: 'auto' }}></canvas>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              GSAP + tsParticles + Canvas 三重专业库，笔尖绽放 + 星空背景，顶级视觉效果
            </p>
          </div>
        </div>

        {/* 对比说明 */}
        <div className="mt-10 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">
            📋 六种方案对比
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">方案</th>
                  <th className="px-4 py-3">真实感</th>
                  <th className="px-4 py-3">实现难度</th>
                  <th className="px-4 py-3">性能</th>
                  <th className="px-4 py-3 rounded-tr-lg">适用场景</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium">墨水晕染</td>
                  <td className="px-4 py-3">⭐⭐⭐⭐</td>
                  <td className="px-4 py-3">低</td>
                  <td className="px-4 py-3">极好</td>
                  <td className="px-4 py-3">标语、标题、对联</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium">铅笔手绘</td>
                  <td className="px-4 py-3">⭐⭐⭐</td>
                  <td className="px-4 py-3">中</td>
                  <td className="px-4 py-3">好</td>
                  <td className="px-4 py-3">涂鸦、便签、手绘风网站</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium">毛笔笔刷</td>
                  <td className="px-4 py-3">⭐⭐⭐⭐⭐</td>
                  <td className="px-4 py-3">高</td>
                  <td className="px-4 py-3">中</td>
                  <td className="px-4 py-3">书法展示、签名、艺术字</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium">流星笔画</td>
                  <td className="px-4 py-3">⭐⭐⭐⭐</td>
                  <td className="px-4 py-3">高</td>
                  <td className="px-4 py-3">中</td>
                  <td className="px-4 py-3">炫酷标语、科技感、星空主题</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium">终极粒子笔 🏆</td>
                  <td className="px-4 py-3">⭐⭐⭐⭐⭐⭐</td>
                  <td className="px-4 py-3">极高</td>
                  <td className="px-4 py-3">中</td>
                  <td className="px-4 py-3">首页Hero、炫酷标题、品牌展示</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">印章盖印</td>
                  <td className="px-4 py-3">⭐⭐⭐</td>
                  <td className="px-4 py-3">低</td>
                  <td className="px-4 py-3">极好</td>
                  <td className="px-4 py-3">点缀、装饰、古风元素</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ink-in {
          0% {
            opacity: 0;
            transform: scale(1.3);
            filter: blur(6px);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
            filter: blur(1px);
          }
          70% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
          90% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.95);
            filter: blur(2px);
          }
        }
        @keyframes ink-blob {
          0% {
            opacity: 0;
            transform: scale(1.3);
          }
          30% {
            opacity: 0.4;
            transform: scale(1.15);
          }
          60% {
            opacity: 0.15;
            transform: scale(1.05);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }
        .stamp-box {
          width: 100px;
          height: 100px;
          border: 4px solid #dc2626;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(220, 38, 38, 0.05);
          animation: stamp-in 2s ease-out infinite;
          transform: rotate(-8deg);
          position: relative;
        }
        .stamp-box::before {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 4px;
        }
        .stamp-text {
          font-family: "Ma Shan Zheng", "ZCOOL XiaoWei", cursive;
          font-size: 1.5rem;
          color: #dc2626;
          writing-mode: vertical-rl;
          letter-spacing: 0.2em;
          animation: stamp-text-in 2s ease-out infinite;
        }
        @keyframes stamp-in {
          0% {
            opacity: 0;
            transform: rotate(-8deg) scale(1.5);
            filter: blur(4px);
          }
          10% {
            opacity: 1;
            transform: rotate(-8deg) scale(0.95);
            filter: blur(0);
          }
          15% {
            transform: rotate(-8deg) scale(1.02);
          }
          20% {
            transform: rotate(-8deg) scale(1);
          }
          85% {
            opacity: 1;
            transform: rotate(-8deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: rotate(-8deg) scale(0.9);
            filter: blur(2px);
          }
        }
        @keyframes stamp-text-in {
          0% { opacity: 0; }
          10% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
