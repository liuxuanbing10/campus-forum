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
    };
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div>
      {/* Hero Section — 精神理念 */}
      <div className="relative py-16 sm:py-20 px-4 bg-gradient-to-b from-primary-50/50 to-surface text-center overflow-hidden">
        {/* 水墨晕染背景 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="ink-blob ink-blob-1" />
          <div className="ink-blob ink-blob-2" />
          <div className="ink-blob ink-blob-3" />
          <div className="ink-blob ink-blob-4" />
        </div>
        <h1 className="relative z-10 font-display text-3xl sm:text-4xl md:text-5xl font-bold text-campus-text-primary leading-tight">
          独行快，众行远
        </h1>
        <p className="relative z-10 text-lg text-campus-text-secondary font-body max-w-2xl mx-auto mt-4">
          一个人的疑惑，一群人的答案
        </p>
      </div>

      {/* Board Section */}
      {user ? (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-hidden">
          {/* 背景水彩晕染 — 为玻璃效果提供色彩背景 */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="absolute w-96 h-96 -top-10 -left-20 rounded-full bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300 blur-3xl opacity-30" />
            <div className="absolute w-80 h-80 top-20 -right-10 rounded-full bg-gradient-to-br from-yellow-200 via-orange-300 to-pink-300 blur-3xl opacity-30" />
            <div className="absolute w-72 h-72 bottom-0 left-1/3 rounded-full bg-gradient-to-br from-green-200 via-teal-300 to-cyan-300 blur-3xl opacity-30" />
          </div>
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
            <div className="relative rounded-3xl overflow-hidden glass-liquid p-6 sm:p-8">
              {/* 玻璃高光 */}
              <div className="glass-highlight" />
              {/* 玻璃内阴影 */}
              <div className="glass-inner-shadow" />
              {/* 水彩装饰 */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl opacity-60">
                <div className="ink-blob ink-blob-section-1" />
                <div className="ink-blob ink-blob-section-2" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-6">
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
              <div className="relative z-10">
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
                      className="carousel-card card-enter relative w-64 sm:w-72 flex flex-col items-start p-6 sm:p-7 rounded-2xl transition-all duration-500 ease-out snap-center -mx-8 sm:-mx-10 overflow-hidden glass-card"
                      style={{
                        ...getCardStyle(index),
                        animationDelay: `${index * 0.08}s`,
                      }}
                    >
                      <span className="relative z-10 text-4xl mb-4">{board.icon}</span>
                      <h3 className="relative z-10 font-body text-lg font-semibold text-campus-text-primary mb-2">
                        {board.name}
                      </h3>
                      <p className="relative z-10 text-sm text-campus-text-secondary font-body mb-5 flex-1 leading-relaxed">
                        {board.description}
                      </p>
                      <span className="relative z-10 text-xs font-medium text-campus-text-tertiary font-body">
                        {board.post_count} 帖子
                      </span>
                    </a>
                  ))}

                  {/* Right spacer for centering last card */}
                  <div className="flex-shrink-0 w-[calc(50%-8rem)] sm:w-[calc(50%-9rem)]" />
                </div>
              </div>

              {/* Indicator dots */}
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

              {/* Mobile hint */}
              {canScroll && (
                <div className="relative z-10 flex sm:hidden justify-center mt-2">
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
        /* 水彩晕染效果 */
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

        /* 液态玻璃效果 */
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

        /* 玻璃卡片 */
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
