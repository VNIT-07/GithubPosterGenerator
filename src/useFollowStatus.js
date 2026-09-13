import { useState, useEffect, useCallback } from 'react';
import {
  getFollowStatus,
  toggleFollow as serviceToggleFollow,
  subscribeToFollowChanges,
  isOwnProfile as checkIsOwnProfile,
} from './followService.js';

/**
 * Reusable Custom Hook: useFollowStatus
 * 
 * Provides unified follow state across the entire application:
 * - Profile header
 * - Shared profiles
 * - Followers / Following lists
 * - Search results / Cards
 * 
 * Strictly adheres to directional semantics:
 * - isFollowing: Does CURRENT_USER follow TARGET_USER?
 * - followsYou: Does TARGET_USER follow CURRENT_USER?
 * - isOwnProfile: Is TARGET_USER the CURRENT_USER? (Renders NO button)
 */
export function useFollowStatus(targetUsername) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const isOwn = checkIsOwnProfile(targetUsername);

  // Sync state whenever targetUsername changes
  useEffect(() => {
    if (isOwn || !targetUsername) {
      setIsFollowing(false);
      setFollowsYou(false);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getFollowStatus(targetUsername)
      .then((status) => {
        if (!isMounted) return;
        setIsFollowing(Boolean(status.isFollowing));
        setFollowsYou(Boolean(status.followsYou));
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoading(false);
        setError(err.message || 'Failed to check follow status');
      });

    // Real-time synchronization
    const unsubscribe = subscribeToFollowChanges(({ target, isFollowing: nextFollow, followsYou: nextFollowsYou }) => {
      if (!isMounted) return;
      if (target && target.toLowerCase() === (targetUsername || '').toLowerCase()) {
        setIsFollowing(Boolean(nextFollow));
        if (typeof nextFollowsYou === 'boolean') {
          setFollowsYou(nextFollowsYou);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [targetUsername, isOwn]);

  const toggle = useCallback(async () => {
    if (isOwn || isLoading || actionLoading) return;

    setActionLoading(true);
    setError(null);

    const previousState = isFollowing;
    // Optimistic toggle
    setIsFollowing(!previousState);

    try {
      const res = await serviceToggleFollow(targetUsername, previousState);
      setIsFollowing(Boolean(res.isFollowing));
      if (typeof res.followsYou === 'boolean') {
        setFollowsYou(res.followsYou);
      }
    } catch (err) {
      // Revert on error
      setIsFollowing(previousState);
      setError(err.message || 'Follow request failed');
      setTimeout(() => setError(null), 3500);
    } finally {
      setActionLoading(false);
    }
  }, [targetUsername, isOwn, isLoading, actionLoading, isFollowing]);

  const follow = useCallback(async () => {
    if (isOwn || isLoading || actionLoading || isFollowing) return;
    return toggle();
  }, [isOwn, isLoading, actionLoading, isFollowing, toggle]);

  const unfollow = useCallback(async () => {
    if (isOwn || isLoading || actionLoading || !isFollowing) return;
    return toggle();
  }, [isOwn, isLoading, actionLoading, isFollowing, toggle]);

  return {
    isOwnProfile: isOwn,
    isFollowing,
    followsYou,
    isLoading,
    actionLoading,
    error,
    follow,
    unfollow,
    toggleFollow: toggle,
  };
}

export default useFollowStatus;
