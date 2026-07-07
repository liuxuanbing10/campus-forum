import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';
import { MessageCircle, BookOpen, Music, Users, GraduationCap, Trophy, Heart, Star } from 'lucide-react';

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  post_count: number;
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

export default function HomePage() {
  const { user, loading } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [sloganDone, setSloganDone] = useState(false);

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

  if (loading) {
    return <div className="text-center py-12 text-campus-text-tertiary font-handwrite text-lg">加载中...</div>;
  }

  return (
    <div className="page-enter">
      <div className="relative py-16 sm:py-20 px-4 bg-gradient-to-b from-primary-light/50 to-surface text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="ink-blob ink-blob-1" />
          <div className="ink-blob ink-blob-2" />
          <div className="ink-blob ink-blob-3" />
          <div className="ink-blob ink-blob-4" />
        </div>
        {/* 标语：手写动画 */}
        <h1 className="relative z-10 font-slogan text-4xl sm:text-5xl md:text-6xl text-campus-text-primary leading-tight">
          <span className={`slogan-write ${sloganDone ? 'slogan-write-done' : ''}`}>
            独行快，众行远
          </span>
        </h1>
        {/* 副标语：手写字体 + 延迟渐入 */}
        <p className="relative z-10 text-xl text-campus-text-secondary font-handwrite max-w-2xl mx-auto mt-6 text-fade-in text-fade-in-delay-1">
          一个人的疑惑，一群人的答案
        </p>
      </div>

      {user ? (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="absolute w-96 h-96 -top-10 -left-20 rounded-full bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300 blur-3xl opacity-30" />
            <div className="absolute w-80 h-80 top-20 -right-10 rounded-full bg-gradient-to-br from-yellow-200 via-orange-300 to-pink-300 blur-3xl opacity-30" />
            <div className="absolute w-72 h-72 bottom-0 left-1/3 rounded-full bg-gradient-to-br from-green-200 via-teal-300 to-cyan-300 blur-3xl opacity-30" />
          </div>
          {boardsLoading ? (
            <div className="flex gap-5 overflow-x-auto pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-72 bg-surface border border-border rounded-xl p-8 animate-pulse">
                  <div className="w-12 h-12 bg-primary-light rounded-xl mb-4" />
                  <div className="h-6 w-24 bg-primary-light rounded mb-3" />
                  <div className="h-4 w-full bg-primary-light rounded" />
                </div>
              ))}
            </div>
          ) : boards.length > 0 ? (
            <div className="relative rounded-3xl overflow-hidden glass-liquid p-6 sm:p-8">
              <div className="glass-highlight" />
              <div className="glass-inner-shadow" />
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl opacity-60">
                <div className="ink-blob ink-blob-section-1" />
                <div className="ink-blob ink-blob-section-2" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-6">
                <h2 className="font-handwrite text-2xl sm:text-3xl text-campus-text-primary text-fade-in">
                  探索板块
                </h2>
                {canScroll && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-campus-text-tertiary font-handwrite text-fade-in text-fade-in-delay-1">
                    左右滚动浏览
                  </span>
                )}
              </div>

              <div className="relative z-10">
                <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-32 bg-gradient-to-r from-surface via-surface/80 to-transparent pointer-events-none z-20" />
                <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-32 bg-gradient-to-l from-surface via-surface/80 to-transparent pointer-events-none z-20" />

                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  tabIndex={0}
                  className="flex items-center overflow-x-auto scroll-smooth py-8 px-8 sm:px-16 scrollbar-hide snap-x snap-mandatory focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
                  aria-label="板块轮播，使用左右方向键导航"
                >
                  <div className="flex-shrink-0 w-[calc(50%-7rem)] sm:w-[calc(50%-8rem)]" />

                  {boards.map((board, index) => (
                    <a
                      key={board.id}
                      href={`/board/${board.id}`}
                      className="carousel-card card-enter relative w-64 sm:w-72 flex flex-col items-start p-6 sm:p-7 rounded-2xl transition-all duration-500 ease-out snap-center -mx-4 sm:-mx-6 overflow-hidden glass-card cursor-pointer"
                      style={{
                        ...getCardStyle(index),
                        animationDelay: `${index * 0.08}s`,
                      }}
                    >
                      <div className="relative z-10 text-primary mb-4">
                        {iconMap[board.icon] || defaultIcon}
                      </div>
                      <h3 className="relative z-10 font-handwrite text-xl font-semibold text-campus-text-primary mb-2">
                        {board.name}
                      </h3>
                      <p className="relative z-10 text-sm text-campus-text-secondary font-handwrite mb-5 flex-1 leading-relaxed">
                        {board.description}
                      </p>
                      <span className="relative z-10 text-xs font-medium text-campus-text-tertiary font-body">
                        {board.post_count} 帖子
                      </span>
                    </a>
                  ))}

                  <div className="flex-shrink-0 w-[calc(50%-8rem)] sm:w-[calc(50%-9rem)]" />
                </div>
              </div>

              <div className="relative z-10 flex justify-center gap-2 mt-4">
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
        </div>
      ) : (
        <div className="text-center py-12 text-campus-text-secondary">
          <p className="text-xl font-handwrite">请登录或注册以参与讨论。</p>
        </div>
      )}

      <style>{`
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
      `}</style>
    </div>
  );
}
