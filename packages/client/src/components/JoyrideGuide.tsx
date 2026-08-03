/** @file JoyrideGuide 新手引导组件 */
import { useEffect, useRef, useState } from 'react';
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride';

interface JoyrideGuideProps {
  steps: Step[];
  enabled: boolean;
  continuous?: boolean;
  runKey?: string;
  callback?: (data: EventData) => void;
}

export function JoyrideGuide({ steps, enabled, continuous = false, runKey = 'tour_completed', callback }: JoyrideGuideProps) {
  const [run, setRun] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    const stored = localStorage.getItem(runKey);
    if (!stored) {
      startedRef.current = true;
      setRun(true);
    }
  }, [enabled, runKey]);

  const handleEvent = (data: EventData) => {
    const { status } = data;
    if ((status === STATUS.FINISHED || status === STATUS.SKIPPED) && !localStorage.getItem(runKey)) {
      localStorage.setItem(runKey, 'true');
    }
    callback?.(data);
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={continuous}
      onEvent={handleEvent}
      styles={{
        overlay: {
          backgroundColor: 'rgba(0,0,0,0.5)',
        },
        buttonPrimary: {
          backgroundColor: '#f97316',
          borderRadius: 8,
          padding: '8px 24px',
        },
        buttonSkip: {
          color: '#9ca3af',
        },
        tooltipContainer: {
          textAlign: 'center',
        },
      }}
    />
  );
}
