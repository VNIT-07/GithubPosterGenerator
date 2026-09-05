import React, { useState, useEffect, useRef } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import {
  subscribeToVisitorCount,
  initPresence,
  cleanupPresence,
} from './visitorSession.js';

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
 * Uses Supabase Realtime Presence for true global synchronization.
 * All connected clients see the same count, updated instantly via WebSocket.
 */
export default function LiveVisitorCounter({ variant = 'badge', className = '' }) {
  const [visitorCount, setVisitorCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [displayCount, setDisplayCount] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const prevCountRef = useRef(null);
  const isMountedRef = useRef(true);

  // 1. Subscribe to presence count updates (push-based, not polling)
  useEffect(() => {
    const unsubscribe = subscribeToVisitorCount((payload) => {
      if (!isMountedRef.current) return;
      if (typeof payload?.count === 'number') {
        setVisitorCount(payload.count);
        setIsLive(payload.isLive !== false);
        setLoading(false);
      } else if (payload?.isLive === false) {
        setIsLive(false);
      }
    });
    return unsubscribe;
  }, []);

  // 2. Initialize Supabase Realtime Presence channel
  useEffect(() => {
    isMountedRef.current = true;

    // Start presence tracking
    const success = initPresence();
    if (!success) {
      // Supabase not configured — show fallback
      setLoading(false);
      setIsLive(false);
    }

    return () => {
      isMountedRef.current = false;
      cleanupPresence();
    };
  }, []);

  // 3. Smooth counter number transition and highlight flash on change
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

  // Manual refresh — re-initializes presence tracking
  const handleManualRefresh = (e) => {
    e.stopPropagation();
    if (isPinging) return;
    setIsPinging(true);
    // Re-init presence (safe to call multiple times)
    initPresence();
    setTimeout(() => setIsPinging(false), 600);
  };

  const formattedCount = displayCount !== null ? displayCount : (visitorCount !== null ? visitorCount : null);
  const showConnecting = loading || formattedCount === null;

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

        {showConnecting ? (
          <span className="opacity-60 text-[11px] font-mono animate-pulse">Connecting…</span>
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
      aria-label={`${formattedCount ?? 0} active visitors online`}
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
        {showConnecting ? (
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
