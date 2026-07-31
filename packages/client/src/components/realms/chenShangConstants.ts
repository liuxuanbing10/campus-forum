/**
 * 参商 · 常量表
 * 颜色、粒子混合比、精灵池等静态数据
 */

export const TAU = Math.PI * 2;

// ── 颜色表（来自参考视觉）──
export const C: Record<string, string> = {
  w: '232,238,252', y: '238,200,104', b: '86,150,255', i: '52,92,196',
  v: '96,96,210', t: '70,168,176', m: '236,92,140', r: '236,84,128',
};
export const NC: Record<string, string> = {
  cb: '44,78,168', uq: '42,66,152', pq: '26,40,112', tq: '44,128,150',
  vp: '88,74,184', mg: '150,52,120', yl: '212,172,92',
};
export const CLASH: Record<string, string> = {
  cb: '238,200,104', uq: '210,90,150', pq: '120,90,200', tq: '150,90,200',
  vp: '238,200,104', mg: '70,168,176', yl: '86,150,255',
};
export const RIVER_COL = ['w', 'y', 'b', 'v', 't', 'm', 'w', 'b', 'v', 't', 'y', 'm'];
export const AMB_COL = ['w', 'w', 'y', 'b', 'v', 't', 'w', 'y'];
export const FIELD_MIX = ['w', 'w', 'w', 'y', 'b', 'b', 'v', 't', 'w', 'y', 'w', 'i'];
export const FLOW_MIX = ['w', 'w', 'y', 'b', 'b', 'v', 't', 'w', 'y', 'i'];
export const SPARK_MIX = ['w', 'y', 'b', 'v', 't', 'w'];
export const NEB_KEYS = ['cb', 'uq', 'pq', 'tq', 'vp', 'cb', 'uq', 'tq', 'vp', 'cb'];
export const SPH_POOL = ['w', 'y', 'b', 'v', 'w', 'y', 'b', 't'];
export const BG_MIX = ['cb', 'cb', 'uq', 'vp', 'vp', 'pq', 'tq', 'mg', 'cb', 'vp', 'tq', 'mg', 'yl'];
