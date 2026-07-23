import { Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, Heart, MessageCircle, Ban, Flag, Users,
  BookOpen, AlertTriangle, CheckCircle, Lightbulb, Eye,
} from 'lucide-react';

const RULES = [
  {
    icon: Heart,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-500/10',
    title: '互相尊重，友善交流',
    content:
      '尊重每一位社区成员，不论其年级、专业、性别、民族或观点。禁止人身攻击、辱骂、歧视性言论及恶意挑衅。讨论应聚焦于观点本身，而非针对个人。',
  },
  {
    icon: Ban,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    title: '禁止违规内容',
    content:
      '严禁发布色情、暴力、违法信息、赌博相关内容及任何违反中国法律法规的言论。不得传播虚假信息、谣言或未经证实的消息。不得讨论或引导违规翻墙、代考、作弊等行为。',
  },
  {
    icon: MessageCircle,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    title: '理性讨论，言之有物',
    content:
      '鼓励有深度的讨论和高质量的分享。发帖前请先搜索是否已有类似话题。避免无意义灌水、刷屏、纯表情回复或重复发帖。标题应简洁明了，概括帖子内容。',
  },
  {
    icon: Users,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    title: '保护隐私，尊重边界',
    content:
      '未经本人同意，不得公开他人真实姓名、联系方式、照片、住址等个人隐私信息。禁止人肉搜索、恶意曝光或网络暴力。匿名发帖时请尊重匿名的边界。',
  },
  {
    icon: Flag,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    title: '合理分类，规范发帖',
    content:
      '根据帖子内容选择正确的版块发布。商业广告、兼职招聘等信息请发至对应分类。团队招募贴请在团队功能中创建，而非在主版块刷屏。',
  },
  {
    icon: Shield,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    title: '尊重知识产权',
    content:
      '转载他人内容请注明出处。不得盗用他人原创作品（文章、图片、代码等）。鼓励原创内容分享，原创帖将获得更多曝光和认可。',
  },
  {
    icon: Eye,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    title: '举报违规，共建社区',
    content:
      '发现违规内容请使用「举报」功能，管理员会及时处理。恶意举报、滥用举报功能同样违反社区规定。每位成员都有责任维护良好的社区氛围。',
  },
  {
    icon: Lightbulb,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    title: '反馈与建议',
    content:
      '对社区功能、规则有任何建议，欢迎通过站内信联系管理员或在意见建议版块发帖。你的每一条反馈都在帮助社区变得更好。',
  },
];

const ENFORCEMENT = [
  {
    level: '轻微违规',
    desc: '偏离话题、轻微灌水、不友善语气等',
    action: '编辑/删除帖子、站内信提醒',
    color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 dark:text-yellow-400',
  },
  {
    level: '中等违规',
    desc: '人身攻击、刷屏、转载不注明、发错版块屡教不改',
    action: '删帖、短期禁言（1-7天）',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400',
  },
  {
    level: '严重违规',
    desc: '色情/暴力内容、泄露隐私、恶意攻击、违法信息',
    action: '删帖、长期禁言或永久封禁账号',
    color: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
  },
];

export default function CommunityGuidelines() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* ── 返回首页 ── */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-campus-text-secondary hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      {/* ── 页头 ── */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-campus-text-primary font-display">校园论坛社区公约</h1>
            <p className="text-sm text-campus-text-secondary mt-1">共同营造一个友善、理性、有序的校园交流环境</p>
          </div>
        </div>
      </div>

      {/* ── 序言 ── */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-6 text-sm text-campus-text-secondary leading-relaxed">
        <p>
          欢迎加入校园论坛！这里是我们共同的学习、交流与成长空间。
          为了维护良好的社区氛围，保障每位成员的权益，特制定本社区公约。
        </p>
        <p className="mt-3">
          本公约适用于校园论坛的所有用户和所有版块。使用本论坛即表示你同意遵守本公约。
          管理员有权根据实际情况对违规行为进行处理，处理结果将以站内信通知。
        </p>
      </div>

      {/* ── 公约条款 ── */}
      <h2 className="text-lg font-bold text-campus-text-primary font-display mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-primary" />
        约定条款
      </h2>

      <div className="grid gap-4 mb-8">
        {RULES.map((rule, i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors"
          >
            <div className="flex gap-4">
              <div className={`w-10 h-10 rounded-xl ${rule.bg} flex items-center justify-center flex-shrink-0`}>
                <rule.icon className={`w-5 h-5 ${rule.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-campus-text-primary mb-1.5">
                  第{i + 1}条 · {rule.title}
                </h3>
                <p className="text-sm text-campus-text-secondary leading-relaxed">{rule.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 违规处理 ── */}
      <h2 className="text-lg font-bold text-campus-text-primary font-display mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        违规处理机制
      </h2>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-8">
        {ENFORCEMENT.map((level, i) => (
          <div
            key={i}
            className={`p-5 ${i < ENFORCEMENT.length - 1 ? 'border-b border-border' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${level.color} flex-shrink-0 mt-0.5`}>
                {level.level}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-campus-text-secondary mb-1">
                  <span className="text-campus-text-primary font-medium">行为：</span>{level.desc}
                </p>
                <p className="text-sm text-campus-text-secondary">
                  <span className="text-campus-text-primary font-medium">处理：</span>{level.action}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 附则 ── */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-2xl p-5 mb-8 text-sm text-campus-text-secondary leading-relaxed">
        <h3 className="font-semibold text-campus-text-primary mb-2">附则</h3>
        <ul className="space-y-1.5 list-disc list-inside marker:text-primary/60">
          <li>本公约自发布之日起生效，管理员保留根据实际情况修改公约的权利。</li>
          <li>重大修改将通过公告通知全体用户。</li>
          <li>对于公约未覆盖的特殊情况，管理员有权酌情处理。</li>
          <li>如有疑问或建议，请联系管理员。</li>
        </ul>
      </div>

      <div className="text-center py-6 text-xs text-campus-text-tertiary border-t border-border">
        <p>最后更新：2026 年 7 月</p>
        <p className="mt-1">校园论坛管理团队</p>
      </div>
    </div>
  );
}
