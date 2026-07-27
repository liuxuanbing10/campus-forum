/**
 * 十三境相关工具函数
 */

/** 十二地支（子时-亥时） */
export const EARTHLY_BRANCHES = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
];

/** 十二时辰对应的小时区间 */
export const SHICHEN_HOURS: Array<[number, number]> = [
  [23, 1], [1, 3], [3, 5], [5, 7], [7, 9], [9, 11],
  [11, 13], [13, 15], [15, 17], [17, 19], [19, 21], [21, 23],
];

/** 二十四节气 */
export const SOLAR_TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
];

/** 当前小时对应的地支 */
export function currentEarthlyBranch(date: Date = new Date()): string {
  const h = date.getHours();
  // 子时为 23-1 点
  const idx = Math.floor(((h + 1) % 24) / 2);
  return EARTHLY_BRANCHES[idx];
}

/** 当前地支的索引 */
export function currentEarthlyBranchIndex(date: Date = new Date()): number {
  const h = date.getHours();
  return Math.floor(((h + 1) % 24) / 2);
}

/** 时辰名（含"时"字） */
export function currentShichen(date: Date = new Date()): string {
  return `${currentEarthlyBranch(date)}时`;
}

/** 时辰对应的诗句 */
export const SHICHEN_POETRY: Record<string, string> = {
  '子': '子夜星河淡',
  '丑': '鸡鸣茅店月',
  '寅': '平明寻白帝',
  '卯': '日出江花红胜火',
  '辰': '食时万物苏',
  '巳': '隅中晴光好',
  '午': '日中为市',
  '未': '日昳方丈寂',
  '申': '晡时人未还',
  '酉': '日入群动息',
  '戌': '黄昏客梦频',
  '亥': '人定夜未央',
};

/** 三候（每节气分三候） */
export const PENTADS = ['初候', '二候', '三候'];

/** 罗盘角度：根据当前时辰计算 */
export function compassAngle(date: Date = new Date()): number {
  const idx = currentEarthlyBranchIndex(date);
  return idx * 30; // 360/12=30度
}

/** 数字递增动画 hook */
export function countUp(target: number, duration = 1200): { value: number } {
  // 简化版（实际在组件中用 framer-motion useMotionValue 实现）
  return { value: target };
}

/** 在两数之间取随机数 */
export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** 数组随机取一项 */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 简单哈希（用于生成稳定 id） */
export function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** 拼音/英文别名（用于副标） */
export const REALM_EN: Record<string, string> = {
  r1: 'FLOWING YEARS',
  r2: 'DREAMING LYRIC',
  r3: 'ORION & ANTARES',
  r4: 'A THOUSAND MILES',
  r5: 'XIAOXIANG EIGHT VIEWS',
  r6: 'THUNDER AWAKENS',
  r7: 'WHEAT AUTUMN',
  r8: 'WHITE DEW',
  r9: 'RAIN BELLS',
  r10: 'HIGH MOUNTAINS FLOWING WATER',
  r11: 'CAISSON STARRY RIVER',
  r12: 'GREEN PARASOL',
  r13: 'NIGHT BOAT',
};
