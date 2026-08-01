import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './FlowingYearsScene.css';

/**
 * 流年拾光 · 视觉信物层
 * 严格复刻自视觉示意：罗盘量一日（左边界半圆）+ 电路纹理 + 萤火拾光（点击交互）
 *
 * 仅在 r1 主题下渲染，作为 fixed 背景层，pointer-events: none
 * 不影响原有布局与交互；点击空白处会"拾起一点光"
 */

const NS = 'http://www.w3.org/2000/svg';

// 十二地支（按时辰顺序）
const SC = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 罗盘外圈顺序（从卯开始顺时针）
const ORDER = ['卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑', '寅'];
const CARD = ['卯', '午', '酉', '子'];
// 二十四山
const MOUNTAINS = '壬子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥'.split('');
// 八卦爻纹 [角度, [三爻 0阴 1阳]]
const BAGUA: [number, number[]][] = [
  [-90, [1, 0, 0]], [-45, [0, 1, 1]], [0, [1, 0, 1]], [45, [0, 0, 0]],
  [90, [1, 1, 0]], [135, [1, 1, 1]], [180, [0, 1, 0]], [225, [0, 0, 1]],
];

const rad = (a: number) => (a * Math.PI) / 180;

// SVG 元素创建辅助
function mk(n: string, at: Record<string, string>, pa?: SVGElement): SVGElement {
  const e = document.createElementNS(NS, n);
  for (const k in at) e.setAttribute(k, at[k]);
  if (pa) pa.appendChild(e);
  return e;
}

// 八卦爻纹路径
function trigramPath(CX: number, CY: number, th: number, bits: number[], rBase: number, gap: number, len: number): string {
  const a = rad(th), rx = Math.cos(a), ry = Math.sin(a), tx = -Math.sin(a), ty = Math.cos(a);
  let d = '';
  bits.forEach((b, i) => {
    const r = rBase + i * gap, cx = CX + rx * r, cy = CY + ry * r, half = len / 2, g = 2.6;
    if (b) {
      d += `M${cx - tx * half} ${cy - ty * half}L${cx + tx * half} ${cy + ty * half}`;
    } else {
      d += `M${cx - tx * half} ${cy - ty * half}L${cx - tx * g} ${cy - ty * g}M${cx + tx * g} ${cy + ty * g}L${cx + tx * half} ${cy + ty * half}`;
    }
  });
  return d;
}

// ═══════════════════════════════════════════════════
// 主组件 · 背景层（fixed 全屏，不跟随滚动）
// ═══════════════════════════════════════════════════
export default function FlowingYearsScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden style={{ pointerEvents: 'none' }}>


      {/* 时序竖柱 · 电路纹理（背景层，不跟随滚动） */}
      <CircuitTraces />
      {/* 萤火 + 点击粒子（canvas） */}
      <FireflyCanvas />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 大罗盘 · 量一日 ── 左边界半圆
// ═══════════════════════════════════════════════════
export function FlowingYearsCompass() {
  return (
    <>
      <CompassGlow />
      <HalfClipCompass />
    </>
  );
}

// ═══════════════════════════════════════════════════
// 罗盘发光层
// ═══════════════════════════════════════════════════
function CompassGlow() {
  return (
    <div
      className="fy-glow-pulse"
      style={{
        position: 'absolute',
        left: 0,
        top: '60vh',
        transform: 'translateY(-50%)',
        zIndex: 3,
        pointerEvents: 'none',
        width: 'calc(min(44vh,38vw) * 1.35)',
        height: 'calc(min(44vh,38vw) * 2.3)',
        background: 'radial-gradient(46% 46% at 0% 50%, rgba(232,197,107,.14), rgba(127,191,154,.05) 55%, transparent 76%)',
      }}
    />
  );
}

// ═══════════════════════════════════════════════════
// 罗盘 · 量一日 ── 左边界半圆（完整复刻）
// ═══════════════════════════════════════════════════
function HalfClipCompass() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const needleRef = useRef<SVGGElement | null>(null);
  const beadRef = useRef<SVGCircleElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [grown, setGrown] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  // IntersectionObserver：每次进入视口重播动画
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          setGrown(false);
          requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
        } else {
          setHasEntered(false);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasEntered) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const CX = 0, CY = 520;

    const P = (th: number, r: number): [number, number] => {
      const a = rad(th);
      return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    };

    const wedgePath = (th0: number, th1: number, r0: number, r1: number) => {
      const [a, b] = P(th0, r0), [c, d] = P(th0, r1), [e, f] = P(th1, r1), [g, h] = P(th1, r0);
      return `M${a} ${b}L${c} ${d}A${r1} ${r1} 0 0 1 ${e} ${f}L${g} ${h}A${r0} ${r0} 0 0 0 ${a} ${b}Z`;
    };

    const defs = mk('defs', {}, svg);

    const grad = mk('linearGradient', { id: 'fyNdlG', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    mk('stop', { offset: '0%', 'stop-color': '#ffd97e' }, grad);
    mk('stop', { offset: '100%', 'stop-color': '#b98f3e' }, grad);

    const sheen = mk('radialGradient', { id: 'fySheenG', cx: '0.62', cy: '0.35', r: '0.8' }, defs);
    mk('stop', { offset: '0%', 'stop-color': 'rgba(255,226,152,.10)' }, sheen);
    mk('stop', { offset: '55%', 'stop-color': 'rgba(255,226,152,.035)' }, sheen);
    mk('stop', { offset: '100%', 'stop-color': 'rgba(255,226,152,0)' }, sheen);

    const well = mk('radialGradient', { id: 'fyWellG', cx: '0.5', cy: '0.5', r: '0.5' }, defs);
    mk('stop', { offset: '0%', 'stop-color': 'rgba(255,224,150,.13)' }, well);
    mk('stop', { offset: '70%', 'stop-color': 'rgba(255,224,150,.04)' }, well);
    mk('stop', { offset: '100%', 'stop-color': 'rgba(255,224,150,0)' }, well);

    mk('path', {
      id: 'fyCtp',
      d: (() => { const [a, b] = P(-80, 512), [c, d] = P(80, 512); return `M${a} ${b} A512 512 0 0 1 ${c} ${d}`; })(),
      fill: 'none',
    }, defs);

    const circle = (r: number, cls: string, delay: number) => {
      const c = mk('circle', { cx: String(CX), cy: String(CY), r: String(r), class: 'fy-arc ' + cls, pathLength: '1' }, svg);
      (c as SVGElement).style.transitionDelay = delay + 's';
      return c;
    };

    circle(500, 'fy-strong', 0.1);
    circle(470, '', 0.3);
    circle(380, '', 0.45);
    circle(340, '', 0.6);
    circle(300, '', 0.75);
    circle(220, '', 0.9);
    circle(190, 'fy-faint', 1.05);

    const rw1 = mk('circle', { cx: String(CX), cy: String(CY), r: '430', class: 'fy-ringw fy-fadein' }, svg);
    rw1.style.transitionDelay = '1.1s';
    const rw2 = mk('circle', { cx: String(CX), cy: String(CY), r: '262', class: 'fy-ringw fy-fadein' }, svg);
    rw2.style.transitionDelay = '1.0s';

    const wellCircle = mk('circle', { cx: String(CX), cy: String(CY), r: '52', fill: 'url(#fyWellG)', class: 'fy-fadein' }, svg);
    wellCircle.style.transitionDelay = '0.5s';
    circle(26, 'fy-pool', 0.2);
    circle(18, 'fy-faint', 0.32);
    circle(48, 'fy-faint', 0.55);
    circle(104, 'fy-faint', 0.65);
    circle(140, 'fy-faint', 1.2);

    for (let j = 0; j < 8; j++) {
      const [x, y] = P(22.5 + j * 45, 32);
      const dot = mk('circle', { cx: String(x), cy: String(y), r: '1.1', class: 'fy-dot' }, svg);
      dot.style.transitionDelay = '0.9s';
    }

    let escD = '';
    for (let i = 0; i < 60; i++) {
      const t = i * 6;
      const [x1, y1] = P(t, 36), [x2, y2] = P(t, i % 5 === 0 ? 45 : 42);
      escD += `M${x1} ${y1}L${x2} ${y2}`;
    }
    const esc = mk('path', { d: escD, class: 'fy-esc fy-fadein' }, svg);
    esc.style.transitionDelay = '0.7s';

    for (let j = 0; j < 12; j++) {
      const [x, y] = P(15 + j * 30, 58);
      const dot = mk('circle', { cx: String(x), cy: String(y), r: '1', class: 'fy-dot' }, svg);
      dot.style.transitionDelay = '1.0s';
    }

    [['元', -90], ['亨', 0], ['利', 90], ['贞', 180]].forEach(([s, th], i) => {
      const [x, y] = P(th as number, 74);
      const tx = mk('text', { x: String(x), y: String(y + 5), 'text-anchor': 'middle', class: 'fy-char fy-yuan' }, svg) as SVGTextElement;
      tx.textContent = s as string;
      tx.style.transitionDelay = (1.1 + i * 0.08) + 's';
    });

    let in24 = '';
    for (let i = 0; i < 24; i++) {
      const t = i * 15;
      const [x1, y1] = P(t, 86), [x2, y2] = P(t, i % 2 === 0 ? 98 : 94);
      in24 += `M${x1} ${y1}L${x2} ${y2}`;
    }
    const in24p = mk('path', { d: in24, class: 'fy-esc fy-fadein' }, svg);
    in24p.style.transitionDelay = '0.95s';

    let irD = '';
    for (let i = 0; i < 12; i++) {
      const t = i * 30;
      const [x1, y1] = P(t, 108), [x2, y2] = P(t, 130);
      irD += `M${x1} ${y1}L${x2} ${y2}`;
    }
    const ir = mk('path', { d: irD, class: 'fy-iray fy-fadein' }, svg);
    ir.style.transitionDelay = '0.85s';

    for (let j = 0; j < 8; j++) {
      const [x, y] = P(22.5 + j * 45, 114);
      const dot = mk('circle', { cx: String(x), cy: String(y), r: '1.2', class: 'fy-dot' }, svg);
      dot.style.transitionDelay = '1.15s';
    }

    const rw3 = mk('circle', { cx: String(CX), cy: String(CY), r: '122', class: 'fy-ringw fy-fadein' }, svg);
    rw3.style.transitionDelay = '1.0s';
    const rd1 = mk('circle', { cx: String(CX), cy: String(CY), r: '131', class: 'fy-ringd fy-fadein' }, svg);
    rd1.style.transitionDelay = '1.1s';

    ['木', '火', '土', '金', '水'].forEach((s, i) => {
      const [x, y] = P(-90 + i * 72, 175);
      const tx = mk('text', { x: String(x), y: String(y + 4), 'text-anchor': 'middle', class: 'fy-char fy-wuxing' }, svg) as SVGTextElement;
      tx.textContent = s;
      tx.style.transitionDelay = (1.25 + i * 0.06) + 's';
    });

    let f48 = '';
    for (let i = 0; i < 48; i++) {
      const t = i * 7.5;
      const [x1, y1] = P(t, 196), [x2, y2] = P(t, i % 4 === 0 ? 214 : 208);
      f48 += `M${x1} ${y1}L${x2} ${y2}`;
    }
    const f48p = mk('path', { d: f48, class: 'fy-esc fy-fadein' }, svg);
    f48p.style.transitionDelay = '1.1s';

    const gv = mk('path', { d: `M${CX} ${CY - 500} L${CX} ${CY + 500}`, class: 'fy-guide fy-fadein' }, svg);
    gv.style.transitionDelay = '1.3s';
    const gh = mk('path', { d: `M${CX} ${CY} L${CX + 500} ${CY}`, class: 'fy-guide fy-fadein' }, svg);
    gh.style.transitionDelay = '1.3s';

    let spD = '';
    for (let i = 0; i < 24; i++) {
      const t = i * 15;
      const [x1, y1] = P(t, 142), [x2, y2] = P(t, 495);
      spD += `M${x1} ${y1}L${x2} ${y2}`;
    }
    const sp = mk('path', { d: spD, class: 'fy-spoke fy-fadein' }, svg);
    sp.style.transitionDelay = '0.85s';

    let hD = '';
    for (let i = 0; i < 360; i++) {
      const t = i;
      const wob = ((t * 7919) % 13) / 13;
      const [x1, y1] = P(t, 264), [x2, y2] = P(t, 296 - wob * 7);
      hD += `M${x1} ${y1}L${x2} ${y2}`;
    }
    const hatch = mk('path', { d: hD, class: 'fy-hatch fy-fadein' }, svg);
    hatch.style.transitionDelay = '1.15s';

    BAGUA.forEach(([th, bits], i) => {
      const t = mk('path', { d: trigramPath(CX, CY, th, bits, 230, 11, 18), class: 'fy-trig fy-fadein' }, svg);
      t.style.transitionDelay = (1.0 + i * 0.05) + 's';
    });

    for (let j = 0; j < 8; j++) {
      const [x, y] = P(22.5 + j * 45, 241);
      const dot = mk('circle', { cx: String(x), cy: String(y), r: '1', class: 'fy-dot' }, svg);
      dot.style.transitionDelay = '1.35s';
    }

    let mwD = '';
    for (let j = 0; j < 24; j++) {
      if (j % 2 === 0) mwD += wedgePath(180 + j * 15 - 7.5, 180 + j * 15 + 7.5, 302, 338);
    }
    const mwp = mk('path', { d: mwD, fill: 'rgba(232,197,107,.05)', stroke: 'none', class: 'fy-fadein' }, svg);
    mwp.style.transitionDelay = '1.2s';

    MOUNTAINS.forEach((s, j) => {
      const [x, y] = P(180 + j * 15, 320);
      const tx = mk('text', { x: String(x), y: String(y + 5), 'text-anchor': 'middle', class: 'fy-char fy-mtn' }, svg) as SVGTextElement;
      tx.textContent = s;
      tx.style.transitionDelay = (1.3 + j * 0.03) + 's';
    });

    for (let j = 0; j < 24; j++) {
      const [x, y] = P(180 + j * 15 + 7.5, 320);
      const dot = mk('circle', { cx: String(x), cy: String(y), r: '.9', class: 'fy-dot' }, svg);
      dot.style.transitionDelay = '1.5s';
    }

    for (let i = 0; i < 24; i++) {
      const t = i * 15;
      const [x1, y1] = P(t, 344), [x2, y2] = P(t, 360);
      const tk = mk('path', { d: `M${x1} ${y1}L${x2} ${y2}`, class: 'fy-tick fy-tick-hour' }, svg);
      tk.style.transitionDelay = (1.0 + t / 360 * 0.8) + 's';
    }

    for (let j = 0; j < 28; j++) {
      const [x, y] = P(j * (360 / 28), 366);
      const dot = mk('circle', { cx: String(x), cy: String(y), r: '1', class: 'fy-dot' }, svg);
      dot.style.transitionDelay = (1.4 + j * 0.015) + 's';
    }

    let f28 = '';
    for (let i = 0; i < 180; i++) {
      const t = i * 2;
      const [x1, y1] = P(t, 369), [x2, y2] = P(t, 377);
      f28 += `M${x1} ${y1}L${x2} ${y2}`;
    }
    const f28p = mk('path', { d: f28, class: 'fy-fine2 fy-fadein' }, svg);
    f28p.style.transitionDelay = '1.3s';

    let cwD = '';
    [-75, 15, 105, 195].forEach(th => { cwD += wedgePath(th - 15, th + 15, 382, 428); });
    const cwp = mk('path', { d: cwD, fill: 'rgba(255,217,126,.045)', stroke: 'none', class: 'fy-fadein' }, svg);
    cwp.style.transitionDelay = '1.3s';

    ORDER.forEach((s, j) => {
      const th = -90 + j * 30 + 15, [x, y] = P(th, 408);
      const tx = mk('text', {
        x: String(x), y: String(y + 8), 'text-anchor': 'middle',
        'font-size': '24',
        class: 'fy-char' + (CARD.includes(s) ? ' fy-char-card' : ''),
      }, svg) as SVGTextElement;
      tx.textContent = s;
      tx.style.transitionDelay = (1.5 + j * 0.06) + 's';
    });
    for (let j = 0; j < 12; j++) {
      const [x, y] = P(-90 + j * 30, 408);
      const dot = mk('circle', { cx: String(x), cy: String(y), r: '1', class: 'fy-dot' }, svg);
      dot.style.transitionDelay = '1.6s';
    }

    for (let i = 0; i < 24; i++) {
      const t = i * 15;
      const [x, y] = P(t, 444);
      const dot = mk('circle', { cx: String(x), cy: String(y), r: '1.4', class: 'fy-dot' }, svg);
      dot.style.transitionDelay = (1.5 + t / 360 * 0.7) + 's';
    }

    [['东', -90], ['南', 0], ['西', 90], ['北', 180]].forEach(([s, th]) => {
      const [x, y] = P(th as number, 466);
      const tx = mk('text', { x: String(x), y: String(y + 4), 'text-anchor': 'middle', class: 'fy-char fy-dir' }, svg) as SVGTextElement;
      tx.textContent = s as string;
      tx.style.transitionDelay = '1.8s';
    });

    let micro = '';
    for (let i = 0; i < 480; i++) {
      const t = i * 0.75;
      const [x1, y1] = P(t, 471), [x2, y2] = P(t, 477);
      micro += `M${x1} ${y1}L${x2} ${y2}`;
    }
    const microp = mk('path', { d: micro, class: 'fy-micro fy-fadein' }, svg);
    microp.style.transitionDelay = '1.2s';

    for (let i = 0; i < 240; i++) {
      const t = i * 1.5;
      const major = i % 20 === 0, mid = !major && i % 10 === 0;
      const r0 = major ? 478 : (mid ? 484 : 490);
      const [x1, y1] = P(t, r0), [x2, y2] = P(t, 500);
      const tk = mk('path', {
        d: `M${x1} ${y1}L${x2} ${y2}`,
        class: 'fy-tick' + (major ? ' fy-tick-major' : mid ? ' fy-tick-mid' : ''),
      }, svg);
      tk.style.transitionDelay = (0.8 + t / 360 * 1.3) + 's';
    }

    [-90, 0, 90, 180].forEach(th => {
      const [x, y] = P(th, 505), s2 = th === -90 ? 5.5 : 4;
      const diamond = mk('path', {
        d: `M${x} ${y - s2} L${x + s2} ${y} L${x} ${y + s2} L${x - s2} ${y} Z`,
        class: 'fy-dot',
      }, svg);
      diamond.style.transitionDelay = '1.9s';
    });

    const txt = mk('text', { class: 'fy-curvetext fy-fadein' }, svg);
    const tpath = mk('textPath', { href: '#fyCtp', startOffset: '50%' }, txt) as SVGTextPathElement;
    tpath.setAttribute('text-anchor', 'middle');
    tpath.textContent = '与 时 偕 行 · 拾 光 而 往';
    txt.style.transitionDelay = '2.3s';

    const sheenCover = mk('circle', { cx: String(CX), cy: String(CY), r: '500', fill: 'url(#fySheenG)', class: 'fy-fadein' }, svg);
    sheenCover.style.transitionDelay = '2.0s';

    const spin = mk('g', { class: 'fy-spin' }, svg);
    mk('circle', { cx: String(CX), cy: String(CY), r: '160', class: 'fy-ring-dash' }, spin);

    const sway = mk('g', { class: 'fy-needle-sway' }, svg);
    const nd = mk('g', { class: 'fy-needle', 'data-needle': '' }, sway) as SVGGElement;
    mk('path', { d: `M${CX} ${CY - 430} L${CX + 6} ${CY - 20} L${CX} ${CY} L${CX - 6} ${CY - 20} Z`, fill: 'url(#fyNdlG)' }, nd);
    mk('path', { d: `M${CX} ${CY} L${CX} ${CY - 445}`, class: 'fy-needle-hair' }, nd);
    mk('circle', { cx: String(CX), cy: String(CY - 445), r: '3', class: 'fy-needle-tip' }, nd);
    nd.style.opacity = '0';
    nd.style.transition = 'opacity .8s ease 2.4s, transform 1s linear';
    needleRef.current = nd;

    const bead = mk('circle', { cx: '0', cy: '0', r: '2.8', class: 'fy-sec-bead' }, svg) as SVGCircleElement;
    bead.style.opacity = '0';
    bead.style.transition = 'opacity .8s ease 2.8s';
    beadRef.current = bead;

    mk('circle', { cx: String(CX), cy: String(CY), r: '10', class: 'fy-pivot-ring' }, svg);
    mk('circle', { cx: String(CX), cy: String(CY), r: '4', class: 'fy-pivot' }, svg);

    const t = setTimeout(() => setGrown(true), 100);
    return () => { clearTimeout(t); };
  }, [hasEntered]);

  useEffect(() => {
    if (!grown) return;
    const burstT = setTimeout(() => {
      const svg = svgRef.current;
      if (svg) {
        const rect = svg.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent('fy-compass-burst', {
          detail: { x: rect.left, y: rect.top + rect.height / 2 }
        }));
      }
    }, 3200);
    return () => clearTimeout(burstT);
  }, [grown]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const d = new Date();
      const sinceMao = (d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 - 300 + 1440) % 1440;
      const deg = (sinceMao / 1440) * 360;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${deg}deg)`;
      if (beadRef.current) {
        const s = d.getSeconds() + d.getMilliseconds() / 1000;
        const th = (-90 + (s / 60) * 360) * Math.PI / 180;
        beadRef.current.setAttribute('cx', String(485 * Math.cos(th)));
        beadRef.current.setAttribute('cy', String(520 + 485 * Math.sin(th)));
      }
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute',
        left: 0,
        top: '60vh',
        width: 'min(44vh,38vw)',
        height: 'calc(min(44vh,38vw) * 2)',
        transform: 'translateY(-50%)',
        zIndex: 3,
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 520 1040"
        className={grown ? 'fy-grown' : ''}
        style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
        role="img"
        aria-label="罗盘量一日，圆心贴左边界，只见其半，指针随真实时间转动"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 时序竖柱 · 电路纹理（斜角错位 / 刻度细密 / 信号沿路径流动）
// ═══════════════════════════════════════════════════
export function CircuitTraces() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [grown, setGrown] = useState(false);
  const tracesRef = useRef<{ el: SVGPathElement; len: number }[]>([]);

  useEffect(() => {
    const svg = svgRef.current;
    const fxcv = fxCanvasRef.current;
    if (!svg || !fxcv) return;

    const cx2 = fxcv.getContext('2d');
    if (!cx2) return;

    let W = 0, H = 0;
    let raf = 0;
    const signals: { idx: number; t: number; sp: number; hue: string }[] = [];
    const JOG_ANG = [30, 45, 60];

    const verticalSegs = (verts: [number, number][]) => {
      const segs: { x: number; y0: number; y1: number }[] = [];
      for (let i = 0; i < verts.length - 1; i++) {
        if (Math.abs(verts[i][0] - verts[i + 1][0]) < 0.01) {
          segs.push({ x: verts[i][0], y0: verts[i][1], y1: verts[i + 1][1] });
        }
      }
      return segs;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      fxcv.width = W * dpr;
      fxcv.height = H * dpr;
      fxcv.style.width = W + 'px';
      fxcv.style.height = H + 'px';
      cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const build = () => {
      svg.innerHTML = '';
      tracesRef.current = [];
      signals.length = 0;
      const Wc = window.innerWidth, Hc = window.innerHeight;
      svg.setAttribute('viewBox', `0 0 ${Wc} ${Hc}`);
      svg.setAttribute('width', String(Wc));
      svg.setAttribute('height', String(Hc));

      // 电路从罗盘右侧边缘起始
      const compassR = Math.min(window.innerHeight * 0.44, window.innerWidth * 0.38);
      const x0 = compassR + 30;
      const xEnd = Wc - Math.max(200, Wc * 0.15);
      const maxDev = 8;
      const g = mk('g', {}, svg);

      const bases: number[] = [];
      let bx = x0 + Math.random() * 14;
      while (bx < xEnd) { bases.push(bx); bx += 20 + Math.random() * 30; }

      let delay = 0.15;
      bases.forEach((base, ci) => {
        const r = Math.random();
        let yTop: number, yBot: number, anchored: string;
        if (r < 0.4) { yTop = -4; yBot = Hc * (0.4 + Math.random() * 0.42); anchored = 'top'; }
        else if (r < 0.8) { yBot = Hc + 4; yTop = Hc * (0.18 + Math.random() * 0.42); anchored = 'bottom'; }
        else { yTop = -4; yBot = Hc + 4; anchored = 'full'; }
        const totalH = yBot - yTop;
        const style = Math.random();
        const jade = style < 0.22, main = !jade && style < 0.52, dashed = !main && !jade && Math.random() < 0.15;
        const ghost = main && Math.random() < 0.22;

        let cxp = base + (Math.random() * 2 - 1) * maxDev * 0.4, cyp = yTop;
        const verts: [number, number][] = [[cxp, cyp]];
        const nJogs = 2 + ((Math.random() * 3) | 0);
        const jogYs: number[] = [];
        for (let k = 0; k < nJogs; k++) jogYs.push(yTop + totalH * (0.12 + 0.76 * Math.random()));
        jogYs.sort((a, b) => a - b);
        for (let k = 0; k <= nJogs; k++) {
          const targetY = (k < nJogs) ? jogYs[k] : yBot;
          if (targetY - cyp > 2) { verts.push([cxp, targetY]); cyp = targetY; }
          if (k < nJogs) {
            const ang = JOG_ANG[(Math.random() * JOG_ANG.length) | 0] * Math.PI / 180;
            let nx = base + (Math.random() * 2 - 1) * maxDev;
            if (Math.abs(nx - cxp) < 4) nx = base + ((nx >= cxp) ? 1 : -1) * (5 + Math.random() * 6);
            nx = Math.max(base - maxDev, Math.min(base + maxDev, nx));
            const dxx = nx - cxp, dyv = Math.abs(dxx) / Math.tan(ang);
            if (cyp + dyv <= yBot - 2) { verts.push([nx, cyp + dyv]); cxp = nx; cyp = cyp + dyv; }
          }
        }
        if (cyp < yBot - 2) verts.push([cxp, yBot]);

        const buildD = (off: number) => verts.map((v, i) => (i === 0 ? 'M' : 'L') + (v[0] + off).toFixed(1) + ' ' + v[1].toFixed(1)).join('');
        let p: SVGPathElement;
        if (dashed) {
          p = mk('path', { d: buildD(0), class: 'fy-ctrace-d' }, g) as SVGPathElement;
        } else {
          p = mk('path', { d: buildD(0), class: 'fy-ctrace' + (main ? ' fy-cm' : '') + (jade ? ' fy-cj' : ''), pathLength: '1' }, g) as SVGPathElement;
        }
        p.style.transitionDelay = delay + 's';
        if (!dashed) tracesRef.current.push({ el: p, len: 0 });
        if (ghost) {
          const gp = mk('path', { d: buildD(3), class: 'fy-ctrace fy-cg', pathLength: '1' }, g) as SVGPathElement;
          gp.style.transitionDelay = (delay + 0.12) + 's';
          tracesRef.current.push({ el: gp, len: 0 });
        }

        const ends: [number, number][] = [];
        if (anchored === 'top') ends.push(verts[verts.length - 1]);
        else if (anchored === 'bottom') ends.push(verts[0]);
        ends.forEach(([px, py]) => {
          const pad = mk('circle', { cx: String(px), cy: String(py), r: String(main ? 3 : 2.4), class: 'fy-cpad' + (jade ? ' fy-cj' : '') }, g);
          const dot = mk('circle', { cx: String(px), cy: String(py), r: '1', class: 'fy-cpaddot' }, g);
          pad.style.transitionDelay = dot.style.transitionDelay = (delay + 0.9) + 's';
          if (Math.random() < 0.4) {
            const tp = mk('circle', { cx: String(px), cy: String(py), r: '5.5', class: 'fy-ctp' }, g);
            tp.style.transitionDelay = (delay + 1.1) + 's';
          }
        });

        for (let vi = 1; vi < verts.length - 1; vi++) {
          if (Math.random() < 0.5) {
            const nd = mk('circle', { cx: String(verts[vi][0]), cy: String(verts[vi][1]), r: '1.5', class: 'fy-cpaddot' }, g);
            nd.style.transitionDelay = (delay + 0.5 + vi * 0.04) + 's';
          }
        }

        if (Math.random() < 0.58) {
          verticalSegs(verts).forEach(s => {
            if (s.y1 - s.y0 < 46) return;
            const side = (s.x > base) ? -1 : ((s.x < base) ? 1 : (ci % 2 === 0 ? 1 : -1));
            let i = 0;
            for (let y = s.y0 + 14; y < s.y1 - 10; y += 24, i++) {
              const major = i % 3 === 0, len = major ? 6 : 3;
              const t = mk('path', { d: `M${s.x.toFixed(1)} ${y.toFixed(1)}L${(s.x + len * side).toFixed(1)} ${y.toFixed(1)}`, class: 'fy-ctick' + (jade ? ' fy-cj' : '') }, g);
              t.style.transitionDelay = (delay + 0.3 + i * 0.018) + 's';
            }
          });
        }

        const longSegs = verticalSegs(verts).filter(s => (s.y1 - s.y0) > 56);
        if (Math.random() < 0.28 && longSegs.length) {
          const s = longSegs[(Math.random() * longSegs.length) | 0];
          const compY = s.y0 + 20 + Math.random() * (s.y1 - s.y0 - 40);
          const comp = mk('rect', { x: (s.x - 4).toFixed(1), y: (compY - 7).toFixed(1), width: '8', height: '14', class: 'fy-cchip' }, g);
          comp.style.transitionDelay = (delay + 1.0) + 's';
        }
        if (Math.random() < 0.32 && longSegs.length) {
          const s = longSegs[(Math.random() * longSegs.length) | 0];
          const stubY = s.y0 + 14 + Math.random() * (s.y1 - s.y0 - 28);
          const sdir = (s.x > base) ? -1 : 1, slen = 6 + Math.random() * 4;
          const ex = s.x + sdir * slen;
          const sp = mk('path', { d: `M${s.x.toFixed(1)} ${stubY.toFixed(1)}L${ex.toFixed(1)} ${stubY.toFixed(1)}`, class: 'fy-ctrace' + (jade ? ' fy-cj' : ''), pathLength: '1' }, g) as SVGPathElement;
          sp.style.transitionDelay = (delay + 0.7) + 's';
          tracesRef.current.push({ el: sp, len: 0 });
          const sd = mk('circle', { cx: String(ex), cy: String(stubY), r: '1.8', class: 'fy-cpad' + (jade ? ' fy-cj' : '') }, g);
          sd.style.transitionDelay = (delay + 1.2) + 's';
        }
        delay += 0.045;
      });

      for (let i = 0; i < 8; i++) {
        const v = mk('circle', { cx: String(x0 + Math.random() * (xEnd - x0)), cy: String(40 + Math.random() * (Hc - 80)), r: '2', class: 'fy-cvia' }, g);
        v.style.transitionDelay = (1.6 + i * 0.05) + 's';
      }

      requestAnimationFrame(() => { tracesRef.current.forEach(t => { t.len = t.el.getTotalLength(); }); });

      for (let i = 0; i < 14; i++) {
        signals.push({
          idx: (Math.random() * tracesRef.current.length) | 0,
          t: Math.random(),
          sp: 0.0015 + Math.random() * 0.004,
          hue: Math.random() < 0.55 ? '255,217,126' : '160,230,180',
        });
      }

      setGrown(false);
      setTimeout(() => setGrown(true), 400);
    };

    build();

    const animate = () => {
      cx2.clearRect(0, 0, W, H);
      cx2.globalCompositeOperation = 'lighter';
      for (const s of signals) {
        s.t += s.sp;
        if (s.t > 1) { s.t = 0; s.idx = (Math.random() * tracesRef.current.length) | 0; }
        const tr = tracesRef.current[s.idx];
        if (!tr || !tr.len) continue;
        const pt = tr.el.getPointAtLength(s.t * tr.len);
        const g2 = cx2.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 9);
        g2.addColorStop(0, `rgba(${s.hue},.85)`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        cx2.fillStyle = g2;
        cx2.beginPath();
        cx2.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
        cx2.fill();
        cx2.fillStyle = 'rgba(255,246,210,.95)';
        cx2.beginPath();
        cx2.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
        cx2.fill();
      }
      cx2.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    let rsz: ReturnType<typeof setTimeout>;
    const onResize = () => { resize(); clearTimeout(rsz); rsz = setTimeout(build, 250); };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      clearTimeout(rsz);
    };
  }, []);

  return (
    <>
      <svg
        ref={svgRef}
        className={grown ? 'fy-circuit-grown' : ''}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
      />
      <canvas
        ref={fxCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════
// 萤火 · 拾光 ── Canvas 粒子（效果图逻辑：正弦徘徊 + 鼠标吸引）
// ═══════════════════════════════════════════════════
function FireflyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: null as number | null, y: null as number | null };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // ── 背景星点（效果图） ──
    const stars: { x: number; y: number; r: number; a: number; ph: number; c: string }[] = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H * 0.55,
        r: 0.4 + Math.random() * 0.8, a: 0.08 + Math.random() * 0.3,
        ph: Math.random() * Math.PI * 2,
        c: Math.random() < 0.7 ? '255,230,170' : '180,230,200',
      });
    }

    // ── 萤火（效果图运动逻辑：正弦徘徊 + 鼠标吸引） ──
    const GOLD = '255,217,126';
    const JADE = '160,230,180';
    const FLIES = 35;

    interface Fly {
      x: number; y: number;
      a: number; sp: number; r: number; ph: number;
      hue: string; excite: number;
      z: number; // 深度 0-1，影响大小/速度/亮度
    }

    const flies: Fly[] = [];
    for (let i = 0; i < FLIES; i++) {
      const z = 0.3 + Math.random() * 0.7;
      flies.push({
        x: Math.random() * W,
        y: H * 0.2 + Math.random() * H * 0.75,
        a: Math.random() * Math.PI * 2,
        sp: (0.15 + Math.random() * 0.5) * (0.6 + z * 0.6),
        r: (1.2 + Math.random() * 2.0) * (0.7 + z * 0.6),
        ph: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.6 ? GOLD : JADE,
        excite: 0,
        z,
      });
    }

    // ── 爆裂粒子 + 鼠标光痕 ──
    const sparks: { x: number; y: number; vx: number; vy: number; r: number; life: number; decay: number; hue: string }[] = [];
    const ripples: { x: number; y: number; r: number; a: number }[] = [];
    const mouseTrail: { x: number; y: number; life: number; maxLife: number }[] = [];

    const burst = (x: number, y: number, power: number) => {
      const n = Math.round(5 + power * 5.5);
      for (let i = 0; i < n; i++) {
        const biased = Math.random() < 0.75;
        const angle = biased ? (Math.random() - 0.5) * Math.PI * 1.15 : Math.random() * Math.PI * 2;
        const sp = (2.2 + Math.random() * 5.5) * power;
        sparks.push({
          x, y,
          vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
          r: 1 + Math.random() * 2.2,
          life: 1,
          decay: 0.007 + Math.random() * 0.015,
          hue: Math.random() < 0.7 ? GOLD : JADE,
        });
      }
      for (let i = 0; i < 3; i++) ripples.push({ x, y, r: 6 + i * 16, a: (0.55 * power) / (i + 1) });
    };

    // ── 事件 ──
    let prevMouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      // ❷ 鼠标光痕：移动时留下光点
      if (Math.hypot(e.clientX - prevMouse.x, e.clientY - prevMouse.y) > 3) {
        mouseTrail.push({ x: e.clientX, y: e.clientY, life: 1, maxLife: 0.8 + Math.random() * 0.6 });
        if (mouseTrail.length > 60) mouseTrail.splice(0, mouseTrail.length - 60);
        prevMouse.x = e.clientX; prevMouse.y = e.clientY;
      }
    };
    const onMouseOut = () => { mouse.x = null; mouse.y = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseout', onMouseOut);

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('a, button, input, textarea, select, [role="button"], label, [contenteditable]')) return;
      setCount(c => c + 1);
      burst(e.clientX, e.clientY, 0.75);
    };
    window.addEventListener('click', onClick);

    const onCompassBurst = (e: Event) => {
      const ce = e as CustomEvent<{ x: number; y: number }>;
      if (ce.detail && typeof ce.detail.x === 'number' && typeof ce.detail.y === 'number') {
        burst(ce.detail.x, ce.detail.y, 1.8);
      }
    };
    window.addEventListener('fy-compass-burst', onCompassBurst as EventListener);

    // ── 主循环（效果图逻辑） ──
    let raf = 0;
    const loop = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // 1. 星点
      for (const s of stars) {
        const alpha = s.a * (0.6 + 0.4 * Math.sin(t * 0.0012 + s.ph));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${s.c})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 2. 萤火 + 连线 + 呼吸光晕
      ctx.globalCompositeOperation = 'lighter';

      // ❶ 粒子连线：近距离萤火之间画金线（先画线，再画点，线在点下面）
      const CONNECT_DIST = 160;
      for (let i = 0; i < flies.length; i++) {
        for (let j = i + 1; j < flies.length; j++) {
          const dx = flies[i].x - flies[j].x;
          const dy = flies[i].y - flies[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.25;
            ctx.strokeStyle = `rgba(255,217,126,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(flies[i].x, flies[i].y);
            ctx.lineTo(flies[j].x, flies[j].y);
            ctx.stroke();
          }
        }
      }

      // 按深度排序：远先画（暗），近后画（亮）
      const sorted = [...flies].sort((a, b) => a.z - b.z);

      for (const f of sorted) {
        // 角度徘徊
        f.a += Math.sin(t * 0.001 + f.ph) * 0.02;
        f.x += Math.cos(f.a) * f.sp;
        f.y += Math.sin(f.a) * f.sp * 0.6 + Math.sin(t * 0.0012 + f.ph) * 0.15;

        // 鼠标吸引
        if (mouse.x != null && mouse.y != null) {
          const dx = mouse.x - f.x, dy = mouse.y - f.y, d = Math.hypot(dx, dy);
          if (d < 170 && d > 1) {
            f.x += dx / d * 0.35;
            f.y += dy / d * 0.35;
            f.excite = Math.min(1, f.excite + 0.08);
          } else f.excite = Math.max(0, f.excite - 0.02);
        } else f.excite = Math.max(0, f.excite - 0.02);

        // 绕回边界
        const m = 30;
        if (f.x < -m) f.x = W + m;
        if (f.x > W + m) f.x = -m;
        if (f.y < -m) f.y = H + m;
        if (f.y > H + m) f.y = -m;

        const pulse = 0.55 + 0.45 * Math.sin(t * 0.002 + f.ph);
        const e = f.excite;
        const depthBright = 0.5 + f.z * 0.5;
        const R = f.r * (2.6 + e * 1.4) * pulse * depthBright + f.r;

        // ❹ 呼吸光晕：外层更大、更淡的光环，缓慢膨胀收缩
        const glowPhase = Math.sin(t * 0.0015 + f.ph * 1.3) * 0.3 + 0.7;
        const glowR = R * 4.5 * glowPhase;
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowR);
        glow.addColorStop(0, `rgba(${f.hue},${0.12 * depthBright * pulse})`);
        glow.addColorStop(0.5, `rgba(${f.hue},${0.04 * depthBright * pulse})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(f.x, f.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // 主发光
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R * 3);
        g.addColorStop(0, `rgba(${f.hue},${(0.7 * pulse + 0.3 * e) * depthBright})`);
        g.addColorStop(0.4, `rgba(${f.hue},${0.16 * pulse * depthBright})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, R * 3, 0, Math.PI * 2);
        ctx.fill();

        // 核心
        ctx.fillStyle = `rgba(255,244,200,${(0.75 * pulse + 0.25 * e) * depthBright})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (0.8 + 0.3 * pulse), 0, Math.PI * 2);
        ctx.fill();
      }

      // ❷ 鼠标光痕
      for (let i = mouseTrail.length - 1; i >= 0; i--) {
        const t2 = mouseTrail[i];
        t2.life -= 0.012;
        if (t2.life <= 0) { mouseTrail.splice(i, 1); continue; }
        const alpha = t2.life * 0.4;
        const tr = 2.5 * t2.life;
        const tg = ctx.createRadialGradient(t2.x, t2.y, 0, t2.x, t2.y, tr * 4);
        tg.addColorStop(0, `rgba(255,217,126,${alpha})`);
        tg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.arc(t2.x, t2.y, tr * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 爆裂粒子（效果图逻辑）
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.955;
        s.vy *= 0.955;
        s.vy -= 0.025;
        s.life -= s.decay;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }

        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 7 * s.life);
        g.addColorStop(0, `rgba(${s.hue},${0.95 * s.life})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 7 * s.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. 涟漪
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 2.4;
        r.a *= 0.93;
        if (r.a < 0.02) { ripples.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(255,217,126,${r.a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', resize);
      window.removeEventListener('fy-compass-burst', onCompassBurst);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }}
      />
      {count > 0 && (
        <div
          style={{
            position: 'absolute', right: 'clamp(14px,3vw,42px)', bottom: 'clamp(10px,2vh,28px)',
            fontSize: '10px', letterSpacing: '0.32em', color: '#9db4a3',
            fontFamily: "'ZCOOL XiaoWei',serif", zIndex: 4, pointerEvents: 'none',
          }}
        >
          已拾 <span style={{ color: '#ffd97e' }}>{count}</span> 点光
        </div>
      )}
    </>
  );
}

