import React, { useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import { getOrCreateSessionId, sendHeartbeat, sendLeaveBeacon } from './visitorSession.js';

const HEARTBEAT_INTERVAL_MS = 25000; // 25 seconds

/**
 * Checks if the user prefers reduced motion.
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * LiveVisitorCounter Component
 * 
 * Renders a production-ready real-time active visitor counter.
 * Uses Page Visibility API to pause polling when the tab is hidden,
 * and notifies server on tab departure.
 */
export default function LiveVisitorCounter({ variant = 'badge', className = '' }) {
  const [visitorCount, setVisitorCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [displayCount, setDisplayCount] = useState(null);
  
  const timerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const isMountedRef = useRef(true);

  // Smooth counter animation hook
  useEffect(() => {
    if (visitorCount === null) return;
    
    if (prefersReducedMotion() || displayCount === null) {
      setDisplayCount(visitorCount);
      return;
    }

    if (displayCount === visitorCount) return;

    const start = displayCount;
    const diff = visitorCount - start;
    const duration = 400; // ms
    const startTime = performance.now();

    let rafId;
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(start + diff * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayCount(visitorCount);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [visitorCount]);

  useEffect(() => {
    isMountedRef.current = true;
    const sessionId = getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    // Heartbeat function
    const pingHeartbeat = async () => {
      if (!isMountedRef.current) return;
      
      const res = await sendHeartbeat(sessionIdRef.current);
      if (!isMountedRef.current) return;

      if (res && typeof res.count === 'number') {
        setVisitorCount(res.count);
        setIsLive(true);
      } else {
        // Fallback: maintain at least 1 online if server is unreachable
        setVisitorCount((prev) => (prev !== null ? prev : 1));
        setIsLive(res.status !== 'error');
      }
      setLoading(false);
    };

    // 1. Initial Heartbeat
    pingHeartbeat();

    // 2. Setup periodic interval
    const startPolling = () => {
      stopPolling();
      timerRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          pingHeartbeat();
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    startPolling();

    // 3. Page Visibility API
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pingHeartbeat();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Page Unload Beacon
    const handleBeforeUnload = () => {
      sendLeaveBeacon(sessionIdRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const formattedCount = displayCount !== null ? displayCount : visitorCount;
  const label = formattedCount === 1 ? 'online' : 'online';

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 shadow-sm ${className}`}
        title="Active visitors on this page"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2">
          {isLive && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </span>
        {loading ? (
          <span className="opacity-60">— online</span>
        ) : (
          <span>
            <strong className="font-bold tabular-nums text-slate-900">{formattedCount}</strong> {label}
          </span>
        )}
      </div>
    );
  }

  // Default pill badge (footer / header compatible)
  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm text-xs text-slate-600 transition-all hover:border-slate-300 hover:shadow ${className}`}
      title="Real-time active visitors tracked with privacy-safe Upstash Redis session heartbeat"
      aria-label={`${formattedCount ?? 'Live'} active visitors online`}
      aria-live="polite"
    >
      {/* Live status dot */}
      <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      </span>

      {/* Visitor Icon & Count */}
      <div className="flex items-center gap-1.5 font-medium select-none">
        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        {loading ? (
          <span className="text-slate-400 font-mono text-[11px] animate-pulse">
            Connecting…
          </span>
        ) : (
          <span className="text-slate-700">
            <strong className="font-bold text-slate-900 tabular-nums">
              {formattedCount ?? 1}
            </strong>{' '}
            <span className="text-slate-500">{formattedCount === 1 ? 'developer' : 'developers'} online</span>
          </span>
        )}
      </div>
    </div>
  );
}
