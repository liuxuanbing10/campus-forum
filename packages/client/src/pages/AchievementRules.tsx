import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft, BookOpen, Star, Zap, Users, MessageCircle, Heart, Sparkles, Shield, Award, RefreshCw } from 'lucide-react';

const LEVEL_TIERS = [
  { level: 1,  title: '初来乍到', min: 0,    color: 'from-gray-400 to-gray-500', desc: '刚刚踏上论坛之旅' },
  { level: 2,  title: '初窥门径', min: 100,  color: 'from-green-400 to-green-500', desc: '开始探索论坛的各个角落' },
  { level: 3,  title: '小有名气', min: 300,  color: 'from-cyan-400 to-cyan-500', desc: '你的发言开始被大家注意' },
  { level: 4,  title: '崭露头角', min: 600,  color: 'from-blue-400 to-blue-500', desc: '已成为论坛的活跃分子' },
  { level: 5,  title: '论坛达人', min: 1000, color: 'from-violet-400 to-violet-500', desc: '大家对你也开始眼熟啦' },
  { level: 6,  title: '风云人物', min: 1500, color: 'from-amber-400 to-amber-500', desc: '你的帖子和评论备受关注' },
  { level: 7,  title: '社区精英', min: 2100, color: 'from-orange-400 to-orange-500', desc: '已是论坛中不可或缺的角色' },
  { level: 8,  title: '校园之星', min: 3000, color: 'from-rose-400 to-rose-500', desc: '闪耀在校园论坛的明星' },
  { level: 9,  title: '传奇学长', min: 4000, color: 'from-pink-500 to-red-500', desc: '传说级的存在，受人敬仰' },
  { level: 10, title: '论坛传说', min: 5500, color: 'from-yellow-400 via-orange-500 to-red-500', desc: '巅峰之上，无人能及' },
];

const CATEGORIES = [
  {
    key: 'content',
    icon: '📝',
    label: '内容创作',
    color: 'from-blue-500 to-cyan-500',
    desc: '通过发帖积累，鼓励优质内容产出',
    achievements: [
      { name: '初露锋芒', cond: '发表第 1 个帖子', points: 10 },
      { name: '笔耕不辍', cond: '累计发布 10 个帖子', points: 30 },
      { name: '文思泉涌', cond: '累计发布 50 个帖子', points: 80 },
      { name: '著作等身', cond: '累计发布 100 个帖子', points: 150 },
      { name: '论坛文豪', cond: '累计发布 500 个帖子', points: 500 },
    ],
  },
  {
    key: 'social',
    icon: '💬',
    label: '社交互动',
    color: 'from-green-500 to-emerald-500',
    desc: '积极参与讨论，让论坛更活跃',
    achievements: [
      { name: '初次交流', cond: '发布第 1 条评论', points: 5 },
      { name: '活跃分子', cond: '累计发表 50 条评论', points: 25 },
      { name: '话题王', cond: '累计发表 200 条评论', points: 60 },
      { name: '知无不言', cond: '累计发表 500 条评论', points: 120 },
    ],
  },
  {
    key: 'popularity',
    icon: '⭐',
    label: '人气之星',
    color: 'from-amber-500 to-orange-500',
    desc: '获得大家的认可和喜爱',
    achievements: [
      { name: '初具人气', cond: '获得 100 个赞', points: 30 },
      { name: '人气达人', cond: '获得 500 个赞', points: 80 },
      { name: '万人迷', cond: '获得 1000 个赞', points: 200 },
      { name: '初识收藏', cond: '收藏第 1 个帖子', points: 5 },
    ],
  },
  {
    key: 'team',
    icon: '🤝',
    label: '团队协作',
    color: 'from-purple-500 to-violet-500',
    desc: '组建和参与团队，一起成长',
    achievements: [
      { name: '团队新人', cond: '加入第 1 个团队', points: 10 },
      { name: '团队核心', cond: '创建第 1 个团队', points: 30 },
      { name: '社交蝴蝶', cond: '加入 5 个团队', points: 50 },
    ],
  },
  {
    key: 'activity',
    icon: '💪',
    label: '活跃度',
    color: 'from-pink-500 to-rose-500',
    desc: '长期活跃的论坛居民',
    achievements: [
      { name: '初来乍到', cond: '注册满 7 天', points: 10 },
      { name: '常驻居民', cond: '注册满 30 天', points: 30 },
      { name: '论坛元老', cond: '注册满 100 天', points: 100 },
      { name: '阅读达人', cond: '累计 1000 次浏览', points: 20 },
      { name: '博学者', cond: '累计 10000 次浏览', points: 100 },
    ],
  },
  {
    key: 'special',
    icon: '🏆',
    label: '特殊成就',
    color: 'from-red-500 to-yellow-500',
    desc: '达成特殊条件的荣誉徽章',
    achievements: [
      { name: '火钳刘明', cond: '单帖评论 10+', points: 20 },
      { name: '一夜爆红', cond: '单帖点赞 50+', points: 80 },
      { name: '论坛守护者', cond: '举报并处理违规', points: 10 },
    ],
  },
];

export default function AchievementRules() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* ── 返回按钮 ── */}
      <Link
        to="/achievements"
        className="inline-flex items-center gap-2 text-sm text-campus-text-secondary hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回成就
      </Link>

      {/* ── 页头 ── */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-campus-text-primary font-display">成就系统规则</h1>
            <p className="text-sm text-campus-text-secondary mt-1">了解如何获得成就、提升等级、赚取积分</p>
          </div>
        </div>
      </div>

      {/* ── 等级系统 ── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-campus-text-primary font-display mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          等级系统
        </h2>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-sm text-campus-text-secondary mb-4">
            等级由<span className="text-primary font-semibold">总积分</span>决定，每 100 积分升一级。
            等级越高，在论坛中越受人瞩目。等级与积分的关系：
          </p>
          <div className="space-y-2">
            {LEVEL_TIERS.map(t => (
              <div key={t.level} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-hover/50">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  Lv.{t.level}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-campus-text-primary">{t.title}</span>
                    <span className="text-xs text-campus-text-tertiary">{t.min}+ 积分</span>
                  </div>
                  <p className="text-xs text-campus-text-tertiary">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 积分规则 ── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-campus-text-primary font-display mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          积分规则
        </h2>
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm text-campus-text-primary">成就奖励</span>
              <p className="text-xs text-campus-text-secondary mt-0.5">解锁成就会一次性奖励对应积分，每个成就只能获得一次。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="font-semibold text-sm text-campus-text-primary">一次性解锁</span>
              <p className="text-xs text-campus-text-secondary mt-0.5">每个成就都是里程碑式的，达成条件即自动解锁，不会重复获得。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <span className="font-semibold text-sm text-campus-text-primary">自动检测</span>
              <p className="text-xs text-campus-text-secondary mt-0.5">系统会在你的相关操作（发帖、评论、点赞等）后自动检查成就进度。符合条件立即解锁，无需手动申请。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <RefreshCw className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <span className="font-semibold text-sm text-campus-text-primary">手动刷新</span>
              <p className="text-xs text-campus-text-secondary mt-0.5">点击成就页面的「刷新成就」按钮可以立即检查所有成就进度，适合刚完成一系列操作后查看最新状态。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 成就分类与列表 ── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-campus-text-primary font-display mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          全成就列表
        </h2>

        {CATEGORIES.map(cat => (
          <div key={cat.key} className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cat.icon}</span>
              <div>
                <h3 className="font-semibold text-sm text-campus-text-primary">{cat.label}</h3>
                <p className="text-xs text-campus-text-tertiary">{cat.desc}</p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border/50">
              {cat.achievements.map((ach, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-campus-text-tertiary w-5 text-right flex-shrink-0">#{i + 1}</span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-campus-text-primary">{ach.name}</span>
                      <p className="text-xs text-campus-text-tertiary">{ach.cond}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ml-3">
                    <Star className="w-3 h-3" />
                    +{ach.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── 页脚说明 ── */}
      <div className="text-center py-6 text-xs text-campus-text-tertiary border-t border-border">
        <p>成就系统旨在鼓励论坛的良性参与和内容创作</p>
        <p className="mt-1">所有成就均为一次性解锁，不可重复获得</p>
      </div>
    </div>
  );
}
