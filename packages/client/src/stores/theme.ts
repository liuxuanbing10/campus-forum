import { create } from 'zustand';

/**
 * 十三境主题系统
 * 每境对应一种配色 + 字体 + 粒子 + 版式
 * 通过 [data-theme="r1"] ~ [data-theme="r13"] 在 CSS 中切换
 */

export type RealmId = 'r1' | 'r2' | 'r3' | 'r4' | 'r5' | 'r6' | 'r7' | 'r8' | 'r9' | 'r10' | 'r11' | 'r12' | 'r13';

export interface RealmInfo {
  id: RealmId;
  idx: number;          // 1-13
  name: string;         // 境名（如"流年拾光"）
  cat: string;          // 类目（如"自度·时"）
  seal: string;         // 印章文字
  sub: string;          // 副标（一句话注解）
  sl: string[];         // 主标语数组（轮播）
  amb: string;          // 粒子类型
  feed: string;         // 版式类型
  mh: 'mhA' | 'mhB' | 'mhC';  // 站头布局
  deco?: string;        // 装饰元素
  emoji: string;        // 主题切换器图标
  desc: string;         // 主题描述
}

export const REALMS: RealmInfo[] = [
  {
    id: 'r1', idx: 1, name: '流年拾光', cat: '自度·时', seal: '拾光',
    sub: '罗盘管时辰，光脊管流年——日子不必大声，也会被轻轻记住。',
    sl: ['拾光不语，流年自知。', '檐下流年，指尖拾光。', '于无声处，拾流年微光。', '拾一段流年，留给后来的你。', '流年拾光，落笔成暖。', '不惊动时光，只轻轻拾起。'],
    amb: 'none', feed: 'timeline', mh: 'mhC', deco: 'dial',
    emoji: '✦', desc: '暗绿金·萤火·马善政',
  },
  {
    id: 'r2', idx: 2, name: '如梦令', cat: '词牌·幻', seal: '如梦',
    sub: '常记溪亭日暮，沉醉不知归路——帖子是散落的梦，拾起一片是一片。',
    sl: ['常记溪亭日暮。', '昨夜雨疏风骤。', '误入藕花深处。', '争渡，争渡，惊起一滩鸥鹭。', '浓睡不消残酒。', '知否，知否，应是绿肥红瘦。'],
    amb: 'petal', feed: 'scatter', mh: 'mhA',
    emoji: '❀', desc: '暮紫·落花·站酷小薇',
  },
  {
    id: 'r3', idx: 3, name: '参商', cat: '星宿·离', seal: '参商',
    sub: '参，西方白虎；商，东方苍龙。一升一落，永不相见——帖子是两星之间唯一的桥。',
    sl: ['人生不相见，动如参与商。', '参商虽远，同此长夜。', '参在西，商在东。', '星辰替我们，见了一面。', '今夕何夕，见此良人。', '两星交替，人间一夜。'],
    amb: 'star', feed: 'stars', mh: 'mhA',
    emoji: '✧', desc: '深夜蓝·星辰·志莽行',
  },
  {
    id: 'r4', idx: 4, name: '千里江山', cat: '山河·卷', seal: '江山',
    sub: '希孟十八，一卷千里。青绿是山，留白是水——读帖如展卷，向右而行。',
    sl: ['只此青绿。', '江山如画，一时多少豪杰。', '展卷，见山。', '一笔青绿，千年未干。', '青山不改，绿水长流。', '山河入梦来。'],
    amb: 'mist', feed: 'scroll', mh: 'mhB',
    emoji: '⛰', desc: '青绿·雾气·Noto Serif SC',
  },
  {
    id: 'r5', idx: 5, name: '潇湘', cat: '水·八景', seal: '潇湘',
    sub: '夜雨、落雁、晚钟、晴岚、暮雪、归帆、秋月、夕照——八景轮转，皆是人间。',
    sl: ['斑竹一枝千滴泪。', '潇湘夜雨，平沙落雁。', '洞庭秋月，江天暮雪。', '远浦归帆，渔村夕照。', '湘水悠悠，楚云深深。', '八景轮转，皆是人间。'],
    amb: 'ripple', feed: 'windows', mh: 'mhA',
    emoji: '∽', desc: '苍青·雾气·站酷小薇',
  },
  {
    id: 'r6', idx: 6, name: '雷乃发声', cat: '节气·春', seal: '惊蛰',
    sub: '雷乃发声，始电，蛰虫咸动——第一声雷，替万物说了话。',
    sl: ['第一声雷，替万物说了话。', '春雷响，万物长。', '桃始华，仓庚鸣。', '微雨众卉新。', '蛰虫惊而出走。', '推门，见春。'],
    amb: 'rain', feed: 'sprout', mh: 'mhB',
    emoji: '⚡', desc: '嫩芽绿·雨丝·清刻黄油',
  },
  {
    id: 'r7', idx: 7, name: '麦秋至', cat: '节气·夏', seal: '小满',
    sub: '苦菜秀，靡草死，麦秋至——将满未满，留一分给风。',
    sl: ['将满未满，留一分给风。', '小得盈满，便是圆满。', '麦穗低着头，数自己的饱满。', '十分里，留一分给明天。', '满而不溢，是麦子的分寸。', '苦菜秀，靡草死，麦秋至。'],
    amb: 'mote', feed: 'sparse', mh: 'mhA',
    emoji: '☀', desc: '米黄·微尘·龙藏',
  },
  {
    id: 'r8', idx: 8, name: '白露', cat: '节气·秋', seal: '白露',
    sub: '蒹葭苍苍，白露为霜——所谓伊人，在水一方。',
    sl: ['露从今夜白。', '白露为霜。', '所谓伊人，在水一方。', '蒹葭苍苍，秋水茫茫。', '月是故乡明。', '鸿雁来，玄鸟归。'],
    amb: 'dew', feed: 'wide', mh: 'mhB', deco: 'pentads',
    emoji: '◐', desc: '雾灰·露珠·马善政',
  },
  {
    id: 'r9', idx: 9, name: '雨霖铃', cat: '词牌·别', seal: '雨霖',
    sub: '寒蝉凄切，对长亭晚，骤雨初歇——读帖如送行，一程一程。',
    sl: ['寒蝉凄切，对长亭晚。', '多情自古伤离别。', '今宵酒醒何处？杨柳岸，晓风残月。', '长亭更短亭。', '执手相看泪眼。', '此去经年，应是良辰好景虚设。'],
    amb: 'rain', feed: 'pavilion', mh: 'mhA',
    emoji: '☂', desc: '远山蓝·雨丝·马善政',
  },
  {
    id: 'r10', idx: 10, name: '高山流水', cat: '琴·音', seal: '知音',
    sub: '伯牙鼓琴，子期听之——巍巍乎志在高山，洋洋乎志在流水。',
    sl: ['巍巍乎，志在高山。', '洋洋乎，志在流水。', '高山流水，知音难觅。', '伯牙鼓琴，子期听之。', '七弦一拨，山河入耳。', '曲有误，周郎顾。'],
    amb: 'harmonics', feed: 'strings', mh: 'mhB',
    emoji: '♪', desc: '古琴褐·泛音·志莽行',
  },
  {
    id: 'r11', idx: 11, name: '藻井星河', cat: '壁画·窟', seal: '敦煌',
    sub: '敦，大也；煌，盛也——一窟之内，自有星河。',
    sl: ['飞天的衣袂，落了一千年。', '敦，大也；煌，盛也。', '一窟之内，自有星河。', '沙鸣处，有人提灯看画。', '藻井转动，众神低眉。', '颜料会老，美不会。'],
    amb: 'sand', feed: 'niche', mh: 'mhC', deco: 'zaojing',
    emoji: '✺', desc: '敦煌赭·沙粒·Noto Serif SC',
  },
  {
    id: 'r12', idx: 12, name: '青梧里', cat: '梧桐·荫', seal: '青梧',
    sub: '一叶青梧，半窗书声——梧桐深处，好读书。',
    sl: ['一叶青梧，半窗书声。', '树影婆娑处，正是读书时。', '蝉鸣渐远，书页正长。', '阳光穿过梧桐，落成一页一页。', '种一棵树，读一本书，等一场雨。', '青梧里，慢慢走，细细读。'],
    amb: 'leaf', feed: 'masonry', mh: 'mhA',
    emoji: '☘', desc: '翠梧绿·落叶·快乐体',
  },
  {
    id: 'r13', idx: 13, name: '夜航船', cat: '夜渡·灯', seal: '夜航',
    sub: '夜深了，这里还亮着——天下学问，都在这条船上。',
    sl: ['灯火可亲，同路有人。', '点一盏灯，等一个同路人。', '夜色深处，书声最暖。', '你提灯来，我煮茶等。', '晚自习的灯，是夜里的星。', '天下学问，都在这条船上。'],
    amb: 'lantern', feed: 'river', mh: 'mhA',
    emoji: '🏮', desc: '夜灯橙·孔明灯·站酷小薇',
  },
];

// 兼容旧代码的 THEMES 别名
export const THEMES = REALMS.map(r => ({
  id: r.id,
  name: r.name,
  description: r.desc,
  emoji: r.emoji,
  colors: { primary: '', surface: '', bg: '' },
}));

interface ThemeState {
  currentTheme: RealmId;
  realm: RealmInfo;          // 当前境信息
  setTheme: (id: RealmId) => void;
  initTheme: () => void;
  nextRealm: () => void;     // 切换到下一境
  prevRealm: () => void;     // 切换到上一境
}

const STORAGE_KEY = 'campus-forum-realm';
const DEFAULT_REALM: RealmId = 'r1';

const getRealm = (id: RealmId): RealmInfo =>
  REALMS.find(r => r.id === id) ?? REALMS[0];

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: DEFAULT_REALM,
  realm: getRealm(DEFAULT_REALM),

  setTheme: (id: RealmId) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', id);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
    set({ currentTheme: id, realm: getRealm(id) });
  },

  initTheme: () => {
    let id: RealmId = DEFAULT_REALM;
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as RealmId | null;
      if (saved && REALMS.some(r => r.id === saved)) id = saved;
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', id);
    }
    set({ currentTheme: id, realm: getRealm(id) });
  },

  nextRealm: () => {
    const cur = get().currentTheme;
    const idx = REALMS.findIndex(r => r.id === cur);
    const next = REALMS[(idx + 1) % REALMS.length];
    get().setTheme(next.id);
  },

  prevRealm: () => {
    const cur = get().currentTheme;
    const idx = REALMS.findIndex(r => r.id === cur);
    const prev = REALMS[(idx - 1 + REALMS.length) % REALMS.length];
    get().setTheme(prev.id);
  },
}));
