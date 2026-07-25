import { motion } from 'framer-motion';

/**
 * 藻井装饰 - 4 层嵌套 + 中心发光 + 70s 旋转
 * 敦煌藻井穹顶效果
 */
export default function CaissonDecoration() {
  return (
    <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 160 160" className="w-full h-full">
          {/* 外层：八角星 */}
          <g
            stroke="var(--acc)"
            strokeWidth="1"
            fill="none"
            opacity="0.7"
            style={{ transformOrigin: '80px 80px' }}
          >
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * 45 - 90) * (Math.PI / 180);
              const a2 = ((i + 1) * 45 - 90) * (Math.PI / 180);
              const r1 = 70, r2 = 40;
              const x1 = 80 + r1 * Math.cos(a), y1 = 80 + r1 * Math.sin(a);
              const x2 = 80 + r2 * Math.cos(a2), y2 = 80 + r2 * Math.sin(a2);
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} L ${80} ${80} L ${x2} ${y2}`}
                  opacity="0.4"
                />
              );
            })}
          </g>

          {/* 第二层：莲花八瓣 */}
          <g
            stroke="var(--acc2)"
            strokeWidth="0.8"
            fill="var(--card)"
            opacity="0.7"
          >
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * 45) * (Math.PI / 180);
              const cx = 80 + 35 * Math.cos(a);
              const cy = 80 + 35 * Math.sin(a);
              return (
                <ellipse
                  key={i}
                  cx={cx}
                  cy={cy}
                  rx="14"
                  ry="6"
                  transform={`rotate(${i * 45} ${cx} ${cy})`}
                />
              );
            })}
          </g>

          {/* 第三层：星点 */}
          <g fill="var(--slogc)">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * 30) * (Math.PI / 180);
              const r = 22;
              return (
                <circle
                  key={i}
                  cx={80 + r * Math.cos(a)}
                  cy={80 + r * Math.sin(a)}
                  r="1.6"
                />
              );
            })}
          </g>

          {/* 中心：发光球 */}
          <circle cx="80" cy="80" r="12" fill="var(--acc)" opacity="0.4" />
          <circle cx="80" cy="80" r="6" fill="var(--slogc)">
            <animate
              attributeName="r"
              values="5;7;5"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </motion.div>

      {/* 光晕 */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--glow), transparent 60%)',
        }}
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
