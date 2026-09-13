import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useFollowStatus } from './useFollowStatus.js';

export default function FollowButton({
  targetUsername,
  onFollowChange,
  showFollowsYouBadge = true,
  className = '',
}) {
  const {
    isOwnProfile,
    isFollowing,
    followsYou,
    isLoading,
    actionLoading,
    error,
    toggleFollow,
  } = useFollowStatus(targetUsername);

  const [isHovered, setIsHovered] = useState(false);

  // Notify parent of following status changes
  useEffect(() => {
    if (onFollowChange) {
      onFollowChange(isFollowing);
    }
  }, [isFollowing, onFollowChange]);

  // STATE 1: OWN_PROFILE → Render no button
  if (isOwnProfile) {
    return null;
  }

  // STATE 2: LOADING → Render [ Loading... ]
  if (isLoading || actionLoading) {
    return (
      <div className="relative inline-flex items-center gap-2">
        {showFollowsYouBadge && followsYou && (
          <span
            className="text-[10px] font-medium text-slate-300 bg-white/10 border border-white/15 px-2 py-1 rounded-lg select-none whitespace-nowrap hidden sm:inline-block"
            title={`@${targetUsername} follows you`}
          >
            Follows you
          </span>
        )}
        <button
          type="button"
          disabled
          className={`inline-flex items-center justify-center gap-1.5 min-w-[95px] sm:min-w-[110px] min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold border border-white/15 bg-white/10 text-white/60 cursor-not-allowed select-none ${className}`}
          aria-label={`Loading follow status for @${targetUsername}`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-white/50" />
          <span className="whitespace-nowrap font-semibold">Loading...</span>
        </button>
      </div>
    );
  }

  // STATE 3: FOLLOWING vs STATE 4: NOT_FOLLOWING
  const buttonText = isFollowing ? '✓ Following' : '+ Follow';
  const ButtonIcon = isFollowing ? UserCheck : UserPlus;

  const buttonStyle = isFollowing
    ? isHovered
      ? 'bg-white/20 hover:bg-rose-500/20 text-white hover:text-rose-100 border-white/30 hover:border-rose-400/50 shadow-xs'
      : 'bg-white/15 text-white border-white/25 shadow-xs'
    : 'bg-[#0a66c2] hover:bg-[#084e96] text-white border-transparent shadow-xs hover:shadow-md active:scale-95';

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Optional subtle secondary indicator when target follows current user */}
      {showFollowsYouBadge && followsYou && (
        <span
          className="text-[10px] font-medium text-slate-300 bg-white/10 border border-white/15 px-2 py-1 rounded-lg select-none whitespace-nowrap hidden sm:inline-block"
          title={`@${targetUsername} follows you`}
        >
          Follows you
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFollow();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center justify-center gap-1.5 min-w-[95px] sm:min-w-[110px] min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer select-none ${buttonStyle} ${className}`}
        aria-label={`${buttonText} @${targetUsername}`}
        aria-pressed={isFollowing}
        title={isFollowing ? 'Click to unfollow' : 'Click to follow'}
      >
        <ButtonIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap font-semibold">
          {buttonText}
        </span>
      </button>

      {/* Floating error notice if action fails */}
      {error && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 px-2.5 py-1 text-[11px] font-medium bg-rose-900/95 text-rose-100 rounded-lg shadow-lg border border-rose-700/50 whitespace-nowrap animate-in fade-in"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
