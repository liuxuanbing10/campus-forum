/**
 * 参商 · 工具函数
 * 随机数、缓动、颜色抖动等纯函数
 */

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
export const easeIO = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const easeO = (p: number) => 1 - Math.pow(1 - p, 3);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export function jit(c: string, amt: number) {
  return c.split(',').map(Number).map((v) => clamp(Math.round(v + (Math.random() - 0.5) * 2 * amt), 0, 255)).join(',');
}
export function darkOf(c: string) {
  const p = c.split(',').map(Number);
  return `${clamp((p[0] * 0.34) | 0, 0, 255)},${clamp((p[1] * 0.34) | 0, 0, 255)},${clamp((p[2] * 0.45 + 18) | 0, 0, 255)}`;
}
