import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { toast } from 'sonner';
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

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  post_count: number;
}

const POST_LIMIT = 10;

/**
 * 主页 - 十三境沉浸式首页
 * Layout 已提供 RealmProvider/TopBar/ParticleField/RealmSwitcher，这里只渲染主体
 */
export default function Home() {
  const { user, loading } = useAuthStore();
  const { realm } = useRealm();

  // 板块数据
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);

  // 帖子数据（无限滚动）
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const postsSentinelRef = useRef<HTMLDivElement | null>(null);

  // 当前 tab
  const [tab, setTab] = useState('latest');

  // ── 拉取板块 ──
  useEffect(() => {
    api.get('/boards')
      .then((res) => setBoards(res.data))
      .catch(() => {})
      .finally(() => setBoardsLoading(false));
  }, []);

  // ── 拉取帖子 ──
  const fetchPosts = useCallback(async (pageNum: number, append = false, sort: string = 'latest') => {
    if (pageNum === 1) setPostsLoading(true);
    else setPostsLoadingMore(true);
    try {
      const res = await api.get('/posts', { params: { page: pageNum, sort } });
      const newPosts: Post[] = res.data.posts || [];
      setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
      if (newPosts.length < POST_LIMIT) setPostsHasMore(false);
      setPostsPage(pageNum + 1);
    } catch {
      // 静默
    } finally {
      setPostsLoading(false);
      setPostsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPosts(1, false, tab);
    }
  }, [user, tab, fetchPosts]);

  // 无限滚动
  useEffect(() => {
    if (!postsSentinelRef.current || !postsHasMore || postsLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && postsHasMore && !postsLoadingMore) {
          fetchPosts(postsPage, true, tab);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(postsSentinelRef.current);
    return () => observer.disconnect();
  }, [postsSentinelRef.current, postsHasMore, postsLoadingMore, postsPage, fetchPosts, tab]);

  // 下拉刷新
  const { pullDistance, pulling, refreshing, pullProps, containerRef } = usePullToRefresh({
    threshold: 80,
    resistance: 0.5,
    onRefresh: async () => {
      setPostsPage(1);
      setPostsHasMore(true);
      await fetchPosts(1, false, tab);
      try {
        const res = await api.get('/boards');
        setBoards(res.data);
      } catch {}
      toast.success('已刷新', { duration: 1500 });
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

      {/* 公告跑马灯 */}
      <Broadcast />

      {/* 站头（品牌 + 标语 + 罗盘/山景/藻井） */}
      <Masthead />

      {/* 主体内容 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {user ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* 左：tabs + feeds */}
            <div>
              <Tabs.Root value={tab} onValueChange={setTab}>
                <Tabs.List className="flex items-center gap-1 p-1.5 rounded-lg bg-[var(--card)] border border-[var(--line)] mb-4 w-fit">
                  {[
                    { v: 'latest', label: '最新' },
                    { v: 'hot', label: '热门' },
                    { v: 'featured', label: '精选' },
                  ].map(t => (
                    <Tabs.Trigger
                      key={t.v}
                      value={t.v}
                      className="relative px-5 py-2 text-[13px] rounded-md transition-colors data-[state=active]:text-[var(--acc)] data-[state=active]:bg-[var(--g1)]/60 text-[var(--soft)] hover:text-[var(--ink)]"
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
                        <p className="text-[11px] mt-1">暂无帖子，抢沙发吧</p>
                      </div>
                    ) : (
                      <>
                        <PostFeeds type={realm.feed} posts={posts} />

                        {/* 无限滚动哨兵 */}
                        {postsHasMore && (
                          <div
                            ref={postsSentinelRef}
                            className="flex items-center justify-center py-4"
                          >
                            {postsLoadingMore ? (
                              <Loader2 className="w-5 h-5 text-[var(--acc)] animate-spin" />
                            ) : (
                              <span className="text-[11px] text-[var(--soft)]">
                                ··· 加载更多 ···
                              </span>
                            )}
                          </div>
                        )}

                        {!postsHasMore && posts.length > 0 && (
                          <div
                            className="text-center py-6 text-[11px] text-[var(--soft)] italic"
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

              {/* 底部快捷操作 */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              {/* 社区公约 */}
              <Link
                to="/rules"
                className="group relative mt-4 block rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--card)] hover:border-[var(--acc)] transition-colors"
              >
                <div className="flex items-center gap-4 p-5">
                  <div className="w-12 h-12 rounded-lg bg-[var(--acc)]/15 text-[var(--acc)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
                      社区公约
                      <span className="text-[11px] bg-[var(--acc)]/20 text-[var(--acc)] px-2 py-0.5 rounded-full">
                        置顶
                      </span>
                    </h3>
                    <p className="text-[12px] text-[var(--soft)] mt-1">
                      互相尊重 · 友善交流 · 理性讨论 · 保护隐私
                    </p>
                  </div>
                  <span className="text-[12px] text-[var(--acc)] group-hover:underline shrink-0 hidden sm:inline">
                    查看 →
                  </span>
                </div>
              </Link>
            </div>

            {/* 右：侧栏 */}
            <aside className="space-y-4">
              <PhotoPanel />
              <StatsPanel />
              <BoardsPanel boards={boards} loading={boardsLoading} />
              <WoodenFish />
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
          <p className="text-[12px] text-[var(--soft)] leading-relaxed">{desc}</p>
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
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="px-7 py-3 rounded-md bg-[var(--acc)] text-[var(--g1)] font-bold text-[15px] hover:opacity-90 transition-opacity"
          >
            登录
          </Link>
          <Link
            to="/register"
            className="px-7 py-3 rounded-md border border-[var(--line)] text-[var(--ink)] text-[15px] hover:border-[var(--acc)] transition-colors"
          >
            注册
          </Link>
          <Link
            to="/download"
            className="px-7 py-3 rounded-md border border-[var(--line)] text-[var(--soft)] text-[15px] hover:text-[var(--acc)] hover:border-[var(--acc)] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-5 h-5" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
        <motion.p
          key={realm.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[13px] text-[var(--soft)] italic leading-relaxed"
          style={{ fontFamily: 'var(--disp)' }}
        >
          {config.ft ?? `—— ${realm.name} ——`}
        </motion.p>
        <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-[var(--soft)]">
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
      </div>
    </footer>
  );
}
