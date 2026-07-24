import { useState, useEffect, useCallback, useRef } from 'react';

interface MeteorSignatureProps {
  lines: string[];
  className?: string;
}

const CHAR_DELAY = 60;

export default function MeteorSignature({ lines, className }: MeteorSignatureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const [done, setDone] = useState(false);
  const animatingRef = useRef(false);

  const typeText = useCallback(async () => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setDone(false);

    const newLines: string[] = [];
    setDisplayedLines([]);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let displayedLine = '';
      newLines.push('');
      setDisplayedLines([...newLines]);

      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        displayedLine += line[charIndex];
        newLines[lineIndex] = displayedLine;
        setDisplayedLines([...newLines]);

        const duration = CHAR_DELAY + Math.random() * 40;
        await new Promise((resolve) => setTimeout(resolve, duration));
      }

      if (lineIndex < lines.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    setDone(true);
    animatingRef.current = false;
  }, [lines]);

  useEffect(() => {
    const timer = setTimeout(() => {
      typeText();
    }, 500);
    return () => clearTimeout(timer);
  }, [typeText]);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [done]);

  return (
    <div ref={containerRef} className={className}>
      <div className="flex flex-col items-center">
        {displayedLines.map((line, lineIndex) => (
          <div
            key={lineIndex}
            className="flex items-center justify-center mb-3"
          >
            <span
              className="text-4xl sm:text-5xl md:text-6xl font-bold font-slogan text-campus-text-primary"
              style={{ lineHeight: 1.2 }}
            >
              {line}
            </span>
            {lineIndex === displayedLines.length - 1 && !done && showCursor && (
              <span
                className="ml-0.5 text-4xl sm:text-5xl md:text-6xl font-light text-primary"
                style={{ lineHeight: 1.2 }}
              >
                |
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
