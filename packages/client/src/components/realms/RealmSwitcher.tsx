import { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import { useRealm } from './RealmProvider';
import { REALMS, type RealmId } from '../../stores/theme';

/**
 * 渡船 · 十三境 GSAP 径向菜单
 * 右下角四分之一圆：正上(270°)→正左(180°)
 * 点击触发，hover 推挤展开
 */
const RADIUS = 220;
const DOT = 18;

export default function RealmSwitcher() {
  const { realm, setRealm } = useRealm();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [hovered, setHovered] = useState<string | null>(null);

  const getCenter = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return { x: window.innerWidth - 35, y: window.innerHeight - 35 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  // 弧上位置 + 推挤偏移
  const getPos = useCallback((idx: number, total: number, c: { x: number; y: number }, hoverIdx: number | null) => {
    const baseAngle = Math.PI * (1.5 - (idx / (total - 1)) * 0.5);
    let angleOff = 0;
    if (hoverIdx !== null && idx !== hoverIdx) {
      const dist = Math.abs(idx - hoverIdx);
      if (dist < 5) {
        const strength = (1 - dist / 5) * (1 - dist / 5);
        angleOff = Math.sign(hoverIdx - idx) * strength * 0.07;
      }
    }
    const angle = baseAngle + angleOff;
    const r = hoverIdx === idx ? RADIUS + 18 : RADIUS;
    const tx = Math.cos(angle) * r;
    const ty = Math.sin(angle) * r;
    return { left: c.x + tx - DOT / 2, top: c.y + ty - DOT / 2 };
  }, []);

  // hover 缩放
  const getScale = useCallback((idx: number, hoverIdx: number | null) => {
    if (hoverIdx === null) return 1;
    if (idx === hoverIdx) return 3.0;
    const dist = Math.abs(idx - hoverIdx);
    if (dist === 1) return 0.7;
    if (dist === 2) return 0.85;
    if (dist === 3) return 0.95;
    return 1;
  }, []);

  const animateOpen = useCallback(() => {
    const c = getCenter();
    const others = REALMS.filter(r => r.id !== realm.id);
    others.forEach((r, idx) => {
      const el = itemsRef.current.get(r.id);
      if (!el) return;
      const pos = getPos(idx, others.length, c, null);
      el.style.left = (c.x - DOT / 2) + 'px';
      el.style.top = (c.y - DOT / 2) + 'px';
      el.style.position = 'fixed';
      el.style.zIndex = '50';
      el.style.pointerEvents = 'none';
      el.style.opacity = '0';
      gsap.fromTo(el,
        { scale: 0.1, opacity: 0 },
        { left: pos.left, top: pos.top, scale: 1, opacity: 1,
          duration: 0.5, ease: 'elastic.out(1, 0.35)',
          delay: idx * 0.03,
          onComplete: () => { el.style.pointerEvents = 'auto'; },
        }
      );
    });
  }, [getCenter, realm.id, getPos]);

  // hover 推挤
  useEffect(() => {
    if (!open) return;
    const c = getCenter();
    const others = REALMS.filter(r => r.id !== realm.id);
    const hIdx = hovered ? others.findIndex(r => r.id === hovered) : -1;
    others.forEach((r, idx) => {
      const el = itemsRef.current.get(r.id);
      if (!el) return;
      const isHov = r.id === hovered;
      const hi = isHov ? idx : (hIdx >= 0 ? hIdx : null);
      const scale = getScale(idx, hi);
      const pos = getPos(idx, others.length, c, hi);
      gsap.to(el, {
        left: pos.left, top: pos.top,
        scale,
        duration: 0.35, ease: 'elastic.out(1, 0.3)',
      });
      el.style.zIndex = isHov ? '60' : '50';
    });
  }, [hovered, open, getCenter, realm.id, getPos, getScale]);

  const animateClose = useCallback(() => {
    const c = getCenter();
    REALMS.forEach(r => {
      const el = itemsRef.current.get(r.id);
      if (!el || r.id === realm.id) return;
      gsap.to(el, {
        left: c.x - DOT / 2, top: c.y - DOT / 2,
        scale: 0.05, opacity: 0,
        duration: 0.2, ease: 'power2.in',
      });
    });
    setTimeout(() => setOpen(false), 250);
  }, [getCenter, realm.id]);

  const toggle = () => {
    if (open) animateClose();
    else setOpen(true);
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => requestAnimationFrame(() => animateOpen()));
  }, [open, animateOpen]);

  const selectRealm = (id: string) => {
    animateClose();
    setTimeout(() => setRealm(id as RealmId), 300);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      let isItem = false;
      itemsRef.current.forEach(el => { if (el.contains(e.target as Node)) isItem = true; });
      if (!isItem) animateClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, animateClose]);

  return (
    <div className="fixed bottom-5 right-5 z-30 select-none">
      <style>{`@keyframes fyPulseGlow { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:0.8; transform:scale(1.08); } }`}</style>

      {open && REALMS.filter(r => r.id !== realm.id).map((r) => {
        const idx = REALMS.indexOf(r);
        const hue = (idx / REALMS.length) * 360;
        const isHov = hovered === r.id;
        return (
          <button
            key={r.id}
            ref={(el) => { if (el) itemsRef.current.set(r.id, el); }}
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => selectRealm(r.id)}
            className="fixed rounded-full border-0 cursor-pointer"
            style={{
              width: DOT, height: DOT,
              left: 0, top: 0,
              opacity: 0,
              pointerEvents: 'none',
              background: `radial-gradient(circle at 35% 30%, hsl(${hue}, 65%, 78%), hsl(${hue}, 50%, 58%))`,
              boxShadow: isHov
                ? `0 0 24px hsla(${hue}, 60%, 70%, 0.6), 0 0 60px hsla(${hue}, 60%, 70%, 0.25), inset 0 -2px 4px hsla(0,0%,0%,0.2)`
                : `0 2px 6px hsla(0,0%,0%,0.25), inset 0 -1px 2px hsla(0,0%,0%,0.15)`,
              border: 'none',
            }}
          >
            <span
              className="absolute inset-0 flex items-center justify-center text-white font-bold"
              style={{
                fontFamily: 'var(--disp)',
                fontSize: '9px',
                lineHeight: '1.1',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                opacity: isHov ? 1 : 0,
                transition: 'opacity 0.2s ease 0.08s',
              }}
            >
              {r.name.replace(/[·•]/g, '').slice(0, 3)}
            </span>
          </button>
        );
      })}

      {/* 触发按钮 */}
      <button
        ref={triggerRef}
        onClick={toggle}
        className="flex items-center justify-center rounded-full border-0 bg-[var(--card)]/90 backdrop-blur-sm shadow-float hover:scale-105 active:scale-95 transition-all cursor-pointer"
        style={{ width: 52, height: 52 }}
        title={`${realm.name} · 第 ${realm.idx} 境`}
      >
        <span
          className="block rounded-full"
          style={{
            width: 22, height: 22,
            background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
            boxShadow: '0 0 20px var(--glow), 0 0 50px var(--glow)',
          }}
        />
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 48, height: 48,
            border: '2px solid var(--acc)',
            boxShadow: '0 0 20px var(--glow), inset 0 0 20px var(--glow)',
            opacity: 0.6,
            animation: 'fyPulseGlow 2.5s ease-in-out infinite',
          }}
        />
      </button>
    </div>
  );
}
