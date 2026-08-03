import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion } from 'framer-motion';
import { TAU, C, NC, CLASH, RIVER_COL, AMB_COL, FIELD_MIX, FLOW_MIX, SPARK_MIX, NEB_KEYS, SPH_POOL, BG_MIX } from './chenShangConstants';
import { rnd, gauss, easeIO, easeO, clamp, darkOf } from './chenShangUtils';
import { type Sprite, makeGlow, makeCloud, makeSphere, makeStroke, makeDab } from './chenShangSprites';
import { stampInk, dashStroke, paintVortex, paintSplash } from './chenShangDrawing';
import './ChenShangHero.css';

/**
 * 参商 · 沉浸式星夜场景
 * 完整复刻自参考视觉：深紫蓝夜空 + Canvas 星河 + 双星轨道 + 北辰 + 远山 + 金边相框
 *
 * 动画分层：
 *   - Canvas 层：星空粒子、星云、流星、爆发等（requestAnimationFrame 驱动）
 *   - DOM 位置层：双星位置、虚线、涟漪（每帧由 Canvas 主循环更新）
 *   - DOM 入场层：标题块、侧栏、北辰、相框等（Framer Motion 驱动）
 *   - DOM 循环层：halo 脉动、flare 闪烁、bring 旋转、zi 呼吸等（GSAP 驱动）
 *
 * 仅在 r3 主题下渲染，作为 absolute 定位的沉浸场景，跟随页面滚动
 * pointer-events: none，不阻挡论坛交互；仅保留鼠标视差
 */

// ── 主组件 ──
export default function ChenShangHero() {
  // Canvas/位置控制 ref（每帧由 RAF 更新）
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shenRef = useRef<HTMLDivElement | null>(null);
  const shangRef = useRef<HTMLDivElement | null>(null);
  const beiRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const thShenRef = useRef<SVGLineElement | null>(null);
  const thShangRef = useRef<SVGLineElement | null>(null);
  const endShenRef = useRef<SVGCircleElement | null>(null);
  const endShangRef = useRef<SVGCircleElement | null>(null);
  const riftRef = useRef<SVGCircleElement | null>(null);

  // GSAP 循环动画 ref
  const containerRef = useRef<HTMLElement | null>(null);
  const haloShenRef = useRef<HTMLSpanElement | null>(null);
  const haloShangRef = useRef<HTMLSpanElement | null>(null);
  const flareShenHRef = useRef<HTMLSpanElement | null>(null);
  const flareShenVRef = useRef<HTMLSpanElement | null>(null);
  const flareShangHRef = useRef<HTMLSpanElement | null>(null);
  const flareShangVRef = useRef<HTMLSpanElement | null>(null);
  const bringRef = useRef<HTMLSpanElement | null>(null);
  const ziShenRef = useRef<HTMLSpanElement | null>(null);
  const ziShangRef = useRef<HTMLSpanElement | null>(null);
  const jingRef = useRef<HTMLDivElement | null>(null);
  const metaRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const cornersRef = useRef<Array<SVGSVGElement | null>>([]);

  const [loaded, setLoaded] = useState(false);
  // loadedRef 与 loaded 同步，但供 Canvas 主循环闭包读取，避免 setLoaded 触发 useEffect 重运行
  const loadedRef = useRef(false);

  // ── GSAP 无限循环动画（useGSAP hook，自动 cleanup + 响应 loaded 依赖）──
  useGSAP(() => {
    if (!loaded) return;

    // halo 脉动 - 参星（4.2s 周期，min→max 用 2.1s）
    if (haloShenRef.current) {
      gsap.set(haloShenRef.current, { xPercent: -50, yPercent: -50, scale: 1, opacity: 0.85 });
      gsap.to(haloShenRef.current, {
        scale: 1.18, opacity: 1,
        duration: 2.1, ease: 'sine.inOut',
        yoyo: true, repeat: -1,
      });
    }
    // halo 脉动 - 商星（反相：从 max 开始）
    if (haloShangRef.current) {
      gsap.set(haloShangRef.current, { xPercent: -50, yPercent: -50, scale: 1.18, opacity: 1 });
      gsap.to(haloShangRef.current, {
        scale: 1, opacity: 0.85,
        duration: 2.1, ease: 'sine.inOut',
        yoyo: true, repeat: -1,
      });
    }

    // flare 闪烁（5.5s 周期，min→max 用 2.75s）
    const flareMin = 0.5, flareMax = 0.9;
    [
      { ref: flareShenHRef, start: flareMin },
      { ref: flareShenVRef, start: flareMin },
      { ref: flareShangHRef, start: flareMin },
      { ref: flareShangVRef, start: flareMax }, // 商星垂直 flare 反相（-2.7s）
    ].forEach(({ ref, start }) => {
      const el = ref.current;
      if (!el) return;
      gsap.set(el, { xPercent: -50, yPercent: -50, opacity: start });
      gsap.to(el, {
        opacity: start === flareMin ? flareMax : flareMin,
        duration: 2.75, ease: 'sine.inOut',
        yoyo: true, repeat: -1,
      });
    });

    // bring 旋转（90s 一圈）
    if (bringRef.current) {
      gsap.set(bringRef.current, { xPercent: -50, yPercent: -50, rotation: 0 });
      gsap.to(bringRef.current, {
        rotation: 360,
        duration: 90, ease: 'none',
        repeat: -1,
      });
    }

    // 参字呼吸（入场后接 7s 周期 breathe）
    if (ziShenRef.current) {
      const tl = gsap.timeline({ delay: 0.1 });
      tl.fromTo(ziShenRef.current, { opacity: 0 }, { opacity: 0.9, duration: 1.8, ease: 'power2.out' });
      tl.to(ziShenRef.current, {
        opacity: 1,
        duration: 3.5, ease: 'sine.inOut',
        yoyo: true, repeat: -1,
      });
    }
    // 商字呼吸（反相，入场 delay 0.6s）
    if (ziShangRef.current) {
      const tl = gsap.timeline({ delay: 0.6 });
      tl.fromTo(ziShangRef.current, { opacity: 0 }, { opacity: 1, duration: 1.8, ease: 'power2.out' });
      tl.to(ziShangRef.current, {
        opacity: 0.9,
        duration: 3.5, ease: 'sine.inOut',
        yoyo: true, repeat: -1,
      });
    }

    // 「距离·一境」呼吸（8s 周期，opacity + letter-spacing）
    if (jingRef.current) {
      gsap.fromTo(
        jingRef.current,
        { opacity: 0.86, letterSpacing: '0.52em' },
        {
          opacity: 1, letterSpacing: '0.6em',
          duration: 4, ease: 'sine.inOut',
          yoyo: true, repeat: -1,
        }
      );
    }

    // meta 浮动（9s 周期）
    if (metaRef.current) {
      gsap.fromTo(
        metaRef.current,
        { y: 0 },
        {
          y: -5,
            duration: 4.5, ease: 'sine.inOut',
            yoyo: true, repeat: -1,
          }
        );
      }

      // hint 颜色脉动（6s 周期）
      if (hintRef.current) {
        gsap.fromTo(
          hintRef.current,
          { color: 'rgba(170,184,206,0.42)' },
          {
            color: 'rgba(214,224,242,0.7)',
            duration: 3, ease: 'sine.inOut',
            yoyo: true, repeat: -1,
          }
        );
      }

      // 相框四角金光脉动（7s 周期）
      cornersRef.current.forEach((c) => {
        if (!c) return;
        gsap.fromTo(
          c,
          { color: 'rgba(230,192,98,0.5)' },
          {
            color: 'rgba(244,216,132,0.82)',
            duration: 3.5, ease: 'sine.inOut',
            yoyo: true, repeat: -1,
          }
        );
      });
  }, { dependencies: [loaded] });

  // ── Canvas 主循环 ──
  useEffect(() => {
    const cv = canvasRef.current;
    const shenEl = shenRef.current;
    const shangEl = shangRef.current;
    const beiEl = beiRef.current;
    const svg = svgRef.current;
    const thShen = thShenRef.current;
    const thShang = thShangRef.current;
    const endShen = endShenRef.current;
    const endShang = endShangRef.current;
    const rift = riftRef.current;
    if (!cv || !shenEl || !shangEl || !beiEl || !svg || !thShen || !thShang || !endShen || !endShang || !rift) return;
    // 注：上方已做 null 检查；闭包内 TS 无法跨函数收窄，下面用非空别名供闭包使用
    const cvN: HTMLCanvasElement = cv;
    const shenN: HTMLDivElement = shenEl;
    const shangN: HTMLDivElement = shangEl;
    const beiN: HTMLDivElement = beiEl;
    const svgN: SVGSVGElement = svg;
    const thShenN: SVGLineElement = thShen;
    const thShangN: SVGLineElement = thShang;
    const endShenN: SVGCircleElement = endShen;
    const endShangN: SVGCircleElement = endShang;
    const riftN: SVGCircleElement = rift;
    const ctx = cvN.getContext('2d')!;
    if (!ctx) return;

    const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPD = RM ? 0.35 : 1;

    // 精灵图
    const SPR: Record<string, Sprite[]> = {};
    const CLD: Record<string, Sprite[]> = {};
    const SPH: Record<string, Sprite> = {};
    const STK: Record<string, Sprite> = {};
    const DAB: Record<string, Sprite[]> = {};
    for (const k in C) { SPR[k] = makeGlow(C[k]); SPH[k] = makeSphere(C[k], darkOf(C[k])); STK[k] = makeStroke(C[k]); DAB[k] = makeDab(C[k]); }
    for (const k in NC) { CLD[k] = makeCloud(NC[k]); }

    // 几何
    const GB = { cx: 0, cy: 0, ang: 0, cos: 1, sin: 0, width: 0 };
    let vortices: { x: number; y: number; r: number; spin: number; big: boolean }[] = [];
    const bandXY = (a: number, p: number): [number, number] => [GB.cx + GB.cos * a - GB.sin * p, GB.cy + GB.sin * a + GB.cos * p];
    let cosB = 1, sinB = 0;
    const TILTB = -0.24;
    const bandPt = (ang: number, rad: number, g: number): [number, number] => {
      const ex = Math.cos(ang) * rad, ey = Math.sin(ang) * rad * 0.22 + g;
      return [CX + ex * cosB - ey * sinB, CY + ex * sinB + ey * cosB];
    };
    const dreamBg = document.createElement('canvas');

    // 尺寸
    let W = 0, H = 0, DPR = 1, poleX = 0, poleY = 0, horizonY = 0, maxR = 0, CX = 0, CY = 0, A0 = 0, bandW = 0;
    let mx = 0, my = 0, tmx = 0, tmy = 0, rot = 0, dragV = 0;
    let cycle = Math.PI / 2, lastAuto = 0, dashOff = 0;
    let sceneOn = false, burstDone = false, echoDone = false;
    let quality = 1, qEMA = 16, lastQ = 0;
    const P = { sx: 0, sy: 0, gx: 0, gy: 0 };
    const FC = { dt: 0, t: 0, pt: 0, kk: 0, nebA: 0, envA: 0, fade: 1, fadeSph: 1, mx: 0, my: 0, quality: 1 };
    const cur = { x: -9999, y: -9999 };
    let lastMove = 0, riverFlow = 0;
    let riverStars: any[] = [], ambient: any[] = [];

    // 粒子池
    let flow: any[] = [], far: any[] = [], near: any[] = [], band: any[] = [], wisps: any[] = [], dustM: any[] = [], flakes: any[] = [];
    let nWisp: any[] = [], nEmb: any[] = [];
    let sparks: any[] = [], streaks: any[] = [], embers: any[] = [], shells: any[] = [], rings: any[] = [];
    let motes: any[] = [], splats: any[] = [], spheres: any[] = [];
    const trS: number[] = [], trG: number[] = [];
    let meteor: any = null, nextMeteor = 1e12;
    const TL = { gather: 4200, contract: 7600, burst: 8000, scene: 9000, title: 5200 };
    const t0 = performance.now();

    // ── 构建场景 ──
    function buildVortices() {
      vortices = [];
      vortices.push({ x: W * 0.74, y: H * 0.22, r: Math.min(W, H) * 0.16, spin: 1, big: true });
      const nv = 4 + ((Math.random() * 2) | 0);
      for (let i = 0; i < nv; i++) {
        vortices.push({ x: rnd(W * 0.12, W * 0.9), y: rnd(H * 0.08, H * 0.6), r: rnd(Math.min(W, H) * 0.05, Math.min(W, H) * 0.11), spin: Math.random() < 0.5 ? -1 : 1, big: false });
      }
    }

    function buildDream() {
      dreamBg.width = W * DPR; dreamBg.height = H * DPR;
      const g = dreamBg.getContext('2d')!;
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H); g.lineCap = 'round';
      GB.cx = W / 2; GB.cy = H * 0.42; GB.ang = -0.3 + rnd(-0.05, 0.05);
      GB.cos = Math.cos(GB.ang); GB.sin = Math.sin(GB.ang); GB.width = H * rnd(0.26, 0.34);
      const DW = Math.hypot(W, H) * 0.62;
      const bg = g.createLinearGradient(0, 0, W * 0.35, H);
      bg.addColorStop(0, '#0e1640'); bg.addColorStop(0.32, '#1a1452');
      bg.addColorStop(0.6, '#241658'); bg.addColorStop(0.82, '#161046'); bg.addColorStop(1, '#0c1238');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const corners = [[0.12, 0.16], [0.88, 0.14], [0.1, 0.84], [0.9, 0.86], [0.5, 0.5], [0.24, 0.5], [0.76, 0.5], [0.5, 0.16], [0.5, 0.84], [0.34, 0.3], [0.66, 0.7]];
      for (let bi = 0; bi < corners.length; bi++) {
        const bx = corners[bi][0] * W + rnd(-W * 0.06, W * 0.06), by = corners[bi][1] * H + rnd(-H * 0.06, H * 0.06);
        const bk = BG_MIX[(Math.random() * BG_MIX.length) | 0];
        paintSplash(g, bx, by, Math.hypot(W, H) * rnd(0.16, 0.26), NC[bk], CLASH[bk], rnd(0.22, 0.34), rnd(0, TAU));
      }
      const bgN = 14 + ((Math.random() * 6) | 0);
      for (let bi = 0; bi < bgN; bi++) {
        const bx = rnd(0, W), by = rnd(0, H), bk = BG_MIX[(Math.random() * BG_MIX.length) | 0];
        paintSplash(g, bx, by, Math.hypot(W, H) * rnd(0.12, 0.22), NC[bk], CLASH[bk], rnd(0.16, 0.3), rnd(0, TAU));
      }
      const skyCols = [NC.cb, NC.uq, NC.pq, NC.tq, NC.vp, NC.vp];
      for (let i = 0; i < 260; i++) {
        const sx = rnd(0, W), sy = rnd(0, H * 0.84);
        const sa = GB.ang + rnd(-0.5, 0.5) + Math.sin(sx * 0.004) * 0.4;
        const sl = rnd(26, 70), sw = rnd(5, 13);
        const sc = Math.random() < 0.88 ? skyCols[(Math.random() * skyCols.length) | 0] : (Math.random() < 0.5 ? NC.mg : NC.yl);
        dashStroke(g, sx, sy, sa, sl, sw, sc, rnd(0.1, 0.22));
      }
      for (let b = 0; b < 3; b++) {
        const baseY = H * (0.3 + b * 0.12) + rnd(-20, 20), amp = rnd(22, 52), ph = rnd(0, TAU);
        for (let x = -40; x < W + 40; x += 14) {
          const y = baseY + Math.sin(x * 0.006 + ph) * amp + Math.sin(x * 0.013 + ph * 1.7) * amp * 0.4;
          const ang = Math.atan2(Math.cos(x * 0.006 + ph) * amp * 0.006, 1) + GB.ang * 0.3;
          const sc = Math.random() < 0.7 ? NC.cb : (Math.random() < 0.5 ? NC.tq : NC.vp);
          dashStroke(g, x, y, ang, rnd(22, 46), rnd(7, 16), sc, rnd(0.18, 0.34));
          if (Math.random() < 0.3) dashStroke(g, x, y, ang, rnd(14, 28), rnd(3, 8), Math.random() < 0.5 ? NC.mg : NC.pq, rnd(0.1, 0.22));
        }
      }
      for (let i = 0; i < vortices.length; i++) {
        const v = vortices[i];
        if (v.big) {
          paintVortex(g, v.x, v.y, v.r, NC.cb, '238,200,104', 2.4, v.spin);
          const moonG = g.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r * 0.5);
          moonG.addColorStop(0, 'rgba(248,224,140,.85)'); moonG.addColorStop(0.5, 'rgba(238,200,104,.4)'); moonG.addColorStop(1, 'rgba(238,200,104,0)');
          g.globalCompositeOperation = 'lighter'; g.fillStyle = moonG;
          g.beginPath(); g.arc(v.x, v.y, v.r * 0.5, 0, TAU); g.fill();
          g.globalCompositeOperation = 'source-over';
        } else {
          paintVortex(g, v.x, v.y, v.r, Math.random() < 0.5 ? NC.uq : NC.tq, NC.vp, rnd(1.6, 2.4), v.spin);
        }
      }
      const nSplash = 7 + ((Math.random() * 3) | 0);
      for (let i = 0; i < nSplash; i++) {
        const along = rnd(-0.62, 0.62) * DW, perp = gauss() * GB.width * 0.5;
        const p = bandXY(along, perp), kk = NEB_KEYS[i % NEB_KEYS.length];
        paintSplash(g, p[0], p[1], Math.hypot(W, H) * rnd(0.12, 0.2), NC[kk], CLASH[kk], rnd(0.42, 0.66), GB.ang + rnd(-0.7, 0.7));
      }
      g.globalCompositeOperation = 'lighter';
      for (let ln2 = 0; ln2 < 8; ln2++) {
        const lx = rnd(W * 0.04, W * 0.3), ly = rnd(H * 0.78, H * 0.95), lr = rnd(2.5, 6);
        const lg2 = g.createRadialGradient(lx, ly, 0, lx, ly, lr);
        lg2.addColorStop(0, 'rgba(248,224,140,.85)'); lg2.addColorStop(1, 'rgba(248,224,140,0)');
        g.fillStyle = lg2; g.beginPath(); g.arc(lx, ly, lr, 0, TAU); g.fill();
      }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }

    function buildRiver() {
      riverStars = [];
      const DW = Math.hypot(W, H) * 0.62, sig = GB.width * 0.5;
      const n = Math.round((W * H) / 320);
      for (let i = 0; i < n; i++) {
        const along = rnd(-1.05, 1.05) * DW, perp = gauss() * sig * 0.9, z = Math.pow(Math.random(), 1.2);
        const edge = clamp(Math.abs(perp) / (sig + 0.001), 0, 1);
        let c: string;
        if (Math.random() < 0.34) {
          if (edge < 0.4) c = Math.random() < 0.55 ? 'y' : (Math.random() < 0.6 ? 'm' : 'w');
          else if (edge > 0.7) c = Math.random() < 0.42 ? 'b' : (Math.random() < 0.55 ? 'v' : 't');
          else c = 'w';
        } else { c = RIVER_COL[(Math.random() * RIVER_COL.length) | 0]; }
        riverStars.push({ along, perp, base: 0.45 + 0.7 * z, ph: rnd(0, TAU), sp: rnd(0.4, 1.8), z: 0.3 + z * 0.7, size: 0.7 + z * 1.8, drift: 0.09 * rnd(0.6, 1.7), c });
      }
    }
    function buildAmbient() {
      ambient = [];
      const n = Math.round((W * H) / 1500);
      for (let i = 0; i < n; i++) {
        const z = Math.pow(Math.random(), 1.4), bind = Math.random() < 0.55;
        let vi = -1, ang = 0, rad = 0, flat = 1, x = 0, y = 0;
        if (bind && vortices.length) { vi = (Math.random() * vortices.length) | 0; const v = vortices[vi]; ang = rnd(0, TAU); rad = v.r * rnd(0.3, 1.5); flat = rnd(0.7, 1); }
        else { x = rnd(0, W); y = rnd(0, H * 0.84); }
        ambient.push({ x, y, vx: rnd(-0.012, 0.012), vy: rnd(-0.009, 0.009), z: 0.25 + z * 0.75, base: 0.3 + 0.6 * z, ph: rnd(0, TAU), sp: rnd(0.4, 1.6), size: 0.6 + z * 1.7, c: AMB_COL[(Math.random() * AMB_COL.length) | 0], vi, ang, rad, flat, spin: (vi >= 0 ? vortices[vi].spin : 1) * rnd(0.00008, 0.00022) });
      }
    }
    function buildSpheres() {
      spheres = [];
      const n = Math.round((W * H) / 30000);
      for (let i = 0; i < n; i++) {
        const z = Math.pow(Math.random(), 1.3);
        spheres.push({ x: rnd(0, W), y: rnd(0, H), z: 0.25 + z * 0.75, vx: rnd(-0.006, 0.006), vy: rnd(-0.004, 0.004), s: rnd(3, 7), c: SPH_POOL[(Math.random() * SPH_POOL.length) | 0], ph: rnd(0, TAU), sp: rnd(0.3, 1.1) });
      }
    }
    function build() {
      const AREA = W * H;
      far = []; near = []; band = []; wisps = []; dustM = []; flakes = [];
      let n = Math.round(AREA / 700);
      for (let i = 0; i < n; i++) { const z = Math.pow(Math.random(), 1.5); far.push({ r: Math.sqrt(Math.random()) * maxR, a: rnd(0, TAU), z, s: rnd(0.5, 1.3) + z * 0.7, c: FIELD_MIX[(Math.random() * FIELD_MIX.length) | 0], vi: (Math.random() * 3) | 0, ph: rnd(0, TAU), sp: rnd(0.4, 2) }); }
      n = Math.round(AREA / 1700);
      for (let i = 0; i < n; i++) { const z = rnd(0.55, 1); near.push({ r: Math.sqrt(Math.random()) * maxR, a: rnd(0, TAU), z, s: rnd(1.6, 3.1), c: FIELD_MIX[(Math.random() * FIELD_MIX.length) | 0], vi: (Math.random() * 3) | 0, ph: rnd(0, TAU), sp: rnd(0.4, 1.6), flare: Math.random() < 0.14 }); }
      const bA = rnd(0, TAU), dX = Math.cos(bA), dY = Math.sin(bA) * 0.5;
      n = Math.round(AREA / 1500);
      for (let i = 0; i < n; i++) { const tt = rnd(-1, 1), g = gauss(); const ppx = poleX + dX * tt * maxR * 0.95 - dY * g * H * 0.16, ppy = poleY + dY * tt * maxR * 0.95 + dX * g * H * 0.16; const ddx = ppx - poleX, ddy = ppy - poleY; band.push({ r: Math.hypot(ddx, ddy), a: Math.atan2(ddy, ddx), z: rnd(0.1, 0.7), s: rnd(0.5, 1.4), c: Math.random() < 0.7 ? 'w' : (Math.random() < 0.5 ? 'y' : 'b'), vi: (Math.random() * 3) | 0, ph: rnd(0, TAU), sp: rnd(0.3, 1.2) }); }
      for (let i = 0; i < 16; i++) { wisps.push({ r: rnd(maxR * 0.15, maxR * 0.7), a: rnd(0, TAU), om: rnd(0.000004, 0.000012) * (Math.random() < 0.5 ? 1 : -1), s: rnd(110, 260), c: ['cb', 'uq', 'tq', 'vp'][(Math.random() * 4) | 0], cvi: (Math.random() * 2) | 0, al: rnd(0.024, 0.05), ph: rnd(0, TAU) }); }
      for (let i = 0; i < 34; i++) { dustM.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(5, 16), a: rnd(0.04, 0.11), c: Math.random() < 0.6 ? 'y' : 'b', vi: (Math.random() * 3) | 0, vy: rnd(0.008, 0.028), ph: rnd(0, TAU) }); }
      n = Math.round(AREA / 5500);
      for (let i = 0; i < n; i++) { const pts: [number, number][] = [], np = 5 + ((Math.random() * 3) | 0); for (let j = 0; j < np; j++) { const a = (j / np) * TAU + rnd(-0.3, 0.3), rr = rnd(0.55, 1.1); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } flakes.push({ r: Math.sqrt(Math.random()) * maxR, a: rnd(0, TAU), z: rnd(0.5, 1), s: rnd(2.2, 4.6), rot: rnd(0, TAU), vr: rnd(-0.0006, 0.0006), pts, ph: rnd(0, TAU), sp: rnd(0.3, 1), c: Math.random() < 0.7 ? '238,224,150' : (Math.random() < 0.5 ? '232,238,252' : '150,200,255') }); }
      buildDream(); buildSpheres(); buildRiver(); buildAmbient();
    }
    function buildNebula() {
      nWisp = []; nEmb = [];
      for (let i = 0; i < 250; i++) {
        const ang = rnd(0, TAU), rad = Math.pow(Math.random(), 0.5) * A0 * 1.02 + 8, q = rad / A0, g = gauss() * bandW * (0.35 + q * 0.45);
        let c: string;
        if (q < 0.3) c = Math.random() < 0.6 ? 'cb' : 'tq';
        else if (q < 0.6) c = ['cb', 'uq', 'tq'][(Math.random() * 3) | 0];
        else c = ['vp', 'pq', 'uq'][(Math.random() * 3) | 0];
        nWisp.push({ ang, rad, g, om: (0.00018 / Math.sqrt(q * 6 + 1)) * rnd(0.8, 1.2), s: rnd(55, 150) + q * 115, al: rnd(0.03, 0.075) * (1 - q * 0.3), c, cvi: (Math.random() * 2) | 0, ph: rnd(0, TAU) });
      }
      for (let i = 0; i < 32; i++) { nWisp.push({ ang: rnd(0, TAU), rad: rnd(0, A0 * 0.12), g: gauss() * bandW * 0.3, om: 0.00026 * rnd(0.7, 1.3), s: rnd(40, 95), al: rnd(0.04, 0.095), c: ['cb', 'tq', 'cb'][(Math.random() * 3) | 0], cvi: (Math.random() * 2) | 0, ph: rnd(0, TAU) }); }
      for (let i = 0; i < 270; i++) { const ang = rnd(0, TAU), rad = Math.pow(Math.random(), 0.5) * A0 + 6; nEmb.push({ ang, rad, g: gauss() * bandW * (0.3 + (rad / A0) * 0.4), om: 0.0002 / Math.sqrt((rad / A0) * 6 + 1), s: rnd(0.8, 2.3), c: ['w', 'y', 'b'][(Math.random() * 3) | 0], vi: (Math.random() * 3) | 0, ph: rnd(0, TAU), sp: rnd(0.6, 2.4), ig: t0 + 4200 + rnd(0, 2600) }); }
    }
    function buildFlow() {
      flow = [];
      const n = Math.min(1500, Math.round(420 + (W * H) / 2400));
      const nArm = 5, armBase = rnd(0, TAU);
      for (let i = 0; i < n; i++) {
        const arm = i % nArm, armA = armBase + arm * (TAU / nArm) + rnd(-0.3, 0.3);
        const homeR = Math.pow(Math.random(), 0.6) * A0 * 0.9 + A0 * 0.08;
        const startD = A0 * rnd(1.5, 4.2);
        const delay = arm * 300 + rnd(0, 900) + (startD / (A0 * 4.2)) * rnd(800, 1500);
        const z = rnd(0.5, 1.5), head = Math.random() < 0.06;
        flow.push({ armA, homeR, startD, wind: rnd(1.2, 2), delay, dur: rnd(2600, 3800), z, head, th0: armA + rnd(-0.25, 0.25), mode: 0, x: -9999, y: -9999, tr: [], a: 0, r: homeR, th: armA, om: rnd(0.8, 1.2) * 0.0016 / Math.sqrt(homeR / 60 + 1), wp: rnd(0, TAU), wf: rnd(0.5, 1.4), s: rnd(1.2, 3.2) * (head ? 1.8 : 1), c: FLOW_MIX[(Math.random() * FLOW_MIX.length) | 0], vi: (Math.random() * 3) | 0, baseA: rnd(0.45, 0.95) * (head ? 1.35 : 1), vx: 0, vy: 0, ft: 0, fl: 1, settle: Math.random() < 0.55 });
      }
    }

    // ── 绘制层 ──
    function cometTail(tr: number[], x: number, y: number, rgb: string, alpha: number, width: number) {
      const n = tr.length;
      if (n < 4 || alpha <= 0.01) return;
      if (Math.abs(x - tr[0]) + Math.abs(y - tr[1]) < 3) return;
      const g = ctx.createLinearGradient(tr[0], tr[1], x, y);
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(1, `rgba(${rgb},${alpha.toFixed(3)})`);
      ctx.strokeStyle = g; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(tr[0], tr[1]);
      for (let j = 2; j < n; j += 2) ctx.lineTo(tr[j], tr[j + 1]);
      ctx.lineTo(x, y); ctx.stroke();
    }
    function pushHist(tr: number[], x: number, y: number, cap: number) {
      const n = tr.length;
      if (n >= 2) { const ddx = x - tr[n - 2], ddy = y - tr[n - 1], dd = ddx * ddx + ddy * ddy; if (dd > 2500) { tr.length = 0; tr.push(x, y); return; } if (dd <= 9) return; }
      tr.push(x, y);
      if (tr.length > cap) tr.splice(0, tr.length - cap);
    }
    function wobbly(L: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, amp: number) {
      L.beginPath();
      for (let i = 0; i <= 26; i++) { const a = (i / 26) * TAU, rr = r + Math.sin(a * 5 + seed) * amp + Math.sin(a * 9 - seed) * amp * 0.5, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) L.lineTo(px, py); else L.moveTo(px, py); }
      L.closePath();
    }

    function layerLivingRiver() {
      const riverVis = (0.55 + 0.45 * FC.envA) * clamp((FC.pt - 800) / 1400, 0, 1);
      if (riverVis <= 0.01) return;
      const DW = Math.hypot(W, H) * 0.62, span = DW * 2.1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.translate(GB.cx, GB.cy); ctx.rotate(GB.ang);
      for (let p = 0; p < 4; p++) {
        const ppos = (((riverFlow * 240 + (p * span) / 4) % span) + span) % span - span * 0.5, pw = GB.width * 2.4;
        const gr = ctx.createLinearGradient(ppos - pw, 0, ppos + pw, 0);
        gr.addColorStop(0, 'rgba(120,160,255,0)');
        gr.addColorStop(0.5, `rgba(150,180,255,${(0.22 * riverVis).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(120,160,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(ppos - pw, -GB.width * 1.4, pw * 2, GB.width * 2.8);
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const R2 = 190 * 190;
      const rn = Math.round(riverStars.length * FC.quality);
      for (let i = 0; i < rn; i++) {
        const st = riverStars[i];
        st.along += st.drift * FC.dt;
        if (st.along > 1.05 * DW) st.along -= span; else if (st.along < -1.05 * DW) st.along += span;
        const pp = bandXY(st.along, st.perp);
        const flick = 0.45 + 0.55 * Math.sin(FC.t * 0.0012 * st.sp + st.ph);
        let px = pp[0] + FC.mx * 32 * st.z, py = pp[1] + FC.my * 22 * st.z;
        const ddx = px - cur.x, ddy = py - cur.y, d2 = ddx * ddx + ddy * ddy;
        let f = 0;
        if (d2 < R2) { const invd = 1 / (Math.sqrt(d2) + 0.001); f = 1 - Math.sqrt(d2) / 190; px += ddx * invd * f * 18; py += ddy * invd * f * 18; }
        let pulseBoost = 0;
        for (let p = 0; p < 4; p++) { const ppos = (((riverFlow * 240 + (p * span) / 4) % span) + span) % span - span * 0.5; let dAlong = Math.abs(st.along - ppos); if (dAlong > span * 0.5) dAlong = span - dAlong; if (dAlong < 280) { const g2 = 1 - dAlong / 280; pulseBoost += g2 * g2; } }
        if (pulseBoost > 1.4) pulseBoost = 1.4;
        const alpha = (st.base * flick * (0.5 + 0.45 * pulseBoost) + f * 1.2 + pulseBoost * 0.45) * riverVis;
        if (alpha < 0.02) continue;
        const sz = st.size * (1 + pulseBoost * 0.4), spr = SPR[st.c]; if (!spr) continue;
        ctx.globalAlpha = Math.min(0.9, alpha * 0.5); ctx.drawImage(spr[0], px - sz * 3, py - sz * 3, sz * 6, sz * 6);
        ctx.globalAlpha = Math.min(1, alpha); ctx.drawImage(spr[1], px - sz, py - sz, sz * 2, sz * 2);
        if (f > 0.25 || pulseBoost > 0.5) { ctx.globalAlpha = Math.min(1, (f * 0.9 + pulseBoost * 0.6) * riverVis); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(px, py, sz * 0.5, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }
    function layerAmbient() {
      const vis = 0.5 + 0.5 * FC.envA;
      if (vis <= 0.01) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const n = Math.round(ambient.length * FC.quality);
      for (let i = 0; i < n; i++) {
        const st = ambient[i];
        let px: number, py: number;
        if (st.vi >= 0) { const vv = vortices[st.vi]; st.ang += st.spin * FC.dt; px = vv.x + Math.cos(st.ang) * st.rad + FC.mx * 18 * st.z; py = vv.y + Math.sin(st.ang) * st.rad * st.flat + FC.my * 12 * st.z; }
        else { st.x += st.vx * FC.dt; st.y += st.vy * FC.dt; if (st.x < -20) st.x += W + 40; else if (st.x > W + 20) st.x -= W + 40; if (st.y < -20) st.y += H * 0.84 + 40; else if (st.y > H * 0.84 + 20) st.y -= H * 0.84 + 40; px = st.x + Math.sin(FC.t * 0.0005 * st.sp + st.ph) * 4 * st.z + FC.mx * 18 * st.z; py = st.y + Math.cos(FC.t * 0.0004 * st.sp + st.ph * 1.3) * 4 * st.z + FC.my * 12 * st.z; }
        const flick = 0.4 + 0.6 * Math.sin(FC.t * 0.0011 * st.sp + st.ph), alpha = st.base * flick * vis;
        if (alpha < 0.02) continue;
        const sz = st.size, spr = SPR[st.c]; if (!spr) continue;
        ctx.globalAlpha = Math.min(0.8, alpha * 0.5); ctx.drawImage(spr[0], px - sz * 2.6, py - sz * 2.6, sz * 5.2, sz * 5.2);
        ctx.globalAlpha = Math.min(1, alpha); ctx.drawImage(spr[1], px - sz, py - sz, sz * 2, sz * 2);
      }
      ctx.restore();
    }
    function layerCursorGlow() {
      if (cur.x < -900) return;
      const ga = clamp(1 - (FC.t - lastMove) / 1100, 0, 1) * 0.5;
      if (ga < 0.01) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, 240);
      gr.addColorStop(0, `rgba(150,180,255,${(ga * 0.5).toFixed(3)})`);
      gr.addColorStop(0.4, `rgba(110,140,255,${(ga * 0.22).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(110,140,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(cur.x - 240, cur.y - 240, 480, 480);
      ctx.restore();
    }
    function layerNebula() {
      if (FC.nebA <= 0) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const scale = 1 - 0.7 * FC.kk * FC.kk, bright = 1 + 0.7 * FC.kk;
      for (let i = 0; i < nWisp.length; i++) {
        const w = nWisp[i]; w.ang += w.om * FC.dt * SPD * (1 + 1.2 * FC.kk);
        const rr = w.rad * scale + Math.sin(FC.t * 0.0003 + w.ph) * 7;
        const bp = bandPt(w.ang, rr, w.g * scale);
        const behind = 0.72 + 0.28 * Math.sin(w.ang);
        ctx.globalAlpha = w.al * FC.nebA * bright * behind;
        const s = w.s * scale;
        ctx.drawImage(CLD[w.c][w.cvi], bp[0] - s, bp[1] - s * 0.55, s * 2, s * 1.1);
      }
      for (let j = 0; j < nEmb.length; j++) {
        const e = nEmb[j]; if (FC.t < e.ig) continue;
        e.ang += e.om * FC.dt * SPD;
        const ia = Math.min(1, (FC.t - e.ig) / 600);
        const bp = bandPt(e.ang, e.rad * scale, e.g * scale);
        const tw = 0.5 + 0.5 * Math.sin(FC.t * 0.001 * e.sp + e.ph);
        ctx.globalAlpha = ia * FC.nebA * (1 - FC.kk * 0.6) * tw * 0.9;
        const d = e.s * 8;
        ctx.drawImage(SPR[e.c][e.vi], bp[0] - d / 2, bp[1] - d / 2, d, d);
      }
      ctx.restore();
    }
    function drawStar(s: any, nearL: boolean) {
      const a = s.a + rot * (0.5 + 0.5 * s.z);
      let x = poleX + Math.cos(a) * s.r + FC.mx * 26 * s.z;
      let y = poleY + Math.sin(a) * s.r * 0.94 + FC.my * 16 * s.z;
      x += Math.sin(FC.t * 0.0006 * s.sp + s.ph) * 6 * s.z + Math.sin(FC.t * 0.00023 + s.ph * 1.7) * 3;
      y += Math.cos(FC.t * 0.0005 * s.sp + s.ph * 1.3) * 5 * s.z + Math.cos(FC.t * 0.00019 + s.ph) * 3;
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return;
      const tw = 0.55 + 0.45 * Math.sin(FC.t * 0.001 * s.sp + s.ph);
      const al = ((nearL ? 0.42 : 0.18) + 0.62 * s.z) * tw * FC.envA;
      const sz = s.s * (0.7 + 0.7 * s.z), d = sz * (nearL ? 9 : 10);
      if (s.z < 0.4) { ctx.globalAlpha = al * 0.5; ctx.drawImage(SPR[s.c][s.vi], x - d * 0.8, y - d * 0.8, d * 1.6, d * 1.6); }
      ctx.globalAlpha = al; ctx.drawImage(SPR[s.c][s.vi], x - d / 2, y - d / 2, d, d);
      if (nearL) {
        ctx.drawImage(SPR.w[s.vi], x - sz * 1.5, y - sz * 1.5, sz * 3, sz * 3);
        if (s.flare) { ctx.globalAlpha = al * 0.3; ctx.fillStyle = 'rgba(232,238,252,1)'; const L = sz * 7; ctx.fillRect(x - L, y - 0.5, L * 2, 1); ctx.fillRect(x - 0.5, y - L * 0.7, 1, L * 1.4); }
        if (s.z > 0.8) { ctx.globalAlpha = al * 0.9; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x - sz * 0.4, y - sz * 0.4, sz * 0.5, 0, TAU); ctx.fill(); }
      }
    }
    function layerStars() {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      let n = (far.length * FC.quality) | 0; for (let i = 0; i < n; i++) drawStar(far[i], false);
      n = (band.length * FC.quality) | 0; for (let i = 0; i < n; i++) drawStar(band[i], false);
      n = (near.length * FC.quality) | 0; for (let i = 0; i < n; i++) drawStar(near[i], true);
      if (FC.envA > 0.05) {
        for (let i = 0; i < wisps.length; i++) { const w = wisps[i]; w.a += w.om * FC.dt; const x = poleX + Math.cos(w.a) * w.r + FC.mx * 10, y = poleY + Math.sin(w.a) * w.r * 0.9 + FC.my * 8 + Math.sin(FC.t * 0.0002 + w.ph) * 14; ctx.globalAlpha = w.al * FC.envA * (0.7 + 0.3 * Math.sin(FC.t * 0.0004 + w.ph)); ctx.drawImage(CLD[w.c][w.cvi], x - w.s, y - w.s * 0.6, w.s * 2, w.s * 1.2); }
        for (let i = 0; i < dustM.length; i++) { const dm = dustM[i]; dm.y -= dm.vy * FC.dt; dm.x += Math.sin(FC.t * 0.0004 + dm.ph) * 0.08; if (dm.y < -24) { dm.y = H + 24; dm.x = rnd(0, W); } ctx.globalAlpha = dm.a * FC.envA; ctx.drawImage(SPR[dm.c][dm.vi], dm.x - dm.r, dm.y - dm.r, dm.r * 2, dm.r * 2); }
      }
      for (let i = motes.length - 1; i >= 0; i--) { const m = motes[i]; m.t += FC.dt; const k = m.t / m.life; if (k >= 1) { motes.splice(i, 1); continue; } m.x += m.vx * FC.dt; m.y += m.vy * FC.dt; ctx.globalAlpha = (1 - k) * 0.45; const dd = m.s * 3 * (1 - k * 0.5) + 2; ctx.drawImage(SPR[m.c][m.vi], m.x - dd / 2, m.y - dd / 2, dd, dd); }
      ctx.restore();
    }
    function layerFlow() {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = flow.length - 1; i >= 0; i--) {
        const f = flow[i];
        if (f.mode === 0) {
          const p = (FC.pt - f.delay) / f.dur; if (p <= 0) continue;
          const e = easeIO(Math.min(1, p)), rad = f.homeR + Math.pow(1 - e, 1.3) * f.startD, ang = f.armA + (1 - e) * f.wind;
          const bp = bandPt(ang, rad, 0), jit2 = (1 - e) * 5 + 1;
          f.x = bp[0] + Math.sin(FC.t * 0.001 * f.wf + f.wp) * jit2 + FC.mx * 18 * f.z;
          f.y = bp[1] + Math.cos(FC.t * 0.0009 * f.wf + f.wp) * jit2 * 0.6 + FC.my * 12 * f.z;
          f.a = Math.min(1, p * 3) * f.baseA * (0.5 + 0.5 * e);
          if (p >= 1) { f.mode = 1; f.th = f.th0; f.tr.length = 0; }
        } else if (f.mode === 1) {
          f.th += f.om * FC.dt * SPD * (1 + 1.4 * FC.kk);
          f.r -= FC.dt * 0.0018 * (50 / (f.r + 40));
          if (f.r < A0 * 0.05) { f.r = A0 * rnd(0.7, 1); f.th = f.armA + rnd(-0.3, 0.3); }
          f.r *= Math.pow(0.9952, FC.kk * FC.dt);
          const rr = f.r + Math.sin(FC.t * 0.001 * f.wf + f.wp) * 4;
          const bp2 = bandPt(f.th, rr, 0);
          f.x = bp2[0] + FC.mx * 18 * f.z; f.y = bp2[1] + FC.my * 12 * f.z;
          f.a = f.baseA * (0.66 + 0.34 * Math.sin(f.th));
        }
        if (FC.pt >= TL.burst && f.mode < 2) {
          f.mode = 2;
          let dx = f.x - CX, dy = f.y - CY, d = Math.hypot(dx, dy);
          if (d < 1) { const ra = Math.random() * TAU; dx = Math.cos(ra); dy = Math.sin(ra); d = 1; }
          const ang2 = Math.atan2(dy, dx), clump = 0.55 + Math.abs(Math.sin(ang2 * 3.7) + Math.sin(ang2 * 7.3)) * 0.5;
          const sp = rnd(0.2, 0.8) * clump * (0.5 + 70 / (d + 40));
          f.vx = (dx / d) * sp - (dy / d) * 0.07; f.vy = (dy / d) * sp + (dx / d) * 0.07;
          f.ft = 0; f.fl = rnd(1300, 2700); f.tr.length = 0;
        }
        if (f.mode === 2) {
          f.ft += FC.dt;
          const dr = Math.pow(0.986, FC.dt / 16);
          f.vx *= dr; f.vy *= dr; f.x += f.vx * FC.dt; f.y += f.vy * FC.dt;
          f.a = f.baseA * Math.max(0, 1 - f.ft / f.fl);
          if (f.ft > f.fl * 0.75 && f.settle) { const sdx = f.x - poleX, sdy = f.y - poleY; const st = { r: Math.hypot(sdx, sdy), a: Math.atan2(sdy, sdx), z: clamp(f.z - 0.4, 0.1, 1), s: f.s * 0.85, c: f.c, vi: f.vi, ph: rnd(0, TAU), sp: rnd(0.4, 1.8) }; (f.s > 2.1 ? near : far).push(st); flow.splice(i, 1); continue; }
          if (f.ft > f.fl || f.x < -90 || f.x > W + 90 || f.y < -90 || f.y > H + 90) { flow.splice(i, 1); continue; }
        }
        if (f.x < -150 || f.x > W + 150 || f.y < -150 || f.y > H + 150) continue;
        if (f.mode !== 1) { pushHist(f.tr, f.x, f.y, 20); const tA = f.mode === 2 ? 0.34 : 0.42; const vis = f.mode === 0 ? Math.min(1, ((FC.pt - f.delay) / f.dur) * 4) : 1; cometTail(f.tr, f.x, f.y, C[f.c], (f.head ? tA * 1.25 : tA) * Math.max(0, vis), f.s * (f.mode === 2 ? 1.3 : 1.4)); }
        const tw = 0.7 + 0.3 * Math.sin(FC.t * 0.002 + f.wp);
        const dd = f.s * 9 * (f.mode === 0 ? (0.7 + 0.6 * Math.min(1, (FC.pt - f.delay) / f.dur)) : 1);
        ctx.globalAlpha = f.a * tw; ctx.drawImage(SPR[f.c][f.vi], f.x - dd / 2, f.y - dd / 2, dd, dd);
        if (f.head && f.mode < 2) { ctx.globalAlpha = f.a * tw * 0.8; ctx.drawImage(SPR.w[f.vi], f.x - f.s, f.y - f.s, f.s * 2, f.s * 2); }
      }
      ctx.restore();
    }
    function layerBurst() {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = streaks.length - 1; i >= 0; i--) { const s = streaks[i]; s.t += FC.dt; const k = s.t / s.life; if (k >= 1) { streaks.splice(i, 1); continue; } s.sp *= Math.pow(0.988, FC.dt / 16); s.x += Math.cos(s.a) * s.sp * FC.dt; s.y += Math.sin(s.a) * s.sp * FC.dt; s.len *= Math.pow(0.997, FC.dt / 16); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.scale(-1, 1); ctx.globalAlpha = (1 - k) * 0.72; ctx.drawImage(STK[s.c], 0, -s.w * 2.2, s.len, s.w * 4.4); ctx.restore(); ctx.globalAlpha = (1 - k) * 0.42; ctx.drawImage(SPR[s.c][0], s.x - s.w * 2, s.y - s.w * 2, s.w * 4, s.w * 4); }
      for (let i = sparks.length - 1; i >= 0; i--) { const b = sparks[i]; b.t += FC.dt; b.px = b.x; b.py = b.y; const dr = Math.pow(0.984, FC.dt / 16); b.vx *= dr; b.vy = b.vy * dr + 0.00009 * FC.dt; b.x += b.vx * FC.dt; b.y += b.vy * FC.dt; const k = 1 - b.t / b.life; if (k <= 0) { sparks.splice(i, 1); continue; } ctx.globalAlpha = k * 0.32; ctx.strokeStyle = `rgb(${C[b.c]})`; ctx.lineWidth = b.s * 0.7; ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke(); const d = b.s * 7 * k + 2; ctx.globalAlpha = k * 0.82; ctx.drawImage(SPR[b.c][b.vi], b.x - d / 2, b.y - d / 2, d, d); }
      for (let i = embers.length - 1; i >= 0; i--) { const e2 = embers[i]; e2.t += FC.dt; const dre = Math.pow(0.995, FC.dt / 16); e2.vx *= dre; e2.vy *= dre; e2.x += e2.vx * FC.dt; e2.y += e2.vy * FC.dt; const k = 1 - e2.t / e2.life; if (k <= 0) { embers.splice(i, 1); continue; } const tw = 0.6 + 0.4 * Math.sin(FC.t * 0.003 + e2.ph); const de = e2.s * 10 * (0.5 + 0.5 * k); ctx.globalAlpha = k * 0.42 * tw; ctx.drawImage(SPR[e2.c][e2.vi], e2.x - de / 2, e2.y - de / 2, de, de); }
      for (let i = shells.length - 1; i >= 0; i--) { const s = shells[i]; s.t += FC.dt; if (s.t < 0) continue; const k = s.t / s.life; if (k >= 1) { shells.splice(i, 1); continue; } const r = s.maxR * easeO(k), a = s.al * (1 - k) * (1 - k); const g = ctx.createRadialGradient(s.x, s.y, r * 0.82, s.x, s.y, r); g.addColorStop(0, 'rgba(200,210,240,0)'); g.addColorStop(0.72, `rgba(200,210,240,${a})`); g.addColorStop(1, 'rgba(200,210,240,0)'); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.fill(); }
      for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += FC.dt; if (r.t < 0) continue; const k = r.t / r.life; if (k >= 1) { rings.splice(i, 1); continue; } const rr = r.maxR * easeO(k); ctx.globalAlpha = (1 - k) * 0.48; ctx.strokeStyle = 'rgba(200,216,250,1)'; ctx.lineWidth = 2.3 * (1 - k) + 0.4; wobbly(ctx, r.x, r.y, rr, r.seed, Math.max(1.2, rr * 0.02)); ctx.stroke(); }
      if (FC.envA > 0.6) {
        if (!meteor && FC.t > nextMeteor) { const dir = Math.random() < 0.7 ? 1 : -1; meteor = { x: rnd(W * 0.15, W * 0.85), y: rnd(H * 0.04, H * 0.32), vx: rnd(0.3, 0.55) * dir, vy: rnd(0.16, 0.3), t: 0, life: rnd(600, 950) }; nextMeteor = FC.t + rnd(2600, 5600); }
        if (meteor) { meteor.t += FC.dt; meteor.x += meteor.vx * FC.dt; meteor.y += meteor.vy * FC.dt; const mk = 1 - meteor.t / meteor.life; if (mk <= 0 || meteor.y > horizonY) meteor = null; else { const tx = meteor.x - meteor.vx * 300, ty = meteor.y - meteor.vy * 300; const g = ctx.createLinearGradient(meteor.x, meteor.y, tx, ty); g.addColorStop(0, `rgba(232,238,252,${(0.55 * mk).toFixed(3)})`); g.addColorStop(1, 'rgba(232,238,252,0)'); ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(meteor.x, meteor.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.globalAlpha = 0.88 * mk; ctx.drawImage(SPR.w[0], meteor.x - 8, meteor.y - 8, 16, 16); } }
      }
      ctx.restore();
    }
    function layerComets() {
      if (!sceneOn) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const eS = Math.sin(cycle), eG = -eS;
      const vS = Math.max(0, Math.min(1, (eS + 0.95) / 0.35)) * FC.fade;
      const vG = Math.max(0, Math.min(1, (eG + 0.95) / 0.35)) * FC.fade;
      if (vS < 0.05) trS.length = 0; else pushHist(trS, P.sx, P.sy, 80);
      if (vG < 0.05) trG.length = 0; else pushHist(trG, P.gx, P.gy, 80);
      cometTail(trS, P.sx, P.sy, C.r, 0.4 * vS, 2.2);
      cometTail(trG, P.gx, P.gy, C.b, 0.4 * vG, 2.2);
      ctx.restore();
    }
    function layerSpheres() {
      const sN = Math.round(spheres.length * Math.max(0.5, FC.quality));
      if (sN <= 0) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < sN; i++) { const sp = spheres[i]; sp.x += sp.vx * FC.dt; sp.y += sp.vy * FC.dt; if (sp.x < -30) sp.x = W + 30; if (sp.x > W + 30) sp.x = -30; if (sp.y < -30) sp.y = H + 30; if (sp.y > H + 30) sp.y = -30; const px = sp.x + FC.mx * 34 * sp.z, py = sp.y + FC.my * 24 * sp.z, tw = 0.6 + 0.4 * Math.sin(FC.t * 0.001 * sp.sp + sp.ph), gs = sp.s * (2.2 + 2.8 * sp.z); ctx.globalAlpha = (0.12 + 0.24 * sp.z) * tw * FC.fadeSph; ctx.drawImage(SPR[sp.c][0], px - gs / 2, py - gs / 2, gs, gs); }
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < sN; i++) { const sp = spheres[i]; const px = sp.x + FC.mx * 34 * sp.z, py = sp.y + FC.my * 24 * sp.z, tw = 0.7 + 0.3 * Math.sin(FC.t * 0.001 * sp.sp + sp.ph), sz = sp.s * (0.9 + 1.4 * sp.z); ctx.globalAlpha = (0.55 + 0.45 * sp.z) * tw * FC.fadeSph; ctx.drawImage(SPH[sp.c], px - sz / 2, py - sz / 2, sz, sz); }
      ctx.restore();
    }
    function layerPigment() {
      ctx.save(); ctx.globalCompositeOperation = 'source-over';
      if (FC.envA > 0.05) {
        const nf = (flakes.length * FC.quality) | 0;
        for (let i = 0; i < nf; i++) { const fl = flakes[i]; const a = fl.a + rot * (0.5 + 0.5 * fl.z); let x = poleX + Math.cos(a) * fl.r + FC.mx * 26 * fl.z, y = poleY + Math.sin(a) * fl.r * 0.94 + FC.my * 16 * fl.z; if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue; const tw = 0.5 + 0.5 * Math.sin(FC.t * 0.001 * fl.sp + fl.ph), al = (0.3 + 0.5 * fl.z) * tw * FC.envA; ctx.save(); ctx.translate(x, y); ctx.rotate(fl.rot + FC.t * fl.vr); ctx.globalAlpha = al; ctx.fillStyle = `rgb(${fl.c})`; ctx.beginPath(); for (let j = 0; j < fl.pts.length; j++) { const p = fl.pts[j]; if (j) ctx.lineTo(p[0] * fl.s, p[1] * fl.s); else ctx.moveTo(p[0] * fl.s, p[1] * fl.s); } ctx.closePath(); ctx.fill(); ctx.globalAlpha = al * 0.82; ctx.fillStyle = 'rgba(250,246,255,1)'; ctx.fillRect(-fl.s * 0.18, -fl.s * 0.18, fl.s * 0.36, fl.s * 0.36); ctx.restore(); }
      }
      for (let i2 = splats.length - 1; i2 >= 0; i2--) { const s2 = splats[i2]; s2.t += FC.dt; const k = s2.t / s2.life; if (k >= 1) { splats.splice(i2, 1); continue; } const grow = k < 0.12 ? easeO(k / 0.12) : 1; const al2 = k < 0.45 ? 0.78 : 0.78 * (1 - (k - 0.45) / 0.55); const sz = s2.s * grow; ctx.save(); ctx.translate(s2.x, s2.y); ctx.rotate(s2.rot); ctx.globalAlpha = al2; ctx.drawImage(DAB[s2.c][0], -sz / 2, -sz / 2, sz, sz); ctx.restore(); }
      ctx.restore();
    }

    function splatBurst(x: number, y: number, n: number, pow: number) {
      for (let i = 0; i < n; i++) { const c = ['y', 'b', 'w', 'v'][(Math.random() * 4) | 0]; splats.push({ x: x + gauss() * 16 * pow, y: y + gauss() * 16 * pow, rot: rnd(0, TAU), s: rnd(20, 54) * pow, c, t: 0, life: rnd(1400, 2600) }); for (let j = 0; j < 5; j++) { const a = rnd(0, TAU), d = rnd(18, 70) * pow; splats.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, rot: rnd(0, TAU), s: rnd(4, 13) * pow, c, t: 0, life: rnd(900, 1800) }); } }
      if (splats.length > 200) splats.splice(0, splats.length - 200);
    }
    function burstAt(x: number, y: number, pow: number) {
      let n = Math.round((RM ? 20 : 42) * pow);
      for (let i = 0; i < n; i++) { const a = rnd(0, TAU), sp = rnd(0.05, 0.4) * pow; sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0, 0.05), t: 0, life: rnd(500, 1500), s: rnd(1, 3.2), c: SPARK_MIX[(Math.random() * SPARK_MIX.length) | 0], vi: (Math.random() * 3) | 0 }); }
      n = Math.round((RM ? 5 : 12) * pow);
      for (let i = 0; i < n; i++) { const a = rnd(0, TAU), sp = rnd(0.18, 0.55) * pow; streaks.push({ x, y, a, sp, len: rnd(24, 70) * pow, w: rnd(1.5, 3.5), t: 0, life: rnd(700, 1400), c: SPARK_MIX[(Math.random() * SPARK_MIX.length) | 0], vi: (Math.random() * 2) | 0 }); }
      n = Math.round(5 * pow);
      for (let i = 0; i < n; i++) { const a = rnd(0, TAU), sp = rnd(0.01, 0.05); embers.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rnd(3, 7), c: Math.random() < 0.6 ? 'y' : 'b', vi: (Math.random() * 3) | 0, t: 0, life: rnd(2200, 4200), ph: rnd(0, TAU) }); }
      splatBurst(x, y, Math.round(3 * pow), pow);
      rings.push({ x, y, t: 0, life: 620, maxR: rnd(150, 230) * pow, seed: rnd(0, TAU) });
      shells.push({ x, y, t: 0, life: 760, maxR: rnd(120, 180) * pow, al: 0.48 });
    }
    function supernova() {
      burstDone = true;
      const seed = rnd(0, TAU);
      for (let i = 0; i < 300; i++) { const a = rnd(0, TAU), clump = 0.5 + Math.abs(Math.sin(a * 3.7 + seed) + Math.sin(a * 7.3 - seed)) * 0.55, sp = rnd(0.18, 0.62) * clump; sparks.push({ x: CX, y: CY, px: CX, py: CY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rnd(700, 2100), s: rnd(1, 3.4), c: SPARK_MIX[(Math.random() * SPARK_MIX.length) | 0], vi: (Math.random() * 3) | 0 }); }
      for (let i = 0; i < 90; i++) { const a = rnd(0, TAU), clump = 0.5 + Math.abs(Math.sin(a * 3.7 + seed) + Math.sin(a * 7.3 - seed)) * 0.55; streaks.push({ x: CX, y: CY, a, sp: rnd(0.25, 0.75) * clump, len: rnd(40, 130), w: rnd(2, 4.5), t: 0, life: rnd(900, 1800), c: SPARK_MIX[(Math.random() * SPARK_MIX.length) | 0], vi: (Math.random() * 2) | 0 }); }
      for (let i = 0; i < 36; i++) { const a = rnd(0, TAU), sp = rnd(0.008, 0.05); embers.push({ x: CX, y: CY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rnd(3.5, 9), c: Math.random() < 0.55 ? 'y' : (Math.random() < 0.5 ? 'b' : 'v'), vi: (Math.random() * 3) | 0, t: 0, life: rnd(2600, 5200), ph: rnd(0, TAU) }); }
      splatBurst(CX, CY, 9, 1.6);
      shells.push({ x: CX, y: CY, t: 0, life: 1400, maxR: Math.hypot(W, H) * 0.62, al: 0.46 });
      shells.push({ x: CX, y: CY, t: -220, life: 1900, maxR: Math.hypot(W, H) * 0.8, al: 0.34 });
      rings.push({ x: CX, y: CY, t: 0, life: 1100, maxR: Math.hypot(W, H) * 0.5, seed: rnd(0, TAU) });
      nextMeteor = performance.now() + 1500;
    }

    function setStar(el: HTMLDivElement, x: number, y: number, e: number, fade: number) {
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      el.style.opacity = (Math.max(0, Math.min(1, (e + 0.95) / 0.35)) * fade).toFixed(3);
      el.style.setProperty('--el', Math.max(0, e).toFixed(3));
    }
    function seg(el: SVGLineElement, x0: number, y0: number, x1: number, y1: number, p0: number, p1: number): [number, number] {
      const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      el.setAttribute('x1', String(x0 + ux * p0)); el.setAttribute('y1', String(y0 + uy * p0));
      el.setAttribute('x2', String(x1 - ux * p1)); el.setAttribute('y2', String(y1 - uy * p1));
      return [x1 - ux * p1, y1 - uy * p1];
    }

    // ── 主循环 ──
    let pt2 = 0;
    let rafId = 0;
    function frame(t: number) {
      const dt = Math.min(50, t - pt2 || 16); pt2 = t; const pt = t - t0;
      qEMA = qEMA * 0.95 + dt * 0.05;
      if (t - lastQ > 1600) { if (qEMA > 24 && quality > 0.35) quality -= 0.15; else if (qEMA < 17 && quality < 1) quality += 0.1; lastQ = t; }
      if (t - lastAuto > 2600) cycle += dt * (TAU / 30000) * SPD;
      rot += dt * 0.00003 * SPD + dragV; dragV *= 0.93;
      riverFlow += dt * 0.0006 + dragV * 9;
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;

      if (!RM) {
        if (pt >= TL.title && !loadedRef.current) { loadedRef.current = true; setLoaded(true); }
        if (pt >= TL.burst && !burstDone) supernova();
        if (pt >= TL.burst + 520 && !echoDone) { echoDone = true; for (let ei = 0; ei < 90; ei++) { const ea = rnd(0, TAU), esp = rnd(0.06, 0.3); sparks.push({ x: CX, y: CY, px: CX, py: CY, vx: Math.cos(ea) * esp, vy: Math.sin(ea) * esp, t: 0, life: rnd(900, 2200), s: rnd(1, 2.6), c: ['y', 'b', 'w'][(Math.random() * 3) | 0], vi: (Math.random() * 3) | 0 }); } rings.push({ x: CX, y: CY, t: 0, life: 1300, maxR: Math.hypot(W, H) * 0.4, seed: rnd(0, TAU) }); }
        if (pt >= TL.scene && !sceneOn) { sceneOn = true; setTimeout(() => { burstAt(P.sx, P.sy, 1.5); burstAt(P.gx, P.gy, 1.5); }, 250); }
      }

      const kk = pt < TL.contract ? 0 : (pt < TL.burst ? (pt - TL.contract) / (TL.burst - TL.contract) : 1);
      const nebA = RM ? 0 : (pt < 2600 ? 0 : (pt < 4600 ? (pt - 2600) / 2000 : (pt < TL.burst ? 1 : Math.max(0, 1 - (pt - TL.burst) / 500))));
      const envA = RM ? 1 : (pt < TL.burst ? 0.14 : Math.min(1, 0.14 + Math.max(0, pt - TL.burst - 300) / 2800 * 0.86));
      const fade = RM ? 1 : Math.max(0, Math.min(1, (pt - TL.scene) / 900));
      const fadeSph = RM ? 1 : clamp(pt / 2500, 0, 1);
      FC.dt = dt; FC.t = t; FC.pt = pt; FC.kk = kk; FC.nebA = nebA; FC.envA = envA; FC.fade = fade; FC.fadeSph = fadeSph; FC.mx = mx; FC.my = my; FC.quality = quality;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(dreamBg, 0, 0, W, H);

      layerAmbient(); layerLivingRiver(); layerNebula(); layerStars(); layerFlow(); layerBurst(); layerComets(); layerSpheres(); layerPigment(); layerCursorGlow();

      if (!RM && kk > 0 && kk < 1) { ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(6,10,24,${(0.5 * kk * kk).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }

      const eS = Math.sin(cycle), eG = -eS;
      const xS = W * 0.26 + Math.cos(cycle) * W * 0.045 + mx * 10, yS = H * 0.54 - eS * H * 0.24 + my * 6;
      const xG = W * 0.74 - Math.cos(cycle) * W * 0.045 + mx * 10, yG = H * 0.54 - eG * H * 0.24 + my * 6;
      P.sx = xS; P.sy = yS; P.gx = xG; P.gy = yG;
      setStar(shenN, xS, yS, eS, fade); setStar(shangN, xG, yG, eG, fade);
      const mxp = (xS + xG) / 2, myp = (yS + yG) / 2;
      const e1 = seg(thShenN, xS, yS, mxp, myp, 42, 32);
      const e2 = seg(thShangN, xG, yG, mxp, myp, 42, 32);
      endShenN.setAttribute('cx', String(e1[0])); endShenN.setAttribute('cy', String(e1[1]));
      endShangN.setAttribute('cx', String(e2[0])); endShangN.setAttribute('cy', String(e2[1]));
      dashOff -= dt * 0.02 * SPD;
      thShenN.setAttribute('stroke-dashoffset', String(dashOff));
      thShangN.setAttribute('stroke-dashoffset', String(dashOff));
      const vis = Math.max(0, Math.min(1, (Math.min(eS, eG) + 0.4) / 0.4));
      svgN.style.opacity = ((0.28 + 0.62 * vis) * fade).toFixed(3);
      riftN.setAttribute('cx', String(mxp)); riftN.setAttribute('cy', String(myp));
      riftN.setAttribute('r', String(2 + 1.3 * (0.5 + 0.5 * Math.sin(t * 0.004))));
      riftN.style.opacity = (0.45 + 0.4 * Math.sin(t * 0.004)).toFixed(3);

      rafId = requestAnimationFrame(frame);
    }

    // ── 事件 ──
    const onPointerMove = (e: PointerEvent) => {
      cur.x = e.clientX; cur.y = e.clientY; lastMove = performance.now();
      tmx = (e.clientX / W - 0.5) * 2; tmy = (e.clientY / H - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove);

    // ── resize ──
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 1.75);
      W = window.innerWidth; H = window.innerHeight;
      cvN.width = W * DPR; cvN.height = H * DPR;
      cvN.style.width = W + 'px'; cvN.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      poleX = W * 0.6; poleY = H * 0.17; horizonY = H * 0.76; maxR = Math.hypot(W, H) * 0.8;
      CX = W * 0.5; CY = H * 0.44; A0 = Math.hypot(W, H) * 0.55; bandW = H * 0.16;
      cosB = Math.cos(TILTB); sinB = Math.sin(TILTB);
      svgN.setAttribute('viewBox', `0 0 ${W} ${H}`);
      buildVortices(); build(); buildNebula();
      const pt = performance.now() - t0;
      if (!RM && pt < TL.gather - 400) buildFlow(); else if (!RM && pt < TL.burst) flow = [];
      beiN.style.transform = `translate3d(${poleX}px,${poleY}px,0)`;
    }
    window.addEventListener('resize', resize);

    // ── 启动 ──
    resize();
    if (RM) { sceneOn = true; loadedRef.current = true; setLoaded(true); } else { setTimeout(() => { loadedRef.current = true; setLoaded(true); }, 250); }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Framer Motion 入场动画变体
  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 1.8, ease: 'easeOut' as const } },
  };
  const fadeSlowVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 2.2, ease: 'easeOut' as const } },
  };
  const beiVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 2.4, ease: 'easeOut' as const } },
  };

  return (
    <section ref={containerRef} className="cs-root">


      {/* SVG 滤镜定义（水墨边缘 + 水墨线条） */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="cs-inkEdge">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
        </filter>
        <filter id="cs-inkLine">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="8" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
        </filter>
      </svg>

      {/* Canvas 星空（主视觉层） */}
      <canvas ref={canvasRef} className="cs-canvas" />

      {/* 固定辉光层（4 层 radial-gradient，与参考效果图一致，提升整体亮度与氛围） */}
      <div className="cs-glow" />

      {/* 暗角 + 噪点纹理 */}
      <div className="cs-vignette" />
      <div className="cs-grain" />

      {/* 虚线 SVG（连接双星的命运之线） */}
      <svg ref={svgRef} className="cs-thread" width="100%" height="100%">
        <g filter="url(#cs-inkLine)">
          <line ref={thShenRef} stroke="rgba(236,84,128,.8)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.5 11" />
          <line ref={thShangRef} stroke="rgba(96,168,240,.8)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.5 11" />
          <circle ref={endShenRef} r="2.2" fill="rgba(244,140,170,.9)" />
          <circle ref={endShangRef} r="2.2" fill="rgba(150,200,250,.9)" />
          <circle ref={riftRef} r="2.4" fill="rgba(244,236,210,.85)" />
        </g>
      </svg>

      {/* 远山轮廓 */}
      <svg className="cs-mtns" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path fill="#101a3a" opacity=".9" d="M0,170 C130,134 250,162 380,128 C520,92 650,146 790,118 C930,90 1050,142 1180,114 C1300,90 1390,128 1440,112 L1440,320 0,320 Z" />
        <path fill="#0c1430" d="M0,232 C170,194 330,228 470,190 C610,154 750,208 890,174 C1030,142 1170,194 1310,164 C1380,150 1415,172 1440,162 L1440,320 0,320 Z" />
      </svg>

      {/* 北辰（北极星 · 静观） */}
      <motion.div ref={beiRef} className="cs-bei" variants={beiVariants} initial="hidden" animate={loaded ? 'visible' : 'hidden'}>
        <span ref={bringRef} className="cs-bring" />
        <span className="cs-bcore" />
        <span className="cs-blabel">北辰 · 不动</span>
      </motion.div>

      {/* 参星（西天 · 玫霞） */}
      <div ref={shenRef} className="cs-star cs-shen">
        <div className="cs-anchor">
          <span ref={haloShenRef} className="cs-halo" />
          <span ref={flareShenHRef} className="cs-flare" />
          <span ref={flareShenVRef} className="cs-flare cs-vert" />
          <span className="cs-core" />
          <span className="cs-slabel">参星 · 西天</span>
        </div>
      </div>

      {/* 商星（东海 · 靛海） */}
      <div ref={shangRef} className="cs-star cs-shang">
        <div className="cs-anchor">
          <span ref={haloShangRef} className="cs-halo" />
          <span ref={flareShangHRef} className="cs-flare" />
          <span ref={flareShangVRef} className="cs-flare cs-vert" />
          <span className="cs-core" />
          <span className="cs-slabel">商星 · 东海</span>
        </div>
      </div>

      {/* 标题块（印章 + 诗句 + 参商大字） */}
      <motion.aside className="cs-title-block" variants={fadeSlowVariants} initial="hidden" animate={loaded ? 'visible' : 'hidden'}>
        <div className="cs-seal cs-v">参商</div>
        <div className="cs-poem cs-v">
          <span>人生不相见</span>
          <span>动如参与商</span>
          <span className="cs-src">杜甫 · 赠卫八处士</span>
        </div>
        <h1 className="cs-title cs-v">
          <span className="cs-ziwrap">
            <span ref={ziShenRef} className="cs-zi cs-shen">参</span>
          </span>
          <span className="cs-ziwrap cs-shangw">
            <span ref={ziShangRef} className="cs-zi cs-shang">商</span>
          </span>
        </h1>
      </motion.aside>

      {/* 侧栏（短语 + 境名） */}
      <motion.aside className="cs-side-note" variants={fadeSlowVariants} initial="hidden" animate={loaded ? 'visible' : 'hidden'}>
        <div className="cs-phrase cs-v">
          <span>一颗星的升起</span>
          <span>是另一颗星的坠落</span>
        </div>
        <div ref={jingRef} className="cs-jing cs-v">距离 · 一境</div>
      </motion.aside>

      {/* 元信息（岁次） */}
      <motion.div ref={metaRef} className="cs-meta cs-v" variants={fadeVariants} initial="hidden" animate={loaded ? 'visible' : 'hidden'}>
        岁次丙午 · 星夜泼彩 · 北辰不动
      </motion.div>

      {/* 操作提示 */}
      <motion.div ref={hintRef} className="cs-hint" variants={fadeVariants} initial="hidden" animate={loaded ? 'visible' : 'hidden'}>
        静候 · 云汉初凝<br/>
        滚轮 · 拨转昼夜<br/>
        拖拽 · 转动星河<br/>
        移鼠 · 拨亮星汉<br/>
        轻点 · 泼墨溅彩
      </motion.div>

      {/* 金边相框（四角装饰） */}
      <motion.div className="cs-frame" variants={fadeVariants} initial="hidden" animate={loaded ? 'visible' : 'hidden'}>
        <svg ref={(el) => { cornersRef.current[0] = el; }} className="cs-corner cs-tl" viewBox="0 0 44 44">
          <path d="M2 42 V2 H42 M33 11 H11 V33 H25 V19 H18" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <svg ref={(el) => { cornersRef.current[1] = el; }} className="cs-corner cs-tr" viewBox="0 0 44 44">
          <path d="M2 42 V2 H42 M33 11 H11 V33 H25 V19 H18" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <svg ref={(el) => { cornersRef.current[2] = el; }} className="cs-corner cs-br" viewBox="0 0 44 44">
          <path d="M2 42 V2 H42 M33 11 H11 V33 H25 V19 H18" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <svg ref={(el) => { cornersRef.current[3] = el; }} className="cs-corner cs-bl" viewBox="0 0 44 44">
          <path d="M2 42 V2 H42 M33 11 H11 V33 H25 V19 H18" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </motion.div>
    </section>
  );
}