import { useEffect, useRef, useState } from 'react';

const SC = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 流年拾光 · 左下角时辰读数（纯文字，垂直布局）
 * 严格复刻效果图 .readout 样式
 * absolute 定位，跟随页面滚动
 */
export default function FlowingYearsReadout() {
  const [now, setNow] = useState(new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [grown, setGrown] = useState(false);

  // 时钟跳动
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 500);
    return () => clearInterval(t);
  }, []);

  // 进入视口时播放淡入动画
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setGrown(false);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setGrown(true));
          });
        }
      });
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const CN = '〇一二三四五六七八九';
  const fmtDate = (d: Date) => {
    const y = String(d.getFullYear()).split('').map(c => CN[+c]).join('');
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const mC = m < 10 ? CN[m] : m === 10 ? '十' : m === 11 ? '十一' : '十二';
    const t9 = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    let dC: string;
    if (day < 10) dC = '初' + t9[day];
    else if (day === 10) dC = '初十';
    else if (day < 20) dC = '十' + t9[day - 10];
    else if (day === 20) dC = '二十';
    else if (day < 30) dC = '廿' + t9[day - 20];
    else dC = '三十';
    return `${y}年${mC}月${dC} · 星期${'日一二三四五六'[d.getDay()]}`;
  };

  const h = now.getHours();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const name = SC[Math.floor(((h + 1) % 24) / 2)] + '时';

  return (
    <div
      ref={containerRef}
      className={grown ? 'fy-ro-grown' : ''}
      style={{
        position: 'absolute',
        left: 'clamp(20px,3.5vw,52px)',
        bottom: 'clamp(18px,5vh,48px)',
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        .fy-ro-tag {
          font-family: 'ZCOOL XiaoWei', serif;
          font-size: 10px;
          letter-spacing: 0.42em;
          color: #9db4a3;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transition: opacity 0.8s ease 0.2s;
        }
        .fy-ro-tag::after {
          content: '';
          width: 26px;
          height: 1px;
          background: rgba(232, 197, 107, 0.4);
        }
        .fy-ro-shichen {
          font-family: 'ZCOOL XiaoWei', serif;
          font-size: 26px;
          letter-spacing: 0.3em;
          color: #ffd97e;
          text-shadow: 0 0 16px rgba(255, 217, 126, 0.45), 0 2px 14px rgba(7, 17, 11, 0.9);
          opacity: 0;
          transition: opacity 0.8s ease 0.4s;
        }
        .fy-ro-clock {
          font-size: 14px;
          letter-spacing: 0.24em;
          color: #9db4a3;
          font-variant-numeric: tabular-nums;
          opacity: 0;
          transition: opacity 0.8s ease 0.6s;
        }
        .fy-ro-date {
          font-size: 11px;
          letter-spacing: 0.34em;
          color: #6f9c82;
          opacity: 0;
          transition: opacity 0.8s ease 0.8s;
        }
        .fy-ro-grown .fy-ro-tag,
        .fy-ro-grown .fy-ro-shichen,
        .fy-ro-grown .fy-ro-clock,
        .fy-ro-grown .fy-ro-date {
          opacity: 1;
        }
      `}</style>
      <span className="fy-ro-tag">第一把尺子 · 量一日</span>
      <span className="fy-ro-shichen">{name}</span>
      <span className="fy-ro-clock">{timeStr}</span>
      <span className="fy-ro-date">{fmtDate(now)}</span>
    </div>
  );
}
