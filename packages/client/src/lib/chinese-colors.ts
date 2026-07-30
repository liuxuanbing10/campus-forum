/**
 * 中国传统色 · Chinese Traditional Colors
 *
 * 来源考据：中国传统色基于古代文献（《天工开物》《本草纲目》《中国传统色》）
 * 及故宫文物色彩复原数据整理
 *
 * 用法：
 *   import { colors, getColor, inkByDepth } from '@/lib/chinese-colors';
 *   colors.胭脂        // { hex: '#9D2933', name: '胭脂', rgb: [157,41,51] }
 *   getColor('竹青')    // { hex: '#789262', ... }
 *   inkByDepth(0.3)    // ← 十三境「越往下越淡」动态取色
 */

export interface ChineseColor {
  name: string;
  hex: string;
  rgb: [number, number, number];
  /** 诗意描述 */
  note?: string;
}

const colorEntries: [string, string, string?][] = [
  // ── 红 · Red ─────────────────────────────
  ['胭脂',   '#9D2933', '胭脂红，古时以红蓝花汁凝作胭脂'],
  ['朱砂',   '#C23B22', '朱砂赤，丹砂之色，古为皇家用色'],
  ['大红',   '#C62B29', '正红色，中国节庆之色'],
  ['殷红',   '#B7292B', '殷商之红，厚重深沉'],
  ['海棠红', '#C73E5A', '海棠花开之红，娇而不艳'],
  ['榴花红', '#C84736', '石榴花红，夏至之色'],
  ['丹',    '#C63D2F', '丹砂之色，赤诚之喻'],
  ['彤',    '#D4503A', '彤管有炜，赤红中透暖'],
  ['绛紫',   '#8E3A4B', '绛紫泛红，深绛近黑'],

  // ── 橙 · Orange ────────────────────────────
  ['缃叶',   '#E8C06A', '缃色如桑叶初生，浅黄带绿'],
  ['鹅黄',   '#F1C40F', '初生鹅雏之黄，娇嫩鲜亮'],
  ['橘黄',   '#E78A2E', '橘实金黄，丰收之色'],
  ['琥珀',   '#CA6924', '琥珀色，松脂化石之色'],
  ['杏黄',   '#EAA647', '杏子熟时之黄，暖融柔和'],
  ['雌黄',   '#E8B84B', '矿物色，古时用以涂改文字'],
  ['藤黄',   '#E3A857', '藤本植物树脂之色，画中常用'],
  ['檀香',   '#C07C40', '檀木之香亦有其色，温润沉静'],

  // ── 黄 · Yellow ──────────────────────────
  ['明黄',   '#F4C542', '明亮之黄，清代帝王专属色'],
  ['葵黄',   '#ECD06F', '秋葵花黄，淡雅清浅'],
  ['栀子',   '#EBC96E', '栀子果实染黄，古法制色'],
  ['姜黄',   '#D6A63B', '姜根之色，温润中正'],
  ['土黄',   '#B88A44', '大地之黄，厚德载物'],
  ['苍黄',   '#8F7540', '苍茫之黄，秋日草木之色'],

  // ── 绿 · Green ───────────────────────────
  ['竹青',   '#789262', '翠竹之青，清雅高洁'],
  ['松花绿', '#8DA96C', '松花之色，春意盎然'],
  ['碧色',   '#4A9B7B', '碧玉之色，清透明澈'],
  ['翠微',   '#3E8E6B', '翠微之色，山间青绿'],
  ['黛绿',   '#3B5842', '深绿近黛，远山含翠'],
  ['艾绿',   '#9AAC7A', '艾草之绿，古雅沉静'],
  ['柳绿',   '#7BA23F', '初春柳芽之绿，生机勃勃'],
  ['豆绿',   '#9DB477', '嫩豆之色，浅绿含黄'],
  ['石绿',   '#4C9A6A', '矿物色，青绿山水之本'],
  ['油绿',   '#4A6B3A', '深绿泛光，雨后草木'],

  // ── 蓝 · Blue ────────────────────────────
  ['月白',   '#D5E5E8', '月下之白，淡蓝微寒'],
  ['天青',   '#7CB9C8', '雨过天青云破处，宋瓷之色'],
  ['霁蓝',   '#3B7A9E', '雨霁天蓝，澄澈深邃'],
  ['靛蓝',   '#2E5A7D', '蓝靛之色，古法染布'],
  ['宝蓝',   '#1A5B8A', '宝石之蓝，明丽贵重'],
  ['海蓝',   '#2A7A9E', '沧海之色，阔远深邃'],
  ['鸦青',   '#42535C', '寒鸦之青，灰蓝凝冷'],
  ['水蓝',   '#8CB4C9', '清水之蓝，透亮清浅'],
  ['缥',    '#7FA9B7', '缥者，青白色也，如远山薄雾'],

  // ── 紫 · Purple ──────────────────────────
  ['丁香紫', '#B288A8', '丁香花开之紫，淡雅含香'],
  ['紫檀',   '#6D4C5A', '紫檀木色，深沉华贵'],
  ['藤萝紫', '#8B6F9B', '藤萝花紫，幽静婉约'],
  ['藕荷',   '#A98C9C', '莲藕之色，粉紫浅淡'],
  ['雪青',   '#9A86A4', '雪后远山之青紫，清冷朦胧'],

  // ── 棕 · Brown ───────────────────────────
  ['赭石',   '#6A3E2D', '赭石色，赤铁矿石之色，古壁画常用'],
  ['驼色',   '#9C7A59', '驼绒之色，温厚朴实'],
  ['栗色',   '#5D3A29', '栗壳之色，深棕近褐'],
  ['茶色',   '#8C6A4A', '老茶汤色，醇厚温润'],
  ['棕黄',   '#A88248', '棕榈之色，秋日大地'],
  ['酱色',   '#6B4028', '豆酱之色，浓酽厚实'],

  // ── 灰 · Gray ────────────────────────────
  ['银灰',   '#B8B7B5', '白银之灰，清冷素净'],
  ['烟灰',   '#858585', '袅袅炊烟之灰，朦胧柔和'],
  ['苍色',   '#78827A', '苍茫之色，草木将凋'],
  ['玄青',   '#3D3D3D', '玄者，幽远也；玄青近黑而含微光'],
  ['素白',   '#F5F1EB', '素色之白，未经染之丝'],
];

export const colors: Record<string, ChineseColor> = {};

for (const [name, hex, note] of colorEntries) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  colors[name] = { name, hex, rgb: [r, g, b], note };
}

export const colorList: ChineseColor[] = Object.values(colors);

/** 按中文名取色 */
export function getColor(name: string): ChineseColor | undefined {
  return colors[name];
}

/** 按十六进制取色 */
export function findByHex(hex: string): ChineseColor | undefined {
  return colorList.find(c => c.hex.toLowerCase() === hex.toLowerCase());
}

/**
 * 十三境「越往下越淡」动态取色
 *
 * depth: 0.0 ~ 1.0 （0 = 最深，1 = 最淡）
 * base: 基础颜色名，默认 '玄青'
 *
 * 原理：将基础色的 RGB 线性插值到白色
 * depth=0   → 原色（最深）
 * depth=0.5 → 半透明感（中等）
 * depth=1   → 纯白（最淡）
 */
export function inkByDepth(depth: number, base: string = '玄青'): string {
  const color = colors[base];
  if (!color) return '#ffffff';
  const d = Math.max(0, Math.min(1, depth));
  const [r, g, b] = color.rgb;
  const wr = Math.round(r + (255 - r) * d);
  const wg = Math.round(g + (255 - g) * d);
  const wb = Math.round(b + (255 - b) * d);
  return `rgb(${wr}, ${wg}, ${wb})`;
}

/** 十三境色阶：从最深到最淡生成 5 级色 */
export function inkPalette(base: string = '玄青'): string[] {
  return [0, 0.25, 0.5, 0.75, 1].map(d => inkByDepth(d, base));
}

export default colors;
