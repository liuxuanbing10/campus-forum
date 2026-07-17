import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';
import { Pin, MessageCircle, BookOpen, Music, Users, GraduationCap, Trophy, Heart, Star, ChevronLeft, ChevronRight, UserPlus, Eye, ThumbsUp, RefreshCw, Loader2, Download } from 'lucide-react';
import { THEMES, useThemeStore } from '../stores/theme';
import MetaManager from '../components/MetaManager';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { gsap } from 'gsap';

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  post_count: number;
}

interface Post {
  id: number;
  title: string;
  author_name: string;
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  board_name: string;
  is_pinned: number;
  is_favorited: number;
}

const iconMap: Record<string, React.ReactNode> = {
  '📢': <MessageCircle className="w-10 h-10" />,
  '📚': <BookOpen className="w-10 h-10" />,
  '🎵': <Music className="w-10 h-10" />,
  '👥': <Users className="w-10 h-10" />,
  '🎓': <GraduationCap className="w-10 h-10" />,
  '🏆': <Trophy className="w-10 h-10" />,
  '❤️': <Heart className="w-10 h-10" />,
  '⭐': <Star className="w-10 h-10" />,
};

const defaultIcon = <MessageCircle className="w-10 h-10" />;

const POST_LIMIT = 10;

export default function HomePage() {
  const { user, loading } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [sloganDone, setSloganDone] = useState(false);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  // ── 最新帖子无限滚动状态 ──
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const postsSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.get('/boards')
      .then((res) => setBoards(res.data))
      .catch(() => {})
      .finally(() => setBoardsLoading(false));
  }, []);

  // 标语手写动画完成后隐藏光标
  useEffect(() => {
    const timer = setTimeout(() => setSloganDone(true), 2800);
    return () => clearTimeout(timer);
  }, []);

  // Hero 区域 Canvas 动画：流星 + 漂浮金粒子
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ctx2d = ctx!;
    const dpr = window.devicePixelRatio || 1;
    const heroEl = canvas.parentElement;
    if (!heroEl) return;
    let animId: number;
    let inited = false;
    const resize = () => {
      const w = heroEl.clientWidth;
      const h = heroEl.clientHeight;
      if (w === 0 || h === 0) return false;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    };
    window.addEventListener('resize', resize);
    type FloatingParticle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; hue: number; phase: number };
    type Meteor = { x: number; y: number; vx: number; vy: number; length: number; alpha: number; life: number };
    const floaters: FloatingParticle[] = [];
    const meteors: Meteor[] = [];
    const W = () => canvas.width / dpr;
    const H = () => canvas.height / dpr;
    function initParticles() {
      if (W() === 0 || H() === 0) return;
      floaters.length = 0;
      for (let i = 0; i < 40; i++) {
        floaters.push({
          x: Math.random() * W(),
          y: Math.random() * H(),
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.2 - Math.random() * 0.4,
          size: 1 + Math.random() * 2.5,
          alpha: 0.3 + Math.random() * 0.5,
          hue: 35 + Math.random() * 25,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    let meteorTimer = 0;
    function spawnMeteor() {
      const startX = Math.random() * W() * 1.2 - W() * 0.1;
      const startY = -20;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      const speed = 8 + Math.random() * 6;
      meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 80 + Math.random() * 120,
        alpha: 0.6 + Math.random() * 0.4,
        life: 1,
      });
    }
    function drawFloater(p: FloatingParticle, time: number) {
      const twinkle = 0.6 + 0.4 * Math.sin(time * 0.002 + p.phase);
      const a = p.alpha * twinkle;
      const grad = ctx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      grad.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${a})`);
      grad.addColorStop(0.4, `hsla(${p.hue - 10}, 100%, 65%, ${a * 0.5})`);
      grad.addColorStop(1, `hsla(${p.hue - 20}, 100%, 50%, 0)`);
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx2d.fillStyle = grad;
      ctx2d.fill();
    }
    function drawMeteor(m: Meteor) {
      const tailX = m.x - m.vx * (m.length / Math.hypot(m.vx, m.vy));
      const tailY = m.y - m.vy * (m.length / Math.hypot(m.vx, m.vy));
      const grad = ctx2d.createLinearGradient(tailX, tailY, m.x, m.y);
      grad.addColorStop(0, 'rgba(255, 220, 150, 0)');
      grad.addColorStop(0.6, `rgba(255, 200, 100, ${m.alpha * 0.5})`);
      grad.addColorStop(1, `rgba(255, 255, 220, ${m.alpha})`);
      ctx2d.beginPath();
      ctx2d.moveTo(tailX, tailY);
      ctx2d.lineTo(m.x, m.y);
      ctx2d.strokeStyle = grad;
      ctx2d.lineWidth = 2.5;
      ctx2d.lineCap = 'round';
      ctx2d.stroke();
      // 流星头
      const headGrad = ctx2d.createRadialGradient(m.x, m.y, 0, m.x, m.y, 8);
      headGrad.addColorStop(0, `rgba(255, 255, 255, ${m.alpha})`);
      headGrad.addColorStop(0.5, `rgba(255, 230, 150, ${m.alpha * 0.7})`);
      headGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx2d.beginPath();
      ctx2d.arc(m.x, m.y, 8, 0, Math.PI * 2);
      ctx2d.fillStyle = headGrad;
      ctx2d.fill();
    }
    function animate(time: number) {
      // 尝试初始化尺寸
      if (!inited) {
        if (resize()) {
          inited = true;
          initParticles();
        }
      }
      ctx2d.clearRect(0, 0, W(), H());
      // 更新并绘制漂浮粒子
      floaters.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = H() + 10;
          p.x = Math.random() * W();
        }
        if (p.x < -10) p.x = W() + 10;
        if (p.x > W() + 10) p.x = -10;
        drawFloater(p, time);
      });
      // 生成流星
      meteorTimer++;
      if (meteorTimer > 120 + Math.random() * 180) {
        spawnMeteor();
        meteorTimer = 0;
      }
      // 更新并绘制流星
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        if (m.y > H() + 50 || m.x > W() + 50 || m.x < -50) {
          meteors.splice(i, 1);
        } else {
          drawMeteor(m);
        }
      }
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 4);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [boards]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!scrollRef.current) return;
      const isFocused = document.activeElement === scrollRef.current ||
        scrollRef.current.contains(document.activeElement);
      if (!isFocused && e.target instanceof HTMLInputElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToCard(Math.max(0, activeIndex - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToCard(Math.min(boards.length - 1, activeIndex + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, boards.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const containerCenter = el.clientWidth / 2;
    const cards = el.querySelectorAll('.carousel-card');
    let closestIndex = 0;
    let closestDist = Infinity;
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2 - el.getBoundingClientRect().left;
      const dist = Math.abs(cardCenter - containerCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = index;
      }
    });
    setActiveIndex(closestIndex);
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll('.carousel-card');
    const card = cards[index] as HTMLElement;
    if (!card) return;
    const containerCenter = el.clientWidth / 2;
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const scrollLeft = cardLeft + cardWidth / 2 - containerCenter;
    el.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }, []);

  const getCardStyle = useCallback((index: number): React.CSSProperties => {
    const offset = index - activeIndex;
    const absOffset = Math.abs(offset);
    const scale = Math.max(0.7, 1 - absOffset * 0.18);
    const opacity = Math.max(0.3, 1 - absOffset * 0.3);
    const translateY = absOffset * 20;
    const zIndex = 10 - absOffset;
    const blur = absOffset > 1 ? (absOffset - 1) * 2 : 0;
    return {
      transform: `scale(${scale}) translateY(${translateY}px)`,
      opacity,
      zIndex,
      flexShrink: 0,
      filter: blur > 0 ? `blur(${blur}px)` : 'none',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), filter 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  }, [activeIndex]);

  // ── 最新帖子：加载函数 ──
  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setPostsLoading(true);
    else setPostsLoadingMore(true);
    try {
      const res = await api.get('/posts', { params: { page: pageNum, sort: 'latest' } });
      const newPosts: Post[] = res.data.posts || [];
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      if (newPosts.length < POST_LIMIT) {
        setPostsHasMore(false);
      }
      setPostsPage(pageNum + 1);
    } finally {
      setPostsLoading(false);
      setPostsLoadingMore(false);
    }
  }, []);

  // 初始加载帖子
  useEffect(() => {
    if (user) {
      fetchPosts(1, false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver 无限滚动
  useEffect(() => {
    if (!postsSentinelRef.current || !postsHasMore || postsLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && postsHasMore && !postsLoadingMore) {
          fetchPosts(postsPage, true);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(postsSentinelRef.current);
    return () => observer.disconnect();
  }, [postsSentinelRef.current, postsHasMore, postsLoadingMore, postsPage, fetchPosts]);

  // ── 下拉刷新 ──
  const { pullDistance, pulling, refreshing, pullProps, containerRef } = usePullToRefresh({
    threshold: 80,
    resistance: 0.5,
    onRefresh: async () => {
      setPostsPage(1);
      setPostsHasMore(true);
      await fetchPosts(1, false);
      // 同时刷新板块数据
      try {
        const res = await api.get('/boards');
        setBoards(res.data);
      } catch {}
    },
  });

  if (loading) {
    return <div className="text-center py-12 text-campus-text-tertiary font-handwrite text-lg">加载中...</div>;
  }

  return (
    <>
      <MetaManager
        title="首页"
        description="校园论坛 - 分享知识，连接校园。交流学习心得，分享校园生活，结识志同道合的朋友。"
        keywords="校园论坛,社区,交流,校园生活,学习,讨论"
        ogType="website"
      />
    <div
      ref={containerRef}
      className="page-enter"
      style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined, transition: pulling ? 'none' : 'transform 0.3s ease' }}
      {...pullProps}
    >
      {/* Pull-to-refresh indicator */}
      {(pulling || refreshing) && (
        <div className="flex items-center justify-center py-2 text-sm text-campus-text-tertiary font-body" style={{ opacity: Math.min(1, pullDistance / 60) }}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }} />
          {refreshing ? '刷新中...' : pullDistance >= 80 ? '释放刷新' : '下拉刷新'}
        </div>
      )}

      <div className="relative py-14 sm:py-20 md:py-28 px-4 text-center overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900">
        {/* tsParticles 星空背景 */}
        <div className="absolute inset-0 pointer-events-none w-full h-full">
          <ParticlesProvider init={particlesInit}>
            <Particles
              id="tsparticles-hero"
              style={{ width: '100%', height: '100%' }}
              options={{
                fullScreen: { enable: false },
                background: { color: { value: 'transparent' } },
                fpsLimit: 60,
                particles: {
                  number: { value: 80, density: { enable: true } },
                  color: { value: ['#ffffff', '#ffd700', '#87ceeb', '#ffb6c1'] },
                  shape: { type: 'circle' },
                  opacity: {
                    value: { min: 0.1, max: 0.9 },
                    animation: { enable: true, speed: 1.2, minimumValue: 0.1, sync: false }
                  },
                  size: {
                    value: { min: 0.5, max: 3 },
                    animation: { enable: true, speed: 2, minimumValue: 0.3, sync: false }
                  },
                  move: {
                    enable: true,
                    speed: 0.4,
                    direction: 'none',
                    random: true,
                    straight: false,
                    outModes: { default: 'out' },
                  },
                  twinkle: {
                    particles: { enable: true, frequency: 0.05, opacity: 1 },
                  },
                },
                detectRetina: true,
              }}
            />
          </ParticlesProvider>
        </div>
        {/* Canvas 流星 + 漂浮金粒子 */}
        <canvas ref={heroCanvasRef} className="absolute inset-0 pointer-events-none z-10" />
        {/* 星云光晕装饰 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-96 h-96 -top-20 -left-20 rounded-full bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent blur-3xl" />
          <div className="absolute w-80 h-80 top-10 -right-10 rounded-full bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent blur-3xl" />
          <div className="absolute w-64 h-64 bottom-0 left-1/3 rounded-full bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-transparent blur-3xl" />
        </div>
        {/* 标语：对联式金色发光文字 */}
        <h1 className="relative z-20 font-slogan text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight">
          <span className="block hero-title-text hero-title-text-1">
            指尖流淌星辰海
          </span>
          <span className="block hero-title-text hero-title-text-2 mt-2 sm:mt-3">
            笔端绽放百花开
          </span>
        </h1>
        {/* 横批：金色印章风格 */}
        <p className="relative z-20 text-lg sm:text-xl font-handwrite max-w-2xl mx-auto mt-5 sm:mt-8 text-amber-200/80 hero-subtitle">
          —— 文采飞扬 ——
        </p>
        {/* APP 下载入口：金色发光按钮 */}
        <Link to="/download" className="relative z-20 inline-flex items-center gap-2 mt-8 px-8 py-4 hero-download-btn text-slate-900 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300">
          <Download className="w-6 h-6" />
          下载 APP
        </Link>
      </div>

      {/* 第二副对联：知识分享理念 */}
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <span className="font-slogan text-2xl sm:text-3xl text-fade-in tracking-wider second-couplet-text">分享让知识增值</span>
          <span className="hidden sm:inline text-campus-text-tertiary text-2xl font-light">·</span>
          <span className="sm:hidden text-campus-text-tertiary text-lg font-light">·</span>
          <span className="font-slogan text-2xl sm:text-3xl text-fade-in text-fade-in-delay-1 tracking-wider second-couplet-text">讨论让思维升级</span>
        </div>
        <p className="mt-4 text-base sm:text-lg text-campus-text-tertiary font-handwrite text-fade-in text-fade-in-delay-2">
          —— 共同成长 ——
        </p>
      </div>

      {user ? (
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="absolute w-96 h-96 -top-10 -left-20 rounded-full bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300 blur-3xl opacity-30" />
            <div className="absolute w-80 h-80 top-20 -right-10 rounded-full bg-gradient-to-br from-yellow-200 via-orange-300 to-pink-300 blur-3xl opacity-30" />
            <div className="absolute w-72 h-72 bottom-0 left-1/3 rounded-full bg-gradient-to-br from-green-200 via-teal-300 to-cyan-300 blur-3xl opacity-30" />
          </div>
          {boardsLoading ? (
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-60 sm:w-72 bg-surface border border-border rounded-xl p-6 sm:p-8 animate-pulse">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-light rounded-xl mb-4" />
                  <div className="h-5 w-24 bg-primary-light rounded mb-3" />
                  <div className="h-4 w-full bg-primary-light rounded" />
                </div>
              ))}
            </div>
          ) : boards.length > 0 ? (
            <div className="relative rounded-3xl overflow-hidden glass-liquid p-4 sm:p-6 md:p-8">
              <div className="glass-highlight" />
              <div className="glass-inner-shadow" />
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl opacity-60">
                <div className="ink-blob ink-blob-section-1" />
                <div className="ink-blob ink-blob-section-2" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-handwrite text-xl sm:text-2xl md:text-3xl text-fade-in gradient-title">
                  探索板块
                </h2>
                {canScroll && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-campus-text-tertiary font-handwrite text-fade-in text-fade-in-delay-1">
                    左右滚动浏览
                  </span>
                )}
              </div>

              <div className="relative z-10">
                <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 md:w-32 bg-gradient-to-r from-surface via-surface/80 to-transparent pointer-events-none z-20" />
                <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 md:w-32 bg-gradient-to-l from-surface via-surface/80 to-transparent pointer-events-none z-20" />

                {boards.length > 1 && canScroll && (
                  <>
                    <button
                      onClick={() => scrollToCard(Math.max(0, activeIndex - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-campus-text-primary transition-all hover:scale-105 hidden sm:flex"
                      aria-label="上一个板块"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => scrollToCard(Math.min(boards.length - 1, activeIndex + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-campus-text-primary transition-all hover:scale-105 hidden sm:flex"
                      aria-label="下一个板块"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  tabIndex={0}
                  className="flex items-center overflow-x-auto scroll-smooth py-6 sm:py-8 px-4 sm:px-8 md:px-16 scrollbar-hide snap-x snap-mandatory focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
                  aria-label="板块轮播，使用左右方向键导航"
                >
                  <div className="flex-shrink-0 w-[calc(50%-7rem)] sm:w-[calc(50%-8rem)]" />

                  {boards.map((board, index) => (
                    <Link
                      key={board.id}
                      to={`/board/${board.id}`}
                      className="carousel-card card-enter relative w-56 sm:w-64 md:w-72 flex flex-col items-start p-5 sm:p-6 md:p-7 rounded-2xl transition-all duration-500 ease-out snap-center -mx-3 sm:-mx-4 md:-mx-6 overflow-hidden glass-card cursor-pointer board-card-glow"
                      style={{
                        ...getCardStyle(index),
                        animationDelay: `${index * 0.08}s`,
                      }}
                    >
                      <div className="relative z-10 text-primary mb-3 sm:mb-4">
                        {iconMap[board.icon] || defaultIcon}
                      </div>
                      <h3 className="relative z-10 font-handwrite text-lg sm:text-xl font-semibold text-campus-text-primary mb-1.5 sm:mb-2">
                        {board.name}
                      </h3>
                      <p className="relative z-10 text-xs sm:text-sm text-campus-text-secondary font-handwrite mb-4 sm:mb-5 flex-1 leading-relaxed line-clamp-2">
                        {board.description}
                      </p>
                      <span className="relative z-10 text-xs font-medium text-campus-text-tertiary font-body">
                        {board.post_count} 帖子
                      </span>
                    </Link>
                  ))}

                  <div className="flex-shrink-0 w-[calc(50%-8rem)] sm:w-[calc(50%-9rem)]" />
                </div>
              </div>

              <div className="relative z-10 flex justify-center gap-2 mt-3 sm:mt-4">
                {boards.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === activeIndex
                        ? 'bg-primary w-6'
                        : 'bg-border hover:bg-primary/40'
                    }`}
                    onClick={() => scrollToCard(index)}
                    aria-label={`切换到第 ${index + 1} 个板块`}
                  />
                ))}
              </div>

              {canScroll && (
                <div className="relative z-10 flex sm:hidden justify-center mt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-campus-text-tertiary font-medium font-handwrite animate-scroll-hint">
                    左右滑动浏览
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-campus-text-secondary">
              <p className="text-lg font-handwrite">暂无板块数据</p>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              最新帖子 - 无限滚动信息流
              ═══════════════════════════════════════════ */}
          <div className="mt-8 sm:mt-10">
            <h2 className="font-handwrite text-xl sm:text-2xl mb-4 sm:mb-6 gradient-title">
              最新动态
            </h2>

            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-4 sm:p-5 animate-pulse">
                    <div className="h-5 w-3/4 bg-primary-light rounded mb-3" />
                    <div className="h-4 w-1/2 bg-primary-light rounded mb-2" />
                    <div className="h-3 w-1/3 bg-primary-light rounded" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-campus-text-secondary font-body">暂无帖子</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="card block p-4 sm:p-5 border-l-[3px] border-l-primary hover:-translate-y-0.5 transition-all post-card-glow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-semibold font-body text-campus-text-primary truncate flex-1 min-w-0">
                        {post.is_pinned ? (
                          <span className="inline-flex items-center gap-1 text-primary mr-1">
                            <Pin className="w-3.5 h-3.5" />
                          </span>
                        ) : null}
                        {post.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-campus-text-tertiary font-body flex-wrap">
                      <span className="whitespace-nowrap">{post.author_name}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full whitespace-nowrap">{post.board_name}</span>
                      <span className="whitespace-nowrap flex items-center gap-1">
                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {post.view_count}
                      </span>
                      <span className="whitespace-nowrap flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {post.like_count}
                      </span>
                      <span className="whitespace-nowrap flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {post.comment_count}
                      </span>
                      <span className="whitespace-nowrap ml-auto text-xs">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}

                {/* 无限滚动哨兵 */}
                {postsHasMore && (
                  <div ref={postsSentinelRef} className="flex items-center justify-center py-4">
                    {postsLoadingMore ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <span className="text-sm text-campus-text-tertiary font-body">加载更多...</span>
                    )}
                  </div>
                )}

                {!postsHasMore && posts.length > 0 && (
                  <div className="text-center py-4 text-sm text-campus-text-tertiary font-body">
                    — 已经到底了 —
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部快捷操作 */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* 创建团队 */}
            <Link
              to="/teams/new"
              className="group relative rounded-2xl overflow-hidden glass-card p-5 sm:p-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="relative z-10 flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-semibold font-display text-campus-text-primary mb-1">创建团队</h3>
                  <p className="text-xs sm:text-sm text-campus-text-tertiary font-body leading-relaxed">邀请同学一起学习、组队参赛，打造你的校园团队</p>
                  <span className="inline-block mt-2 sm:mt-3 text-xs font-medium text-primary font-body group-hover:underline">立即创建 →</span>
                </div>
              </div>
            </Link>

            {/* 加入团队 */}
            <Link to="/teams" className="group relative rounded-2xl overflow-hidden glass-card p-5 sm:p-6 transition-all block">
              <div className="relative z-10 flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-semibold font-display text-campus-text-primary mb-1">加入团队</h3>
                  <p className="text-xs sm:text-sm text-campus-text-tertiary font-body leading-relaxed">找到志同道合的小伙伴，一起交流成长</p>
                  <span className="inline-block mt-2 sm:mt-3 text-xs font-medium text-primary font-body group-hover:underline">浏览团队 →</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-campus-text-secondary">
          <p className="text-xl font-handwrite">请登录或注册以参与讨论。</p>
        </div>
      )}

      <style>{`
        .hero-title-text {
          background: linear-gradient(
            135deg,
            #fff7ed 0%,
            #fef08a 15%,
            #fbbf24 30%,
            #f59e0b 45%,
            #fbbf24 60%,
            #fef08a 75%,
            #fff7ed 100%
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.5))
                  drop-shadow(0 0 40px rgba(245, 158, 11, 0.3));
          animation: hero-shimmer 4s ease-in-out infinite, hero-text-in 1.2s ease-out forwards;
          opacity: 0;
        }
        .hero-title-text-1 {
          animation-delay: 0.3s;
        }
        .hero-title-text-2 {
          animation-delay: 0.8s;
        }
        @keyframes hero-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes hero-text-in {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
            filter: drop-shadow(0 0 0px rgba(251, 191, 36, 0))
                    blur(10px);
          }
          60% {
            opacity: 1;
            transform: translateY(0) scale(1.02);
            filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.6))
                    blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.5))
                    drop-shadow(0 0 40px rgba(245, 158, 11, 0.3))
                    blur(0);
          }
        }
        .hero-subtitle {
          animation: hero-subtitle-in 1s ease-out 1.5s forwards;
          opacity: 0;
        }
        @keyframes hero-subtitle-in {
          0% {
            opacity: 0;
            transform: translateY(15px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hero-download-btn {
          background: linear-gradient(135deg, #fef08a 0%, #fbbf24 50%, #f59e0b 100%);
          box-shadow:
            0 0 20px rgba(251, 191, 36, 0.4),
            0 0 40px rgba(245, 158, 11, 0.2),
            0 8px 25px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          animation: hero-btn-pulse 2.5s ease-in-out infinite, hero-btn-in 0.8s ease-out 2s forwards;
          opacity: 0;
          position: relative;
          overflow: hidden;
        }
        .hero-download-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.5) 50%,
            transparent 100%
          );
          animation: hero-btn-shine 3s ease-in-out infinite;
        }
        @keyframes hero-btn-shine {
          0% { left: -100%; }
          50%, 100% { left: 100%; }
        }
        @keyframes hero-btn-pulse {
          0%, 100% {
            box-shadow:
              0 0 20px rgba(251, 191, 36, 0.4),
              0 0 40px rgba(245, 158, 11, 0.2),
              0 8px 25px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
          }
          50% {
            box-shadow:
              0 0 30px rgba(251, 191, 36, 0.6),
              0 0 60px rgba(245, 158, 11, 0.3),
              0 8px 30px rgba(0, 0, 0, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.7);
          }
        }
        @keyframes hero-btn-in {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .second-couplet-text {
          background: linear-gradient(
            135deg,
            #6366f1 0%,
            #8b5cf6 25%,
            #ec4899 50%,
            #f59e0b 75%,
            #6366f1 100%
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: second-couplet-shimmer 6s ease-in-out infinite;
        }
        @keyframes second-couplet-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .gradient-title {
          background: linear-gradient(
            135deg,
            #6366f1 0%,
            #8b5cf6 30%,
            #ec4899 60%,
            #f59e0b 100%
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-title-shimmer 8s ease-in-out infinite;
        }
        @keyframes gradient-title-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .board-card-glow {
          position: relative;
        }
        .board-card-glow::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 1rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899, #f59e0b);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
          filter: blur(8px);
        }
        .board-card-glow:hover::before {
          opacity: 0.6;
        }
        .board-card-glow:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        .post-card-glow {
          position: relative;
          transition: all 0.3s ease;
        }
        .post-card-glow:hover {
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
          border-color: rgba(139, 92, 246, 0.3);
        }
        .ink-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(55px);
          opacity: 0.18;
          pointer-events: none;
        }
        .ink-blob-1 {
          width: 400px;
          height: 400px;
          top: -140px;
          left: -120px;
          background: radial-gradient(circle, #f472b6 0%, #fb923c 35%, #fbbf24 65%, transparent 80%);
          animation: ink-float 20s ease-in-out infinite;
        }
        .ink-blob-2 {
          width: 320px;
          height: 320px;
          top: 10%;
          right: -100px;
          background: radial-gradient(circle, #60a5fa 0%, #a78bfa 40%, #c084fc 70%, transparent 85%);
          animation: ink-float 24s ease-in-out infinite reverse;
          animation-delay: -6s;
        }
        .ink-blob-3 {
          width: 260px;
          height: 260px;
          bottom: -80px;
          left: 25%;
          background: radial-gradient(circle, #4ade80 0%, #2dd4bf 45%, #22d3ee 75%, transparent 85%);
          animation: ink-float 22s ease-in-out infinite;
          animation-delay: -12s;
        }
        .ink-blob-4 {
          width: 200px;
          height: 200px;
          top: 35%;
          left: 10%;
          background: radial-gradient(circle, #f43f5e 0%, #fb7185 50%, transparent 80%);
          animation: ink-float 26s ease-in-out infinite reverse;
          animation-delay: -4s;
        }
        .ink-blob-section-1 {
          width: 320px;
          height: 320px;
          top: -120px;
          right: -100px;
          background: radial-gradient(circle, #818cf8 0%, #a78bfa 40%, #e879f9 70%, transparent 85%);
          animation: ink-float 26s ease-in-out infinite;
          animation-delay: -3s;
        }
        .ink-blob-section-2 {
          width: 280px;
          height: 280px;
          bottom: -100px;
          left: -80px;
          background: radial-gradient(circle, #fbbf24 0%, #fb923c 45%, #f472b6 75%, transparent 85%);
          animation: ink-float 22s ease-in-out infinite reverse;
          animation-delay: -10s;
        }
        @keyframes ink-float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(20px, -15px) scale(1.05);
          }
          66% {
            transform: translate(-15px, 20px) scale(0.97);
          }
        }
        .glass-liquid {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(255, 255, 255, 0.3);
        }
        .glass-highlight {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.5) 0%,
            rgba(255, 255, 255, 0.15) 50%,
            transparent 100%
          );
          pointer-events: none;
          border-radius: inherit;
          z-index: 1;
        }
        .glass-inner-shadow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          box-shadow:
            inset 0 2px 30px rgba(255, 255, 255, 0.4),
            inset 0 -2px 15px rgba(0, 0, 0, 0.04);
          z-index: 1;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            inset 0 -1px 0 rgba(255, 255, 255, 0.4);
        }
        .glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 45%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.6) 0%,
            rgba(255, 255, 255, 0.2) 55%,
            transparent 100%
          );
          pointer-events: none;
          border-radius: inherit;
          z-index: 1;
        }
        @keyframes card-enter {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .card-enter {
          opacity: 0;
          animation: card-enter 0.45s cubic-bezier(0.21, 0.98, 0.35, 1) forwards;
        }
        @keyframes scroll-hint {
          0%, 100% { opacity: 0.5; transform: translateX(0); }
          50%      { opacity: 1;   transform: translateX(6px); }
        }
        .animate-scroll-hint {
          animation: scroll-hint 1.8s ease-in-out infinite;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
    </>
  );
}

function ThemePreview() {
  const currentId = useThemeStore((s) => s.currentTheme);
  const theme = THEMES.find((t) => t.id === currentId) || THEMES[0];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-campus-text-tertiary font-body">
      <span>{theme.emoji}</span>
      <span>{theme.name}</span>
      <span className="flex gap-0.5 ml-0.5">
        <span className="w-2.5 h-2.5 rounded-full border border-border/40" style={{ backgroundColor: theme.colors.primary }} />
        <span className="w-2.5 h-2.5 rounded-full border border-border/40" style={{ backgroundColor: theme.colors.surface }} />
      </span>
    </span>
  );
}
