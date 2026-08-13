import React, { useState, useEffect, useRef } from 'react';
import { Award } from 'lucide-react';

/**
 * Checks if the user prefers reduced motion.
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook: animates a number from 0 → target over `duration` ms.
 * Respects prefers-reduced-motion.
 */
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let raf;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) {
          raf = requestAnimationFrame(step);
        }
      };
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}

/**
 * Circular SVG progress ring.
 */
function ScoreRing({ score, color, theme }) {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [offset, setOffset] = useState(circumference);
  const animatedScore = useCountUp(score, 1400);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setOffset(circumference - (score / 100) * circumference);
      return;
    }
    // Small delay so the ring starts after mount
    const timeout = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 100);
    return () => clearTimeout(timeout);
  }, [score, circumference]);

  const trackColor =
    theme === 'cyberpunk'
      ? 'rgba(6, 182, 212, 0.15)'
      : theme === 'minimal'
      ? '#e7e5e4'
      : '#e2e8f0';

  const textColor =
    theme === 'cyberpunk'
      ? '#22d3ee'
      : theme === 'minimal'
      ? '#44403c'
      : '#1e293b';

  const subTextColor =
    theme === 'cyberpunk'
      ? '#67e8f9'
      : theme === 'minimal'
      ? '#78716c'
      : '#64748b';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ overflow: 'visible' }}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: prefersReducedMotion()
                ? 'none'
                : 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>
        {/* Score text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ color: textColor }}
        >
          <span className="text-3xl font-bold leading-none">{animatedScore}</span>
          <span
            className="text-xs font-semibold opacity-60 mt-0.5"
            style={{ color: subTextColor }}
          >
            / 100
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * A single breakdown bar row.
 */
function BreakdownBar({ label, score, color, theme, delay = 0 }) {
  const [width, setWidth] = useState(0);
  const animatedScore = useCountUp(score, 1000, delay);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setWidth(score);
      return;
    }
    const timeout = setTimeout(() => setWidth(score), 100 + delay);
    return () => clearTimeout(timeout);
  }, [score, delay]);

  const barBg =
    theme === 'cyberpunk'
      ? 'rgba(6, 182, 212, 0.12)'
      : theme === 'minimal'
      ? '#e7e5e4'
      : '#e2e8f0';

  const textColor =
    theme === 'cyberpunk'
      ? '#a5f3fc'
      : theme === 'minimal'
      ? '#57534e'
      : '#475569';

  const numColor =
    theme === 'cyberpunk'
      ? '#22d3ee'
      : theme === 'minimal'
      ? '#44403c'
      : '#334155';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs font-medium">
        <span style={{ color: textColor }}>{label}</span>
        <span className="font-bold tabular-nums" style={{ color: numColor }}>
          {animatedScore}
        </span>
      </div>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: barBg }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            transition: prefersReducedMotion()
              ? 'none'
              : `width 1s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * DeveloperScore section component.
 *
 * Props:
 *   scoreData   — { overall, breakdown, label } from calculateDeveloperScore
 *   theme       — "professional" | "cyberpunk" | "minimal"
 *   currentTheme — themeStyles[theme] object
 */
export default function DeveloperScore({ scoreData, theme, currentTheme }) {
  if (!scoreData) return null;

  const { overall, breakdown, label } = scoreData;

  const labelColor =
    theme === 'cyberpunk'
      ? '#67e8f9'
      : theme === 'minimal'
      ? '#78716c'
      : '#64748b';

  const categories = [
    { key: 'repoQuality', label: 'Repository Quality' },
    { key: 'communityImpact', label: 'Community Impact' },
    { key: 'consistency', label: 'Consistency' },
    { key: 'community', label: 'Community' },
    { key: 'techDiversity', label: 'Tech Diversity' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
        <Award className="w-3.5 h-3.5" /> Developer Score
      </h3>

      <div className={`p-4 rounded-lg ${currentTheme.cardInner}`}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Ring */}
          <div className="shrink-0">
            <ScoreRing
              score={overall}
              color={currentTheme.accent}
              theme={theme}
            />
            {/* Label */}
            <p
              className="text-[11px] font-semibold text-center mt-2 uppercase tracking-wider"
              style={{ color: labelColor }}
            >
              {label}
            </p>
          </div>

          {/* Breakdown */}
          <div className="flex-1 w-full space-y-2.5">
            {categories.map((cat, i) => (
              <BreakdownBar
                key={cat.key}
                label={cat.label}
                score={breakdown[cat.key]}
                color={currentTheme.accent}
                theme={theme}
                delay={i * 120}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
