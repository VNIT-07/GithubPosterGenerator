import React, { useEffect } from 'react';
import { X, Award, CheckCircle2, Lock, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { OFFICIAL_ACHIEVEMENTS } from './achievementsService.js';

export default function AchievementsModal({
  isOpen,
  onClose,
  userData,
  achievements = [],
  loading = false,
  error = null,
  onRefresh
}) {
  const username = userData?.login;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Set of earned slugs
  const earnedSlugs = new Set((achievements || []).map((a) => a.slug.toLowerCase()));
  const earnedCount = achievements ? achievements.length : 0;

  // Build complete list: Earned first, then Locked official achievements
  const displayAchievements = [];

  // Add earned achievements
  (achievements || []).forEach((earned) => {
    const official = OFFICIAL_ACHIEVEMENTS.find((o) => o.slug === earned.slug);
    displayAchievements.push({
      slug: earned.slug,
      title: earned.title || official?.title || earned.slug,
      description: earned.description || official?.description || 'Verified GitHub profile achievement.',
      criteria: official?.criteria || 'Earned through GitHub activity',
      badgeUrl: earned.badgeUrl || official?.badgeUrl || official?.fallbackUrl,
      fallbackUrl: official?.fallbackUrl,
      tier: earned.tier || official?.tier || 'Earned',
      isEarned: true
    });
  });

  // Add remaining official achievements as locked
  OFFICIAL_ACHIEVEMENTS.forEach((official) => {
    if (!earnedSlugs.has(official.slug.toLowerCase())) {
      displayAchievements.push({
        slug: official.slug,
        title: official.title,
        description: official.description,
        criteria: official.criteria,
        badgeUrl: official.badgeUrl,
        fallbackUrl: official.fallbackUrl,
        tier: official.tier || 'Locked',
        isEarned: false
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0a66c2] border border-blue-200/80 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">GitHub Achievements</h2>
              <p className="text-xs text-gray-500">
                {loading
                  ? 'Verifying GitHub profile achievements...'
                  : `${earnedCount} verified ${earnedCount === 1 ? 'achievement' : 'achievements'} for @${username || 'user'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh achievements"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Badges List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-4 animate-pulse">
                  <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error && earnedCount === 0 ? (
            <div className="text-center py-8 px-4 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-800">Achievements unavailable</h3>
              <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
                Unable to reach GitHub achievements service. Please verify your connection or check directly on GitHub.
              </p>
              {username && (
                <a
                  href={`https://github.com/${username}?tab=achievements`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0a66c2] hover:underline"
                >
                  <span>Open {username} on GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            <>
              {earnedCount === 0 && (
                <div className="text-center py-5 px-4 mb-2 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="text-xs font-semibold text-gray-700">No public achievements found</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    This profile has not publicly unlocked any GitHub achievements yet, or achievements are kept private.
                  </p>
                </div>
              )}

              {displayAchievements.map((achievement) => {
                const { isEarned } = achievement;

                return (
                  <div
                    key={achievement.slug}
                    className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${
                      isEarned
                        ? 'bg-white border-blue-200/90 shadow-xs hover:border-blue-300'
                        : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                    }`}
                  >
                    {/* Authentic GitHub Badge Visual */}
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center p-1 shrink-0 bg-slate-50/80 border border-slate-200/80">
                      <img
                        src={achievement.badgeUrl}
                        alt={achievement.title}
                        onError={(e) => {
                          if (achievement.fallbackUrl && e.target.src !== achievement.fallbackUrl) {
                            e.target.src = achievement.fallbackUrl;
                          }
                        }}
                        className={`w-12 h-12 object-contain transition-transform ${
                          isEarned ? 'scale-100 hover:scale-110' : 'grayscale opacity-60'
                        }`}
                        loading="lazy"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 truncate">
                            {achievement.title}
                          </h4>
                          {achievement.tier && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isEarned
                                  ? 'bg-blue-50 text-[#0a66c2] border border-blue-100'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {achievement.tier}
                            </span>
                          )}
                        </div>

                        {isEarned ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Earned</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {achievement.description}
                      </p>

                      <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
                        <span className="font-medium text-gray-500">Criteria:</span>
                        <span>{achievement.criteria}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span>Verified GitHub achievements</span>
            {username && (
              <>
                <span>•</span>
                <a
                  href={`https://github.com/${username}?tab=achievements`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0a66c2] hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  <span>View on GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold text-xs shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
