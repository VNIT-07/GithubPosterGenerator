import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useFollowStatus } from './useFollowStatus.js';

export default function FollowButton({
  targetUser,
  targetUsername,
  targetUserId,
  onFollowChange,
  showFollowsYouBadge = false,
  variant = 'light',
  className = '',
}) {
  const target = targetUser || {
    id: targetUserId,
    login: targetUsername,
    username: targetUsername
  };

  const {
    isOwnProfile,
    isFollowing,
    actionLoading,
    error,
    toggleFollow,
  } = useFollowStatus(target);

  const [isHovered, setIsHovered] = useState(false);

  // Notify parent component of following status changes
  useEffect(() => {
    if (onFollowChange) {
      onFollowChange(isFollowing);
    }
  }, [isFollowing, onFollowChange]);

  // STATE 1: OWN_PROFILE → Render no button
  if (isOwnProfile) {
    return null;
  }

  // Display text and styles
  const buttonText = actionLoading
    ? 'Saving...'
    : isFollowing
      ? isHovered
        ? 'Unfollow'
        : '✓ Following'
      : '+ Follow';

  const ButtonIcon = actionLoading ? Loader2 : isFollowing ? UserCheck : UserPlus;

  const isDark = variant === 'dark';
  const followingStyle = isDark
    ? isHovered
      ? 'bg-white/20 hover:bg-rose-500/20 text-white hover:text-rose-100 border-white/30 hover:border-rose-400/50 shadow-xs'
      : 'bg-white/15 text-white border-white/25 shadow-xs'
    : isHovered
      ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-xs'
      : 'bg-slate-100 text-slate-700 border-slate-200 shadow-xs hover:bg-slate-200';

  const notFollowingStyle = 'bg-[#0a66c2] hover:bg-[#084e96] text-white border-transparent shadow-xs hover:shadow-md active:scale-95';
  const buttonStyle = isFollowing ? followingStyle : notFollowingStyle;

  const displayTargetName = targetUser?.login || targetUsername || (target?.id ? `user #${target.id}` : 'developer');

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        type="button"
        disabled={actionLoading}
        onClick={(e) => {
          e.stopPropagation();
          toggleFollow();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center justify-center gap-1.5 min-w-[95px] sm:min-w-[110px] min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer select-none ${buttonStyle} ${className}`}
        aria-label={`${isFollowing ? '✓ Following' : '+ Follow'} @${displayTargetName}`}
        aria-pressed={isFollowing}
        title={isFollowing ? 'Click to unfollow' : 'Click to follow'}
      >
        <ButtonIcon className={`w-3.5 h-3.5 shrink-0 ${actionLoading ? 'animate-spin' : ''}`} />
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
