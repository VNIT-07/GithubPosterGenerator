import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Users, UserPlus, ExternalLink, AlertCircle, ChevronDown } from 'lucide-react';

/**
 * Parse GitHub's Link header to extract the "next" page URL.
 * Returns null if there is no next page.
 */
function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Format a number with locale-aware thousands separators.
 */
function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString() : '0';
}

// Skeleton placeholder row shown while loading
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-28" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
    </div>
  );
}

export default function FollowersFollowingModal({
  isOpen,
  onClose,
  username,
  followersCount = 0,
  followingCount = 0,
  initialTab = 'followers',
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Per-tab state
  const [data, setData] = useState({ followers: [], following: [] });
  const [nextUrl, setNextUrl] = useState({ followers: null, following: null });
  const [loading, setLoading] = useState({ followers: false, following: false });
  const [loadingMore, setLoadingMore] = useState({ followers: false, following: false });
  const [error, setError] = useState({ followers: null, following: null });
  const [fetched, setFetched] = useState({ followers: false, following: false });

  const modalRef = useRef(null);
  const abortRef = useRef({ followers: null, following: null });

  // Reset activeTab when initialTab prop changes (modal re-opens with a different tab)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Reset all state when username changes
  useEffect(() => {
    setData({ followers: [], following: [] });
    setNextUrl({ followers: null, following: null });
    setLoading({ followers: false, following: false });
    setLoadingMore({ followers: false, following: false });
    setError({ followers: null, following: null });
    setFetched({ followers: false, following: false });

    // Abort any in-flight requests
    if (abortRef.current.followers) abortRef.current.followers.abort();
    if (abortRef.current.following) abortRef.current.following.abort();
  }, [username]);

  // Build headers with optional auth token
  const getHeaders = useCallback(() => {
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  // Fetch a page of data
  const fetchPage = useCallback(
    async (type, url, append = false) => {
      if (!username) return;

      // Abort previous request for this tab
      if (abortRef.current[type]) abortRef.current[type].abort();
      const controller = new AbortController();
      abortRef.current[type] = controller;

      if (append) {
        setLoadingMore((prev) => ({ ...prev, [type]: true }));
      } else {
        setLoading((prev) => ({ ...prev, [type]: true }));
        setError((prev) => ({ ...prev, [type]: null }));
      }

      try {
        const fetchUrl =
          url || `https://api.github.com/users/${encodeURIComponent(username)}/${type}?per_page=30`;

        const res = await fetch(fetchUrl, {
          headers: getHeaders(),
          signal: controller.signal,
        });

        if (!res.ok) {
          let msg = 'Unable to load data. Please try again.';
          if (res.status === 404) msg = 'User not found.';
          else if (res.status === 403) msg = 'GitHub API rate limit exceeded. Please wait or set a VITE_GITHUB_TOKEN.';
          else if (res.status === 401) msg = 'GitHub API authentication failed. Check your token.';
          throw new Error(msg);
        }

        const users = await res.json();
        const linkHeader = res.headers.get('Link');
        const next = parseNextLink(linkHeader);

        setData((prev) => ({
          ...prev,
          [type]: append ? [...prev[type], ...users] : users,
        }));
        setNextUrl((prev) => ({ ...prev, [type]: next }));
        setFetched((prev) => ({ ...prev, [type]: true }));
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError((prev) => ({
          ...prev,
          [type]: err.message || 'Unable to load data. Please try again.',
        }));
      } finally {
        setLoading((prev) => ({ ...prev, [type]: false }));
        setLoadingMore((prev) => ({ ...prev, [type]: false }));
      }
    },
    [username, getHeaders]
  );

  // Fetch initial data when modal opens or tab changes (only if not already fetched)
  useEffect(() => {
    if (isOpen && username && !fetched[activeTab] && !loading[activeTab]) {
      fetchPage(activeTab);
    }
  }, [isOpen, username, activeTab, fetched, loading, fetchPage]);

  // Escape key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Simple focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus the modal on open
    if (modalRef.current) modalRef.current.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentData = data[activeTab];
  const isLoading = loading[activeTab];
  const isLoadingMore = loadingMore[activeTab];
  const currentError = error[activeTab];
  const hasNext = !!nextUrl[activeTab];
  const totalCount = activeTab === 'followers' ? followersCount : followingCount;

  const handleLoadMore = () => {
    if (nextUrl[activeTab] && !isLoadingMore) {
      fetchPage(activeTab, nextUrl[activeTab], true);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${activeTab === 'followers' ? 'Followers' : 'Following'} list for ${username}`}
      style={{ animation: 'modalFadeIn 0.2s ease-out' }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col outline-none"
        style={{
          maxHeight: 'min(85vh, 680px)',
          animation: 'modalSlideUp 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0a66c2]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">@{username}</h2>
              <p className="text-[11px] text-gray-500">GitHub Network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/50 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => handleTabChange('followers')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-200 relative ${
              activeTab === 'followers'
                ? 'text-[#0a66c2]'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            aria-label={`Followers tab, ${formatCount(followersCount)} followers`}
            aria-selected={activeTab === 'followers'}
            role="tab"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Followers</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'followers'
                  ? 'bg-blue-100 text-[#0a66c2]'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {formatCount(followersCount)}
            </span>
            {activeTab === 'followers' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#0a66c2] rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('following')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-200 relative ${
              activeTab === 'following'
                ? 'text-[#0a66c2]'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            aria-label={`Following tab, ${formatCount(followingCount)} following`}
            aria-selected={activeTab === 'following'}
            role="tab"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Following</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'following'
                  ? 'bg-blue-100 text-[#0a66c2]'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {formatCount(followingCount)}
            </span>
            {activeTab === 'following' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#0a66c2] rounded-t-full" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain" role="tabpanel">
          {/* Loading state (initial fetch) */}
          {isLoading && currentData.length === 0 && (
            <div className="divide-y divide-gray-50">
              {[...Array(6)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {currentError && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="p-3 rounded-full bg-red-50 mb-3">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Something went wrong</p>
              <p className="text-xs text-gray-500 mb-4 max-w-[280px]">{currentError}</p>
              <button
                onClick={() => {
                  setError((prev) => ({ ...prev, [activeTab]: null }));
                  setFetched((prev) => ({ ...prev, [activeTab]: false }));
                }}
                className="px-4 py-2 text-xs font-semibold text-[#0a66c2] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !currentError && fetched[activeTab] && currentData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="p-3 rounded-full bg-gray-50 mb-3">
                <Users className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {activeTab === 'followers'
                  ? `@${username} doesn't have any followers.`
                  : `@${username} isn't following anyone.`}
              </p>
            </div>
          )}

          {/* User list */}
          {currentData.length > 0 && (
            <div className="divide-y divide-gray-50">
              {currentData.map((user) => (
                <div
                  key={user.id || user.login}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors group"
                >
                  <img
                    src={user.avatar_url}
                    alt={`${user.login}'s avatar`}
                    className="w-10 h-10 rounded-full border border-gray-200 shrink-0 bg-gray-100"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src =
                        'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user.login}</p>
                    <p className="text-[11px] text-gray-400 truncate">github.com/{user.login}</p>
                  </div>
                  <a
                    href={user.html_url || `https://github.com/${user.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 hover:text-[#0a66c2] hover:bg-blue-50 rounded-lg transition-all shrink-0 opacity-70 group-hover:opacity-100"
                    aria-label={`View ${user.login}'s GitHub profile`}
                  >
                    <span className="hidden sm:inline">View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}

              {/* Load More */}
              {hasNext && (
                <div className="px-4 py-3 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#0a66c2] bg-blue-50 hover:bg-blue-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                    aria-label="Load more users"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-300 border-t-[#0a66c2]" />
                        <span>Loading…</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Load More</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* End of list indicator */}
              {!hasNext && fetched[activeTab] && currentData.length > 0 && (
                <div className="px-4 py-3 text-center">
                  <p className="text-[11px] text-gray-400">
                    Showing all {currentData.length.toLocaleString()} of {formatCount(totalCount)}{' '}
                    {activeTab}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
