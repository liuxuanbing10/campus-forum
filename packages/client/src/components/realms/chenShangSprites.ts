/**
 * 参商 · 精灵图生成
 * 离屏 Canvas 绘制 glow / cloud / sphere / stroke / dab 精灵
 */

import { TAU } from './chenShangConstants';
import { rnd, jit, darkOf } from './chenShangUtils';

export type Sprite = HTMLCanvasElement;

export function makeGlow(c: string): Sprite[] {
  const out: Sprite[] = [];
  for (let v = 0; v < 3; v++) {
    const col = jit(c, 16);
    const s = document.createElement('canvas');
    s.width = 64; s.height = 64;
    const g = s.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, `rgba(${col},.5)`); gr.addColorStop(0.4, `rgba(${col},.16)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const nb = 4 + ((Math.random() * 4) | 0);
    for (let i = 0; i < nb; i++) {
      const ox = 32 + (Math.random() - 0.5) * 14, oy = 32 + (Math.random() - 0.5) * 14, r = 5 + Math.random() * 8;
      const gr2 = g.createRadialGradient(ox, oy, 0, ox, oy, r);
      gr2.addColorStop(0, `rgba(${col},${i === 0 ? 0.95 : 0.7})`);
      gr2.addColorStop(0.75, `rgba(${col},.35)`); gr2.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr2; g.beginPath(); g.arc(ox, oy, r, 0, TAU); g.fill();
    }
    out.push(s);
  }
  return out;
}
export function makeCloud(c: string): Sprite[] {
  const out: Sprite[] = [];
  for (let v = 0; v < 2; v++) {
    const col = jit(c, 12);
    const s = document.createElement('canvas');
    s.width = 160; s.height = 160;
    const g = s.getContext('2d')!;
    const nb = 9 + ((Math.random() * 4) | 0);
    for (let i = 0; i < nb; i++) {
      const ox = 80 + (Math.random() - 0.5) * 70, oy = 80 + (Math.random() - 0.5) * 56, r = 18 + Math.random() * 30;
      g.save(); g.translate(ox, oy); g.rotate(rnd(0, TAU)); g.scale(rnd(0.9, 1.9), rnd(0.45, 0.8));
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(${col},${i < 2 ? 0.42 : 0.28})`);
      gr.addColorStop(0.7, `rgba(${col},.12)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
    }
    out.push(s);
  }
  return out;
}
export function makeSphere(c: string, dk: string): Sprite {
  const s = document.createElement('canvas');
  s.width = 64; s.height = 64;
  const g = s.getContext('2d')!;
  const gr = g.createRadialGradient(24, 22, 1, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,.96)'); gr.addColorStop(0.16, `rgba(${c},.98)`);
  gr.addColorStop(0.5, `rgba(${c},.9)`); gr.addColorStop(0.8, `rgba(${dk},.92)`); gr.addColorStop(1, `rgba(${dk},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.78)'; g.beginPath(); g.ellipse(23, 21, 5, 3.4, -0.5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(40, 42, 7, 3, 0.6, 0, TAU); g.fill();
  return s;
}
export function makeStroke(c: string): Sprite {
  const col = jit(c, 10);
  const s = document.createElement('canvas');
  s.width = 192; s.height = 48;
  const g = s.getContext('2d')!;
  const ph = rnd(0, TAU);
  for (let i = 0; i < 46; i++) {
    const t2 = i / 45, x = 10 + t2 * 170, y = 24 + Math.sin(t2 * 5 + ph) * 3.2 * t2 + (Math.random() - 0.5) * 2.6;
    const r = (1 - t2) * 9.5 + 1.2 + Math.random() * 1.8;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${((1 - t2 * 0.55) * 0.9).toFixed(2)})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  return s;
}
export function makeDab(c: string): Sprite[] {
  const out: Sprite[] = [];
  for (let v = 0; v < 3; v++) {
    const col = jit(c, 14);
    const s = document.createElement('canvas');
    s.width = 96; s.height = 96;
    const g = s.getContext('2d')!;
    let gr = g.createRadialGradient(48, 48, 0, 48, 48, 44);
    gr.addColorStop(0, `rgba(${col},.5)`); gr.addColorStop(0.55, `rgba(${col},.2)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
    const R = 26 + Math.random() * 6, NP = 11;
    const pts: [number, number][] = [];
    for (let i = 0; i < NP; i++) { const a = (i / NP) * TAU, rr = R * (0.74 + Math.random() * 0.42); pts.push([48 + Math.cos(a) * rr, 48 + Math.sin(a) * rr]); }
    g.beginPath();
    g.moveTo((pts[0][0] + pts[NP - 1][0]) / 2, (pts[0][1] + pts[NP - 1][1]) / 2);
    for (let i = 0; i < NP; i++) { const p = pts[i], q = pts[(i + 1) % NP]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    gr = g.createRadialGradient(48, 48, 0, 48, 48, R * 1.15);
    gr.addColorStop(0, `rgba(${col},.95)`); gr.addColorStop(0.8, `rgba(${col},.85)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fill();
    for (let i = 0; i < 5; i++) {
      const a = rnd(0, TAU), rr = R * rnd(0.8, 1.05), br = rnd(3, 7), bx = 48 + Math.cos(a) * rr, by = 48 + Math.sin(a) * rr;
      const g2 = g.createRadialGradient(bx, by, 0, bx, by, br);
      g2.addColorStop(0, `rgba(${col},.8)`); g2.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = g2; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 12; i++) { g.globalAlpha = 0.25 + Math.random() * 0.4; g.beginPath(); g.arc(48 + rnd(-R * 0.3, R * 1.05), 48 + (Math.random() - 0.5) * R * 1.5, rnd(0.8, 3.2), 0, TAU); g.fill(); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(248,244,255,${rnd(0.25, 0.5).toFixed(2)})`; g.beginPath(); g.arc(48 + (Math.random() - 0.5) * R, 48 + (Math.random() - 0.5) * R, rnd(0.7, 1.6), 0, TAU); g.fill(); }
    out.push(s);
  }
  return out;
}
