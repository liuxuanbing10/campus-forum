/**
 * 参商 · Canvas 绘制工具
 * 水墨笔触、虚线、旋涡、飞溅等纯绘制函数
 */

import { TAU } from './chenShangConstants';
import { rnd, gauss, clamp } from './chenShangUtils';

export function stampInk(g: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  if (r < 0.6) return;
  g.save(); g.translate(x, y); g.rotate(rnd(0, TAU)); g.scale(rnd(0.7, 1.3), rnd(0.6, 1.1));
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(alpha, 0, 1);
  g.fillStyle = `rgb(${rgb})`;
  g.beginPath();
  const pts = 9 + ((Math.random() * 4) | 0);
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * TAU, rr = r * (0.66 + Math.random() * 0.55);
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr * (0.72 + Math.random() * 0.4);
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath(); g.fill();
  g.globalCompositeOperation = 'destination-out';
  const holes = 1 + ((Math.random() * 2) | 0);
  for (let j = 0; j < holes; j++) { g.globalAlpha = rnd(0.3, 0.7); g.beginPath(); g.arc((Math.random() - 0.5) * r, (Math.random() - 0.5) * r, r * rnd(0.08, 0.24), 0, TAU); g.fill(); }
  g.restore();
}
export function dashStroke(g: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, rgb: string, alpha: number) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const n = Math.max(3, (len / 7) | 0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x + c * len * t + (Math.random() - 0.5) * w * 0.5;
    const py = y + s * len * t + (Math.random() - 0.5) * w * 0.5;
    stampInk(g, px, py, w * (0.5 + 0.5 * Math.sin(t * Math.PI)), rgb, alpha);
  }
}
export function paintVortex(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, rgb: string, rgb2: string, turns: number, dir: number) {
  const steps = (R * 0.9) | 0;
  for (let i = 0; i < steps; i++) {
    const t = i / steps, ang = dir * t * turns * TAU, rad = R * (0.12 + 0.88 * t);
    const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad * 0.92;
    const tang = ang + (dir * Math.PI) / 2;
    const len = rnd(10, 26) * (0.5 + 0.6 * t), w = rnd(4, 11) * (0.5 + 0.7 * (1 - t * 0.4));
    const useCol = Math.random() < 0.78 ? rgb : rgb2;
    dashStroke(g, px - Math.cos(tang) * len * 0.5, py - Math.sin(tang) * len * 0.5, tang, len, w, useCol, 0.5 + 0.4 * (1 - t));
  }
}
export function paintSplash(g: CanvasRenderingContext2D, x: number, y: number, sc: number, rgb: string, rgb2: string, a: number, dir: number) {
  const cdir = Math.cos(dir), sdir = Math.sin(dir);
  const count = 26 + ((Math.random() * 16) | 0);
  for (let i = 0; i < count; i++) {
    const along = gauss() * sc * 0.82, across = gauss() * sc * 0.34;
    const px = x + cdir * along - sdir * across, py = y + sdir * along + cdir * across;
    const center = 1 - Math.min(1, Math.abs(along) / (sc * 0.82 + 1));
    const rr = sc * rnd(0.16, 0.44) * (0.55 + 0.75 * center);
    const useCol = Math.random() < 0.72 ? rgb : rgb2;
    stampInk(g, px, py, rr, useCol, a * (0.42 + 0.52 * center));
  }
  const spl = 10 + ((Math.random() * 12) | 0);
  for (let s2 = 0; s2 < spl; s2++) {
    const sa = rnd(0, TAU), sd = sc * rnd(0.6, 1.9);
    stampInk(g, x + Math.cos(sa) * sd, y + Math.sin(sa) * sd, sc * rnd(0.04, 0.15), Math.random() < 0.7 ? rgb : rgb2, a * rnd(0.4, 0.82));
  }
}
