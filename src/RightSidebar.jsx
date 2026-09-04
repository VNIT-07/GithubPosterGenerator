import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Share2,
  Award,
  Activity,
  ArrowRight,
  GitCommit,
  Star,
  GitFork,
  GitPullRequest,
  FolderPlus,
  Lock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { getGithubHeaders } from './shared.jsx';
import { OFFICIAL_ACHIEVEMENTS } from './achievementsService.js';

export default function RightSidebar({
  userData,
  achievements = [],
  achievementsLoading = false,
  achievementsError = null,
  onViewGitHub,
  onCopyLink,
  onGeneratePoster,
  onShare,
  onSelectSection,
  onViewAllAchievements,
  desktopStyle = {},
  className = ''
}) {
  const [copied, setCopied] = useState(false);
  const [recentEvents, setRecentEvents] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const eventsCacheRef = useRef({});

  const username = userData?.login;

  // Fetch recent public activity
  useEffect(() => {
    if (!username) {
      setRecentEvents([]);
      return;
    }

    if (eventsCacheRef.current[username]) {
      setRecentEvents(eventsCacheRef.current[username]);
      return;
    }

    let isMounted = true;
    const fetchRecentEvents = async () => {
      setActivityLoading(true);
      setActivityError(null);
      try {
        const headers = getGithubHeaders();
        const res = await fetch(
          `https://api.github.com/users/${username}/events/public?per_page=10`,
          { headers }
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (isMounted) {
          eventsCacheRef.current[username] = list;
          setRecentEvents(list);
        }
      } catch (err) {
        if (isMounted) {
          setActivityError('Unable to load activity');
        }
      } finally {
        if (isMounted) {
          setActivityLoading(false);
        }
      }
    };

    fetchRecentEvents();
    return () => {
      isMounted = false;
    };
  }, [username]);

  // Handle copy profile link with visual feedback
  const handleCopy = async () => {
    if (onCopyLink) {
      onCopyLink();
    } else if (username) {
      try {
        await navigator.clipboard.writeText(`https://github.com/${username}`);
      } catch (e) {
        console.error('Failed to copy', e);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMo = Math.floor(diffDays / 30);
    return `${diffMo}mo ago`;
  };

  // Parse event summary
  const formatEventSummary = (event) => {
    const type = event.type;
    const payload = event.payload || {};
    const repoName = (event.repo?.name || '').split('/').pop() || 'repository';

    switch (type) {
      case 'PushEvent': {
        const count = (payload.commits || []).length;
        return {
          icon: GitCommit,
          color: 'text-purple-600 bg-purple-100',
          title: `Pushed ${count} ${count === 1 ? 'commit' : 'commits'}`,
          detail: repoName
        };
      }
      case 'WatchEvent':
        return {
          icon: Star,
          color: 'text-amber-500 bg-amber-100',
          title: 'Starred repository',
          detail: repoName
        };
      case 'ForkEvent':
        return {
          icon: GitFork,
          color: 'text-indigo-600 bg-indigo-100',
          title: 'Forked repository',
          detail: repoName
        };
      case 'CreateEvent':
        return {
          icon: FolderPlus,
          color: 'text-emerald-600 bg-emerald-100',
          title: `Created ${payload.ref_type || 'repository'}`,
          detail: repoName
        };
      case 'PullRequestEvent':
        return {
          icon: GitPullRequest,
          color: 'text-blue-600 bg-blue-100',
          title: `${payload.action || 'Opened'} pull request`,
          detail: repoName
        };
      default:
        return {
          icon: Activity,
          color: 'text-slate-600 bg-slate-100',
          title: type.replace('Event', ''),
          detail: repoName
        };
    }
  };

  // Prepare up to 4 badges for the compact right sidebar card
  // Prioritize verified earned badges; pad with unearned official badges marked as locked if needed
  const earnedBadges = (achievements || []).map((a) => {
    const official = OFFICIAL_ACHIEVEMENTS.find((o) => o.slug === a.slug);
    return {
      slug: a.slug,
      title: a.title || official?.title || a.slug,
      badgeUrl: a.badgeUrl || official?.badgeUrl || official?.fallbackUrl,
      fallbackUrl: official?.fallbackUrl,
      tier: a.tier || official?.tier || 'Earned',
      isEarned: true
    };
  });

  const earnedSlugs = new Set(earnedBadges.map((b) => b.slug.toLowerCase()));
  const lockedBadges = OFFICIAL_ACHIEVEMENTS
    .filter((o) => !earnedSlugs.has(o.slug.toLowerCase()))
    .map((o) => ({
      slug: o.slug,
      title: o.title,
      badgeUrl: o.badgeUrl,
      fallbackUrl: o.fallbackUrl,
      tier: o.tier || 'Locked',
      isEarned: false
    }));

  const featuredBadges = [...earnedBadges, ...lockedBadges].slice(0, 4);

  return (
    <aside
      style={desktopStyle}
      className={`w-full space-y-4 self-start xl:sticky xl:top-[76px] ${className}`}
    >
      {/* 1. Quick Actions Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Quick Actions
          </h3>
        </div>

        <div className="space-y-2">
          {/* Action 1: View on GitHub */}
          <button
            type="button"
            onClick={onViewGitHub}
            disabled={!username}
            className="w-full h-10 px-3 flex items-center justify-between bg-slate-50/80 hover:bg-blue-50/60 border border-gray-200/80 hover:border-blue-200 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#0a66c2] transition-all group active:scale-98"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>View on GitHub</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a66c2] transition-colors" />
          </button>

          {/* Action 2: Copy Profile Link */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!username}
            className="w-full h-10 px-3 flex items-center justify-between bg-slate-50/80 hover:bg-blue-50/60 border border-gray-200/80 hover:border-blue-200 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#0a66c2] transition-all group active:scale-98"
          >
            <span className="flex items-center gap-2">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a66c2]" />
              )}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Profile Link'}</span>
            </span>
            {copied && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                Done
              </span>
            )}
          </button>

          {/* Action 3: Generate Poster */}
          <button
            type="button"
            onClick={onGeneratePoster}
            disabled={!username}
            className="w-full h-10 px-3 flex items-center justify-between bg-slate-50/80 hover:bg-blue-50/60 border border-gray-200/80 hover:border-blue-200 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#0a66c2] transition-all group active:scale-98"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Generate Poster</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a66c2] transition-colors" />
          </button>

          {/* Action 4: Share Profile */}
          <button
            type="button"
            onClick={onShare}
            disabled={!username}
            className="w-full h-10 px-3 flex items-center justify-between bg-slate-50/80 hover:bg-blue-50/60 border border-gray-200/80 hover:border-blue-200 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#0a66c2] transition-all group active:scale-98"
          >
            <span className="flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Share Profile</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a66c2] transition-colors" />
          </button>
        </div>
      </div>

      {/* 2. Achievements Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#0a66c2]" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Achievements
            </h3>
          </div>
          <button
            type="button"
            onClick={onViewAllAchievements}
            className="text-[11px] font-semibold text-[#0a66c2] hover:text-[#004182] hover:underline transition-colors flex items-center gap-0.5"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Loading State */}
        {achievementsLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 animate-pulse text-center">
                <div className="w-9 h-9 mx-auto rounded-lg bg-slate-200 mb-1.5" />
                <div className="h-2.5 bg-slate-200 rounded w-3/4 mx-auto mb-1" />
                <div className="h-2 bg-slate-100 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : achievementsError && (!achievements || achievements.length === 0) ? (
          <div className="py-4 px-2 text-center bg-slate-50/60 rounded-xl border border-slate-200/60">
            <p className="text-[11px] font-semibold text-gray-700">Achievements unavailable</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Could not load GitHub badges</p>
          </div>
        ) : !achievements || achievements.length === 0 ? (
          <div className="py-4 px-2 text-center bg-slate-50/60 rounded-xl border border-slate-200/60">
            <p className="text-[11px] font-semibold text-gray-700">No public achievements found</p>
            <p className="text-[10px] text-gray-400 mt-0.5">No badges earned on profile</p>
          </div>
        ) : (
          /* Compact Grid of Badges with Real Visual Assets */
          <div className="grid grid-cols-2 gap-2">
            {featuredBadges.map((badge) => (
              <div
                key={badge.slug}
                className={`p-2 rounded-xl border text-center transition-all ${
                  badge.isEarned
                    ? 'bg-gradient-to-b from-blue-50/30 to-slate-50/60 border-blue-100/90 shadow-2xs hover:border-blue-200'
                    : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                }`}
              >
                <div className="w-9 h-9 mx-auto rounded-lg flex items-center justify-center p-0.5 mb-1 bg-white border border-gray-100 shadow-2xs">
                  <img
                    src={badge.badgeUrl}
                    alt={badge.title}
                    onError={(e) => {
                      if (badge.fallbackUrl && e.target.src !== badge.fallbackUrl) {
                        e.target.src = badge.fallbackUrl;
                      }
                    }}
                    className={`w-8 h-8 object-contain transition-transform ${
                      badge.isEarned ? 'scale-100 hover:scale-105' : 'grayscale opacity-60'
                    }`}
                    loading="lazy"
                  />
                </div>
                <div className="text-[11px] font-bold text-gray-800 truncate" title={badge.title}>
                  {badge.title}
                </div>
                <div className="mt-0.5">
                  {badge.isEarned ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Earned</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-slate-400">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Recent Activity Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-600" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Recent Activity
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectSection && onSelectSection('activity')}
            className="text-[11px] font-semibold text-[#0a66c2] hover:text-[#004182] hover:underline transition-colors flex items-center gap-0.5"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Timeline Content */}
        {activityLoading ? (
          <div className="space-y-2.5 py-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2.5 animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mt-1 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activityError || recentEvents.length === 0 ? (
          <p className="text-xs text-gray-500 py-2 text-center">
            {activityError ? 'Activity temporarily unavailable' : 'No recent public activity'}
          </p>
        ) : (
          <div className="relative pl-3 space-y-3.5 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {recentEvents.slice(0, 3).map((event, idx) => {
              const summary = formatEventSummary(event);
              const IconComponent = summary.icon;
              return (
                <div key={event.id || idx} className="relative flex items-start gap-2.5">
                  {/* Indicator Dot */}
                  <div className="absolute -left-3 mt-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-gray-800 truncate">
                      {summary.title}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center justify-between gap-1 mt-0.5">
                      <span className="truncate max-w-[170px] font-mono">{summary.detail}</span>
                      <span className="shrink-0">{formatTimeAgo(event.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
