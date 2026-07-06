import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  post_count: number;
}

export default function HomePage() {
  const { user, loading } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    api.get('/boards')
      .then((res) => setBoards(res.data))
      .catch(() => {})
      .finally(() => setBoardsLoading(false));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 4);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [boards]);

  const handleScroll = () => {
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
  };

  const scrollToCard = (index: number) => {
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
  };

  const getCardStyle = (index: number): React.CSSProperties => {
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
      boxShadow: absOffset === 0
        ? '0 20px 40px rgba(0, 0, 0, 0.12)'
        : absOffset === 1
        ? '0 10px 25px rgba(0, 0, 0, 0.08)'
        : '0 4px 12px rgba(0, 0, 0, 0.04)',
    };
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div>
      {/* Hero Section — 精神理念 */}
      <div className="py-16 sm:py-20 px-4 bg-gradient-to-b from-primary-50/50 to-surface text-center">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-campus-text-primary leading-tight">
          独行快，众行远
        </h1>
        <p className="text-lg text-campus-text-secondary font-body max-w-2xl mx-auto mt-4">
          一个人的疑惑，一群人的答案
        </p>
      </div>

      {/* Board Section */}
      {user ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {boardsLoading ? (
            <div className="flex gap-5 overflow-x-auto pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-72 bg-surface border border-border rounded-lg p-8 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mb-3" />
                  <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : boards.length > 0 ? (
            <div className="relative rounded-2xl bg-gradient-to-br from-primary-light/25 via-surface to-primary-light/10 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl sm:text-2xl text-campus-text-primary">
                  探索板块
                </h2>
                {canScroll && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-campus-text-tertiary font-body">
                    左右滚动浏览
                  </span>
                )}
              </div>

              {/* Carousel container */}
              <div className="relative">
                {/* Left gradient mask */}
                <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-32 bg-gradient-to-r from-surface via-surface/80 to-transparent pointer-events-none z-20" />
                {/* Right gradient mask */}
                <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-32 bg-gradient-to-l from-surface via-surface/80 to-transparent pointer-events-none z-20" />

                {/* Scroll container */}
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex items-center overflow-x-auto scroll-smooth py-8 px-8 sm:px-16 -mx-2 scrollbar-hide snap-x snap-mandatory"
                >
                  {/* Left spacer for centering first card */}
                  <div className="flex-shrink-0 w-[calc(50%-7rem)] sm:w-[calc(50%-8rem)]" />

                  {boards.map((board, index) => (
                    <a
                      key={board.id}
                      href={`/board/${board.id}`}
                      className="carousel-card card-enter w-64 sm:w-72 flex flex-col items-start p-6 sm:p-7 bg-surface border border-border rounded-xl transition-all duration-500 ease-out snap-center -mx-8 sm:-mx-10"
                      style={{
                        ...getCardStyle(index),
                        animationDelay: `${index * 0.08}s`,
                      }}
                    >
                      <span className="text-4xl mb-4">{board.icon}</span>
                      <h3 className="font-body text-lg font-semibold text-campus-text-primary mb-2">
                        {board.name}
                      </h3>
                      <p className="text-sm text-campus-text-secondary font-body mb-5 flex-1 leading-relaxed">
                        {board.description}
                      </p>
                      <span className="text-xs font-medium text-campus-text-tertiary font-body">
                        {board.post_count} 帖子
                      </span>
                    </a>
                  ))}

                  {/* Right spacer for centering last card */}
                  <div className="flex-shrink-0 w-[calc(50%-8rem)] sm:w-[calc(50%-9rem)]" />
                </div>
              </div>

              {/* Indicator dots */}
              <div className="flex justify-center gap-2 mt-4">
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

              {/* Mobile hint */}
              {canScroll && (
                <div className="flex sm:hidden justify-center mt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-campus-text-tertiary font-medium font-body animate-scroll-hint">
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
              <p className="text-lg font-body">暂无板块数据</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-campus-text-secondary">
          <p className="text-lg font-body">请登录或注册以参与讨论。</p>
        </div>
      )}

      {/* Custom animations */}
      <style>{`
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
