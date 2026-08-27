import React, { useState, useEffect, useRef } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import {
  getOrCreateSessionId,
  sendHeartbeat,
  sendLeaveBeacon,
  subscribeToVisitorCount,
} from './visitorSession.js';

const HEARTBEAT_INTERVAL_MS = 8000; // 8-second dynamic polling for rapid multi-device sync

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
 * Production-ready real-time active visitor counter.
 * Synchronizes dynamically across all devices, browser tabs, and mobile browsers.
 */
export default function LiveVisitorCounter({ variant = 'badge', className = '' }) {
  const [visitorCount, setVisitorCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [displayCount, setDisplayCount] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const timerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const prevCountRef = useRef(null);

  // Subscribe to central session manager so all counters on page & across tabs stay in sync
  useEffect(() => {
    const unsubscribe = subscribeToVisitorCount((payload) => {
      if (typeof payload?.count === 'number') {
        setVisitorCount(payload.count);
        setIsLive(payload.isLive !== false);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Smooth counter number transition and highlight flash on change
  useEffect(() => {
    if (visitorCount === null) return;

    if (prevCountRef.current !== null && prevCountRef.current !== visitorCount) {
      setJustUpdated(true);
      const flashTimeout = setTimeout(() => setJustUpdated(false), 1200);
      return () => clearTimeout(flashTimeout);
    }
    prevCountRef.current = visitorCount;

    if (prefersReducedMotion() || displayCount === null) {
      setDisplayCount(visitorCount);
      return;
    }

    if (displayCount === visitorCount) return;

    const start = displayCount;
    const diff = visitorCount - start;
    const duration = 350; // ms
    const startTime = performance.now();

    let rafId;
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

  // Main lifecycle: initial heartbeat, interval, visibility, and mobile pagehide
  useEffect(() => {
    isMountedRef.current = true;
    const sessionId = getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    const pingHeartbeat = async (showPingAnimation = false) => {
      if (!isMountedRef.current) return;
      if (showPingAnimation) setIsPinging(true);

      const res = await sendHeartbeat(sessionIdRef.current);
      if (!isMountedRef.current) return;

      if (res && typeof res.count === 'number') {
        setVisitorCount(res.count);
        setIsLive(true);
      } else {
        setVisitorCount((prev) => (prev !== null ? prev : 1));
        setIsLive(res.status !== 'error');
      }
      setLoading(false);
      if (showPingAnimation) {
        setTimeout(() => setIsPinging(false), 600);
      }
    };

    // 1. Initial Ping
    pingHeartbeat();

    // 2. Setup periodic interval (8s)
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

    // 3. Page Visibility API (pause when tab hidden, resume immediately when focused)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pingHeartbeat();
        startPolling();
      } else {
        stopPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Network Online/Offline listeners
    const handleOnline = () => {
      pingHeartbeat();
      startPolling();
    };
    const handleOffline = () => {
      setIsLive(false);
      stopPolling();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Mobile & Desktop Unload / Pagehide handlers
    const handleExit = () => {
      sendLeaveBeacon(sessionIdRef.current);
    };
    window.addEventListener('pagehide', handleExit);
    window.addEventListener('beforeunload', handleExit);

    return () => {
      isMountedRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handleExit);
      window.removeEventListener('beforeunload', handleExit);
    };
  }, []);

  const handleManualRefresh = (e) => {
    e.stopPropagation();
    if (isPinging) return;
    setIsPinging(true);
    sendHeartbeat(sessionIdRef.current).then(() => {
      setTimeout(() => setIsPinging(false), 500);
    });
  };

  const formattedCount = displayCount !== null ? displayCount : (visitorCount ?? 1);

  // Compact Variant (Top controls bar & mobile friendly)
  if (variant === 'compact') {
    return (
      <div
        onClick={handleManualRefresh}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 shadow-sm cursor-pointer transition-all duration-300 select-none active:scale-95 ${
          justUpdated ? 'ring-2 ring-emerald-400 bg-emerald-50/60' : ''
        } ${className}`}
        title="Real-time active visitors. Click to refresh."
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          {isLive && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </span>

        {loading ? (
          <span className="opacity-60 text-[11px] font-mono animate-pulse">Live…</span>
        ) : (
          <span className="flex items-center gap-1">
            <strong className="font-bold tabular-nums text-slate-900">{formattedCount}</strong>
            <span className="text-slate-500 font-normal">online</span>
          </span>
        )}

        <RefreshCw className={`w-3 h-3 text-slate-400 ml-0.5 transition-transform duration-500 ${isPinging ? 'animate-spin text-[#0a66c2]' : 'opacity-60 hover:opacity-100'}`} />
      </div>
    );
  }

  // Badge Variant (Footer & comprehensive display)
  return (
    <div
      onClick={handleManualRefresh}
      className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-sm text-xs text-slate-600 transition-all duration-300 hover:border-slate-300 hover:shadow-md cursor-pointer select-none active:scale-[0.98] ${
        justUpdated ? 'ring-2 ring-emerald-400/80 bg-emerald-50/50' : ''
      } ${className}`}
      title="Real-time live visitors across all active devices. Click to refresh."
      aria-label={`${formattedCount} active visitors online`}
      aria-live="polite"
    >
      {/* Multi-ring live pulsating indicator */}
      <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
        {isLive && (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
            <span className="animate-pulse absolute inline-flex h-4 w-4 rounded-full bg-emerald-200/60" />
          </>
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-emerald-500 shadow-sm' : 'bg-slate-400'}`} />
      </span>

      {/* Visitor Icon & Count */}
      <div className="flex items-center gap-1.5 font-medium">
        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        {loading ? (
          <span className="text-slate-400 font-mono text-[11px] animate-pulse">
            Connecting…
          </span>
        ) : (
          <span className="text-slate-700">
            <strong className="font-bold text-slate-900 tabular-nums">
              {formattedCount}
            </strong>{' '}
            <span className="text-slate-500">
              {formattedCount === 1 ? 'developer' : 'developers'} online
            </span>
          </span>
        )}
      </div>

      {/* Refresh Icon */}
      <RefreshCw
        className={`w-3 h-3 text-slate-400 transition-transform duration-500 ${
          isPinging ? 'animate-spin text-[#0a66c2]' : 'opacity-40 hover:opacity-100'
        }`}
      />
    </div>
  );
}
