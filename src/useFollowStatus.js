import { useState, useEffect, useCallback } from 'react';
import {
  isUserFollowed,
  isOwnProfile as checkIsOwnProfile,
  toggleFollow as serviceToggleFollow,
  subscribeToFollowChanges,
  extractTargetInfo,
  initAuthoritativeFollows
} from './followService.js';

/**
 * Reusable Custom Hook: useFollowStatus
 * 
 * Provides unified, authoritative follow state across the entire application:
 * - Profile header
 * - Shared profiles
 * - Followers / Following lists
 * - Search results / Cards
 * 
 * Strictly adheres to directional semantics:
 * - isFollowing: Does CURRENT_USER follow TARGET_USER?
 * - isOwnProfile: Is TARGET_USER the CURRENT_USER? (Renders NO button)
 */
export function useFollowStatus(target) {
  const { targetId, targetUsername } = extractTargetInfo(target);
  const isOwn = checkIsOwnProfile(target);

  const [isFollowing, setIsFollowing] = useState(() => isUserFollowed(target));
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state when target changes or when authoritative store changes
  useEffect(() => {
    if (isOwn || (!targetId && !targetUsername)) {
      setIsFollowing(false);
      return;
    }

    // Read current synchronous state from authoritative store
    setIsFollowing(isUserFollowed(target));

    // Ensure authoritative follows graph is fully initialized
    initAuthoritativeFollows().then(() => {
      setIsFollowing(isUserFollowed(target));
    }).catch(() => {});

    // Subscribe to real-time follow changes
    const unsubscribe = subscribeToFollowChanges((change) => {
      if (!change || (!change.targetId && !change.targetUsername)) {
        // Global sync event
        setIsFollowing(isUserFollowed(target));
        return;
      }

      const matchId = targetId && change.targetId && Number(targetId) === Number(change.targetId);
      const matchUser = targetUsername && change.targetUsername && targetUsername.toLowerCase() === change.targetUsername.toLowerCase();

      if (matchId || matchUser) {
        setIsFollowing(Boolean(change.isFollowing));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [targetId, targetUsername, isOwn]);

  const toggle = useCallback(async () => {
    if (isOwn || actionLoading) return;

    setActionLoading(true);
    setError(null);

    const prev = isFollowing;
    try {
      const res = await serviceToggleFollow(target, prev);
      setIsFollowing(Boolean(res.isFollowing));
    } catch (err) {
      setIsFollowing(prev);
      setError(err.message || 'Follow request failed');
      setTimeout(() => setError(null), 3500);
    } finally {
      setActionLoading(false);
    }
  }, [target, isOwn, actionLoading, isFollowing]);

  return {
    isOwnProfile: isOwn,
    isFollowing,
    isLoading: false,
    actionLoading,
    error,
    toggleFollow: toggle,
  };
}

export default useFollowStatus;
