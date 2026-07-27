import { useEffect, useRef, useState } from 'react';
import { FlowingYearsCompass } from './FlowingYearsScene';
import FlowingYearsReadout from './FlowingYearsReadout';

/**
 * 流年拾光 · 场景容器（完整复刻参考视觉效果）
 *
 * 包含：大罗盘（量一日）+ 标题 + 时辰读数 + 点击提示
 * position: relative · min-height: 100vh · 跟随页面滚动
 */
export default function FlowingYearsHero() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setLoaded(true);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const titleChars = ['流', '年', '拾', '光'];

  return (
    <section
      ref={containerRef}
      className={loaded ? 'fy-hero-loaded' : ''}
      style={{
        position: 'relative',
        minHeight: 'max(100vh, 880px)',
        overflow: 'hidden',
        cursor: 'crosshair',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <style>{`
        /* ── 流年拾光 · 场景内样式 ── */
        .fy-hero-title-en {
          position: absolute;
          left: -32px;
          top: 8px;
          writing-mode: vertical-rl;
          font-size: 9px;
          letter-spacing: 0.52em;
          color: #9db4a3;
          opacity: 0.55;
          font-family: 'ZCOOL XiaoWei', serif;
        }
        .fy-hero-vtitle {
          writing-mode: vertical-rl;
          font-family: 'Ma Shan Zheng', 'Kaiti SC', 'STKaiti', serif;
          font-weight: 400;
          font-size: min(clamp(54px, 8.6vw, 118px), 10vh);
          line-height: 1.12;
          letter-spacing: 0.16em;
          color: #e8c56b;
          text-shadow: 0 0 26px rgba(232, 197, 107, 0.3), 0 2px 22px rgba(7, 17, 11, 0.9);
          transition: color 0.4s, text-shadow 0.4s;
        }
        .fy-hero-vtitle:hover {
          color: #ffd97e;
          text-shadow: 0 0 36px rgba(255, 217, 126, 0.85);
        }
        .fy-hero-vtitle span {
          display: inline;
          opacity: 0;
          transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .fy-hero-loaded .fy-hero-vtitle span { opacity: 1; }
        .fy-hero-vtitle span:nth-child(1) { transition-delay: 0.15s; }
        .fy-hero-vtitle span:nth-child(2) { transition-delay: 0.31s; }
        .fy-hero-vtitle span:nth-child(3) { transition-delay: 0.47s; }
        .fy-hero-vtitle span:nth-child(4) { transition-delay: 0.63s; }

        .fy-hero-seal {
          margin-top: 28px;
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(232, 197, 107, 0.85);
          background: linear-gradient(155deg, #173a29, #0f2818);
          box-shadow: inset 0 0 0 3px #0c1d12, inset 0 0 0 4px rgba(232, 197, 107, 0.5), 0 0 18px rgba(232, 197, 107, 0.15);
          transform: rotate(-3deg) scale(0.6);
          opacity: 0;
          transition: transform 0.8s cubic-bezier(0.3, 1.4, 0.4, 1) 1.1s, box-shadow 0.4s, opacity 0.4s;
        }
        .fy-hero-loaded .fy-hero-seal { opacity: 1; transform: rotate(-3deg) scale(1); }
        .fy-hero-seal:hover {
          transform: rotate(0deg) scale(1.06) !important;
          box-shadow: inset 0 0 0 3px #0c1d12, inset 0 0 0 4px rgba(255, 217, 126, 0.8), 0 0 26px rgba(232, 197, 107, 0.4);
        }
        .fy-hero-seal b {
          writing-mode: vertical-rl;
          font-family: 'ZCOOL XiaoWei', serif;
          font-weight: 400;
          font-size: 19px;
          letter-spacing: 4px;
          color: #ffd97e;
        }

        .fy-hero-hint {
          position: absolute;
          left: 58%;
          bottom: 26px;
          transform: translateX(-50%);
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          letter-spacing: 0.4em;
          color: #9db4a3;
          font-family: 'ZCOOL XiaoWei', serif;
          opacity: 0;
          transition: opacity 1s ease 3.4s;
        }
        .fy-hero-loaded .fy-hero-hint { opacity: 1; }
        .fy-hero-hint i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ffd97e;
          box-shadow: 0 0 10px rgba(255, 217, 126, 0.9);
          animation: fyBlink 1.6s ease-in-out infinite;
        }
        @keyframes fyBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        .fy-hero-moon {
          position: absolute;
          top: 8vh;
          right: 23vw;
          width: 100px;
          height: 100px;
          border: 1px solid rgba(232, 197, 107, 0.26);
          border-radius: 50%;
          background: radial-gradient(circle at 42% 38%, rgba(255, 230, 160, 0.14), transparent 68%);
          animation: fyMoonBreath 8s ease-in-out infinite;
          pointer-events: none;
        }
        .fy-hero-moon i {
          position: absolute;
          top: -3px;
          left: 50%;
          width: 5px;
          height: 5px;
          margin-left: -2.5px;
          border-radius: 50%;
          background: #ffd97e;
          box-shadow: 0 0 10px rgba(255, 217, 126, 0.9);
        }
        @keyframes fyMoonBreath {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        @media (max-width: 860px) {
          .fy-hero-title-col { left: 16px; top: 9vh; }
          .fy-hero-title-en { display: none; }
          .fy-hero-vtitle { font-size: clamp(42px, 11vw, 60px); }
          .fy-hero-seal { width: 40px; height: 40px; margin-top: 18px; }
          .fy-hero-seal b { font-size: 15px; }
          .fy-hero-moon { right: 7vw; top: 6vh; width: 60px; height: 60px; }
          .fy-hero-hint { left: 50%; bottom: auto; top: 46vh; }
        }
      `}</style>

      {/* 月亮 */}
      <div className="fy-hero-moon" aria-hidden="true">
        <i></i>
      </div>

      {/* 罗盘发光层 + 大罗盘 */}
      <FlowingYearsCompass />

      {/* 左侧：标题 + 印章 */}
      <div
        style={{
          position: 'absolute',
          left: 'clamp(44px,7vw,110px)',
          top: '16vh',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span className="fy-hero-title-en">GATHERED LIGHT · FLEETING YEARS</span>
        <h1 className="fy-hero-vtitle">
          {titleChars.map((ch, i) => (
            <span key={i} style={{ transitionDelay: `${0.15 + i * 0.16}s` }}>
              {ch}
            </span>
          ))}
        </h1>
        <div className="fy-hero-seal">
          <b>拾光</b>
        </div>
      </div>

      {/* 时辰读数（左下） */}
      <FlowingYearsReadout />

      {/* 点击提示 */}
      <div className="fy-hero-hint" aria-hidden="true">
        <i></i>
        点击任意处 · 拾起一点光
      </div>
    </section>
  );
}
