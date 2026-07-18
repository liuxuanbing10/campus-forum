import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Play, Pause } from 'lucide-react';

export default function SignatureDemo() {
  const svgRef1 = useRef<SVGSVGElement>(null);
  const svgRef2 = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!svgRef1.current) return;
    const paths = Array.from(svgRef1.current.querySelectorAll('path'));
    // 1. 描边动画
    paths.forEach((path, i) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      path.style.filter = 'url(#glow-filter-1)';
      path.animate(
        [
          { strokeDashoffset: length, strokeWidth: '3' },
          { strokeDashoffset: 0, strokeWidth: '3.5', offset: 0.95 },
          { strokeDashoffset: 0, strokeWidth: '3' },
        ],
        {
          duration: 2000,
          delay: i * 300,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
        }
      );
    });
    // 2. 笔尖光点动画：一个发光的小圆点沿着每个路径移动
    const svg = svgRef1.current;
    paths.forEach((path, i) => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '6');
      dot.setAttribute('fill', '#fecdd3');
      dot.setAttribute('filter', 'url(#dot-glow-1)');
      svg.appendChild(dot);
      const duration = 2000;
      const delay = i * 300;
      // 用 Web Animations API 沿路径移动
      dot.animate(
        {
          offsetDistance: ['0%', '100%'],
          opacity: [0, 1, 1, 0],
        },
        {
          duration,
          delay,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
        }
      );
      dot.style.offsetPath = `path('${path.getAttribute('d')}')`;
    });
    // 3. 整体脉冲光晕
    const glowBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    glowBg.setAttribute('x', '0');
    glowBg.setAttribute('y', '0');
    glowBg.setAttribute('width', '300');
    glowBg.setAttribute('height', '100');
    glowBg.setAttribute('fill', 'url(#glow-gradient-1)');
    glowBg.style.opacity = '0';
    svg.insertBefore(glowBg, svg.firstChild);
    glowBg.animate(
      [{ opacity: 0 }, { opacity: 0.3, offset: 0.5 }, { opacity: 0 }],
      {
        duration: 3000,
        iterations: Infinity,
        direction: 'normal',
        easing: 'ease-in-out',
      }
    );
  }, []);

  useEffect(() => {
    if (!svgRef2.current) return;
    const paths = Array.from(svgRef2.current.querySelectorAll('path'));
    // 1. 描边动画 + 发光
    paths.forEach((path, i) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      path.style.filter = 'url(#glow-filter-2)';
      path.animate(
        [
          { strokeDashoffset: length, strokeWidth: '4' },
          { strokeDashoffset: 0, strokeWidth: '5', offset: 0.95 },
          { strokeDashoffset: 0, strokeWidth: '4' },
        ],
        {
          duration: 1500,
          delay: i * 200,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-out',
        }
      );
    });
    // 2. 笔尖光点
    const svg = svgRef2.current;
    paths.forEach((path, i) => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '5');
      dot.setAttribute('fill', '#fda4af');
      dot.setAttribute('filter', 'url(#dot-glow-2)');
      svg.appendChild(dot);
      dot.animate(
        {
          offsetDistance: ['0%', '100%'],
          opacity: [0, 1, 1, 0],
        },
        {
          duration: 1500,
          delay: i * 200,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-out',
        }
      );
      dot.style.offsetPath = `path('${path.getAttribute('d')}')`;
    });
  }, []);

  const togglePlay = () => {
    const state = isPlaying ? 'pause' : 'play';
    [svgRef1.current, svgRef2.current].forEach((svg) => {
      if (!svg) return;
      svg.querySelectorAll('path').forEach((p) => {
        p.getAnimations().forEach((anim) => anim[state]());
      });
    });
    setIsPlaying(!isPlaying);
  };

  const replay = () => {
    [svgRef1.current, svgRef2.current].forEach((svg) => {
      if (!svg) return;
      svg.querySelectorAll('path').forEach((p) => {
        p.getAnimations().forEach((anim) => {
          anim.cancel();
          anim.play();
        });
      });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          签名书写效果演示
        </h1>
        <p className="text-center text-gray-500 mb-8">
          基于 Web Animations API 的 SVG 路径描边动画
        </p>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow text-gray-700"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                暂停
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                播放
              </>
            )}
          </button>
          <button
            onClick={replay}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow text-gray-700"
          >
            <RefreshCw className="w-5 h-5" />
            重播
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">
              效果一：英文签名
            </h2>
            <div className="flex justify-center items-center h-40 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
              <svg
                ref={svgRef1}
                viewBox="0 0 300 100"
                className="w-full max-w-xs h-auto"
                fill="none"
                stroke="#e11d48"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <filter id="glow-filter-1" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="dot-glow-1" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="glow-gradient-1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fecdd3" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#fecdd3" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path d="M20,70 Q20,30 45,30 Q70,30 70,55 Q70,80 45,80 Q20,80 20,55 Q20,30 50,30" />
                <path d="M80,50 Q80,30 100,30 Q120,30 120,55 Q120,80 100,70" />
                <path d="M130,70 L130,30 Q130,20 145,20 Q160,20 160,35 L160,70" />
                <path d="M170,50 Q170,30 190,30 Q210,30 210,55 Q210,80 190,70 Q170,60 170,50" />
                <path d="M220,70 L220,30 L260,70 L260,30" />
                <path d="M270,50 Q270,25 285,25 Q300,25 300,50 Q300,75 285,75 Q270,75 270,50" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              SVG 路径描边动画，模拟签名书写过程
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">
              效果二：中文笔画
            </h2>
            <div className="flex justify-center items-center h-40 bg-gradient-to-r from-rose-50 to-amber-50 rounded-xl">
              <svg
                ref={svgRef2}
                viewBox="0 0 300 120"
                className="w-full max-w-xs h-auto"
                fill="none"
                stroke="#9f1239"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <filter id="glow-filter-2" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="dot-glow-2" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path d="M40,40 Q60,35 80,40 Q100,45 120,40" />
                <path d="M80,25 L80,95" />
                <path d="M55,60 Q80,70 105,60" />
                <path d="M60,80 Q80,85 100,80" />
                <path d="M160,30 Q180,25 200,30 Q220,35 240,30" />
                <path d="M200,20 L200,100" />
                <path d="M170,50 Q200,60 230,50" />
                <path d="M175,75 Q200,85 225,75" />
                <path d="M260,35 L280,35 L270,55 L250,55 L275,95" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              模拟中文笔画的书写顺序动画
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 md:col-span-2">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">
              效果三：逐字淡入（毛笔字体）
            </h2>
            <div ref={textRef} className="flex justify-center items-center h-32 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 rounded-xl">
              <div className="flex gap-2">
                {'指尖流淌星辰海'.split('').map((char, i) => (
                  <span
                    key={i}
                    className="char-animate text-3xl sm:text-4xl text-rose-700"
                    style={{
                      fontFamily: '"Ma Shan Zheng", "ZCOOL XiaoWei", cursive',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              逐字淡入 + 微小位移，配合手写字体（效果相对简单，但容易实现）
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 md:col-span-2">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">
              💡 方案说明
            </h2>
            <div className="space-y-4 text-gray-600">
              <div className="flex gap-3">
                <span className="text-rose-500 font-bold">方案一</span>
                <div>
                  <strong>SVG 路径描边 + anime.js（推荐）</strong>
                  <p className="text-sm text-gray-500">
                    效果最逼真，真正模拟笔画书写过程。需要先把文字转成 SVG 路径。
                    可以用 Figma、Adobe Illustrator 或在线工具生成。
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-amber-500 font-bold">方案二</span>
                <div>
                  <strong>逐字淡入 + 手写字体</strong>
                  <p className="text-sm text-gray-500">
                    实现最简单，用 CSS 动画逐字显示。效果是"逐字出现"而不是"笔画书写"，
                    但配合好的手写字体也很有感觉。
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-500 font-bold">方案三</span>
                <div>
                  <strong>Canvas 动态绘制</strong>
                  <p className="text-sm text-gray-500">
                    最灵活，可以模拟毛笔粗细变化、墨水滴落等特效。
                    但实现复杂度最高，需要准备笔画数据。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .char-animate {
          display: inline-block;
          opacity: 0;
          transform: translateY(10px) rotate(-3deg);
          animation: charIn 0.5s ease-out forwards infinite;
          text-shadow: 0 0 8px rgba(244, 63, 94, 0.4), 0 0 20px rgba(244, 63, 94, 0.2);
        }
        @keyframes charIn {
          0% {
            opacity: 0;
            transform: translateY(10px) rotate(-3deg) scale(0.8);
            text-shadow: 0 0 2px rgba(244, 63, 94, 0);
          }
          40% {
            opacity: 1;
            transform: translateY(0) rotate(0) scale(1.05);
            text-shadow: 0 0 15px rgba(244, 63, 94, 0.6), 0 0 30px rgba(244, 63, 94, 0.3);
          }
          50% {
            opacity: 1;
            transform: translateY(0) rotate(0) scale(1);
            text-shadow: 0 0 8px rgba(244, 63, 94, 0.4), 0 0 20px rgba(244, 63, 94, 0.2);
          }
          85% {
            opacity: 1;
            transform: translateY(0) rotate(0) scale(1);
            text-shadow: 0 0 8px rgba(244, 63, 94, 0.4), 0 0 20px rgba(244, 63, 94, 0.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-5px) rotate(2deg) scale(0.95);
            text-shadow: 0 0 2px rgba(244, 63, 94, 0);
          }
        }
      `}</style>
    </div>
  );
}
