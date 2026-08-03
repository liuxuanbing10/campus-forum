import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { toastStore } from '../App';
import { Users, UserPlus, BookOpen, Download, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';
import MetaManager from '../components/MetaManager';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useRealm } from '../components/realms/RealmProvider';
import Broadcast from '../components/realms/Broadcast';
import Masthead from '../components/realms/Masthead';
import PostFeeds from '../components/realms/PostFeeds';
import { Post } from '../components/realms/PostFeeds/types';
import BoardsPanel from '../components/realms/sidebars/BoardsPanel';
import StatsPanel from '../components/realms/sidebars/StatsPanel';
import PhotoPanel from '../components/realms/sidebars/PhotoPanel';
import WoodenFish from '../components/realms/sidebars/WoodenFish';
import { JoyrideGuide } from '../components/JoyrideGuide';
import type { Step } from 'react-joyride';
import { QK } from '../lib/query-client';

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  postCount: number;
}

const POST_LIMIT = 10;

/**
 * 主页 - 十三境沉浸式首页
 * Layout 已提供 RealmProvider/TopBar/ParticleField/RealmSwitcher，这里只渲染主体
 */
export default function Home() {
  const { user, loading } = useAuthStore();
  const { realm } = useRealm();

  // 板块数据（react-query）
  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: QK.boards.list(),
    queryFn: async () => {
      const res = await api.get('/boards');
      return res.data as Board[];
    },
    enabled: !!user,
  });

  // 帖子数据（无限滚动 + react-query）
  const [tab, setTab] = useState('latest');
  const postsSentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
    refetch,
  } = useInfiniteQuery<{ posts: Post[]; nextPage: number }>({
    queryKey: QK.posts.list(tab, 0),
    queryFn: async ({ pageParam }) => {
      const page = (pageParam as number) ?? 1;
      const res = await api.get('/posts', { params: { page, sort: tab } });
      return { posts: (res.data.posts || []) as Post[], nextPage: page + 1 };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.posts.length >= POST_LIMIT ? lastPage.nextPage : undefined),
    enabled: !!user,
  });

  const posts = data?.pages.flatMap(p => p.posts) ?? [];

  // 无限滚动
  useEffect(() => {
    if (!postsSentinelRef.current || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(postsSentinelRef.current);
    return () => observer.disconnect();
  }, [postsSentinelRef.current, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 页面加载时滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 新手引导步骤
  const tourSteps: Step[] = [
    {
      target: '[data-joyride="masthead"]',
      content: '欢迎来到十三境！这里是主题站头，可以切换不同风格。',
    },
    {
      target: '[data-joyride="tabs"]',
      content: '在这里切换最新、热门、精选帖子。',
    },
    {
      target: '[data-joyride="boards-panel"]',
      content: '这是版块列表，点击可进入对应板块。',
    },
    {
      target: '[data-joyride="realm-switcher"]',
      content: '点击这里切换十三境主题风格。',
    },
  ];

  // 下拉刷新
  const { pullDistance, pulling, refreshing, pullProps, containerRef } = usePullToRefresh({
    threshold: 80,
    resistance: 0.5,
    onRefresh: async () => {
      await refetch();
      toastStore.success('已刷新', 1500);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--g1)] text-[var(--ink)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[var(--acc)] animate-spin" />
          <span className="text-sm text-[var(--soft)]">正在拾光...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        transition: pulling ? 'none' : 'transform 0.3s ease',
      }}
      {...pullProps}
    >
      <MetaManager
        title={`${realm.name} · 十三境`}
        description={realm.sub}
        keywords={`校园论坛,十三境,${realm.name},${realm.cat}`}
        ogType="website"
      />

      {/* 新手引导 */}
      <JoyrideGuide steps={tourSteps} enabled={!!user} continuous />

      {/* 公告跑马灯 */}
      <Broadcast />

      {/* 站头（品牌 + 标语 + 罗盘/山景/藻井）- r1/r3 由沉浸场景覆盖 */}
      {realm.id !== 'r1' && realm.id !== 'r3' && (
        <div data-joyride="masthead">
          <Masthead />
        </div>
      )}

      {/* 主体内容 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {user ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* 左：tabs + feeds */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5 }}
              >
              <Tabs.Root value={tab} onValueChange={setTab}>
                <Tabs.List className="flex items-center gap-1 p-1 rounded-lg bg-[var(--card)] border border-[var(--line)] mb-4 w-fit" data-joyride="tabs">
                  {[
                    { v: 'latest', label: '最新' },
                    { v: 'hot', label: '热门' },
                    { v: 'featured', label: '精选' },
                  ].map(t => (
                    <Tabs.Trigger
                      key={t.v}
                      value={t.v}
                      className="relative px-4 py-1.5 text-xs rounded-md transition-colors data-[state=active]:text-[var(--acc)] data-[state=active]:bg-[var(--g1)]/60 text-[var(--soft)] hover:text-[var(--ink)]"
                    >
                      {t.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {postsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-14 rounded-md bg-[var(--line)] animate-pulse"
                          />
                        ))}
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="text-center py-12 text-[var(--soft)]">
                        <p
                          className="text-base italic"
                          style={{ fontFamily: 'var(--disp)' }}
                        >
                          虚位以待
                        </p>
                        <p className="text-xs mt-1">暂无帖子，抢沙发吧</p>
                      </div>
                    ) : (
                      <>
                        <PostFeeds type={realm.feed} posts={posts} />

                        {/* 无限滚动哨兵 */}
                        {hasNextPage && (
                          <div
                            ref={postsSentinelRef}
                            className="flex items-center justify-center py-4"
                          >
                            {isFetchingNextPage ? (
                              <Loader2 className="w-5 h-5 text-[var(--acc)] animate-spin" />
                            ) : (
                              <span className="text-xs text-[var(--soft)]">
                                ··· 加载更多 ···
                              </span>
                            )}
                          </div>
                        )}

                        {!hasNextPage && posts.length > 0 && (
                          <div
                            className="text-center py-6 text-xs text-[var(--soft)] italic"
                            style={{ fontFamily: 'var(--disp)' }}
                          >
                            ✦ 已至卷尾 ✦
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </Tabs.Root>
              </motion.div>

              {/* 底部快捷操作 */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <QuickAction
                  to="/teams/new"
                  icon={<Users className="w-5 h-5" />}
                  title="创建团队"
                  desc="邀请同学组队参赛"
                />
                <QuickAction
                  to="/teams"
                  icon={<UserPlus className="w-5 h-5" />}
                  title="加入团队"
                  desc="找到志同道合的伙伴"
                />
              </motion.div>

              {/* 社区公约 */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
              <Link
                to="/rules"
                className="group relative mt-8 block rounded-lg overflow-hidden border border-[var(--line)] bg-[var(--card)]/60 hover:border-[var(--acc)] transition-colors"
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--acc)]/15 text-[var(--acc)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
                      社区公约
                      <span className="text-[9px] bg-[var(--acc)]/20 text-[var(--acc)] px-1.5 py-0.5 rounded-full">
                        置顶
                      </span>
                    </h3>
                    <p className="text-[10px] text-[var(--soft)] mt-0.5">
                      互相尊重 · 友善交流 · 理性讨论 · 保护隐私
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--acc)] group-hover:underline shrink-0 hidden sm:inline">
                    查看 →
                  </span>
                </div>
              </Link>
              </motion.div>
            </div>

            {/* 右：侧栏 */}
            <aside className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <PhotoPanel />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <StatsPanel />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
                data-joyride="boards-panel"
              >
                <BoardsPanel boards={boards} loading={boardsLoading} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.25 }}
              >
                <WoodenFish />
              </motion.div>
            </aside>
          </div>
        ) : (
          <NotLoggedIn />
        )}
      </main>

      {/* 页脚 */}
      <Footer />
    </div>
  );
}

// ────────────────────────────────────────────────
// 子组件
// ────────────────────────────────────────────────

function QuickAction({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group relative rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)] transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4 p-5">
        <div className="w-12 h-12 rounded-lg bg-[var(--acc)]/15 text-[var(--acc)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-[var(--ink)] mb-0.5">{title}</h3>
          <p className="text-xs text-[var(--soft)] leading-relaxed">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

function NotLoggedIn() {
  return (
    <div className="text-center py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="inline-block"
      >
        <div
          className="text-5xl mb-6 text-[var(--acc)]"
          style={{ fontFamily: 'var(--disp)' }}
        >
          拾光入境
        </div>
        <p className="text-base text-[var(--soft)] mb-8 italic">
          请登录或注册，以参与讨论
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2 rounded bg-[var(--acc)] text-[var(--g1)] font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            登录
          </Link>
          <Link
            to="/download"
            className="px-5 py-2 rounded border border-[var(--line)] text-[var(--soft)] text-sm hover:-translate-y-0.5 hover:shadow-lg hover:text-[var(--acc)] hover:border-[var(--acc)] transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            下载 APP
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Footer() {
  const { realm, config } = useRealm();
  return (
    <footer className="relative z-10 mt-16 border-t border-[var(--line)] bg-[var(--g2)]/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center"
      >
        <p
          className="text-sm text-[var(--soft)] italic leading-relaxed"
          style={{ fontFamily: 'var(--disp)' }}
        >
          {config.ft ?? `—— ${realm.name} ——`}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-[var(--soft)]">
          <Link to="/rules" className="hover:text-[var(--acc)] transition-colors">
            社区公约
          </Link>
          <span>·</span>
          <Link to="/download" className="hover:text-[var(--acc)] transition-colors">
            下载 APP
          </Link>
          <span>·</span>
          <span className="tabular-nums">
            {String(realm.idx).padStart(2, '0')} / 13
          </span>
        </div>
      </motion.div>
    </footer>
  );
}
