import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Github
} from 'lucide-react';
import { getGithubHeaders } from '../shared.jsx';

export default function FollowersFollowingSection({
  username,
  type = 'followers', // 'followers' | 'following'
  totalCount = 0
}) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cache per username + type
  const cacheRef = useRef({});

  const isFollowers = type === 'followers';
  const title = isFollowers ? 'Followers' : 'Following';
  const Icon = isFollowers ? Users : UserCheck;

  const fetchUsers = async (pageNum = 1, isAppend = false) => {
    if (isAppend) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const headers = getGithubHeaders();
      const perPage = 30;
      const res = await fetch(
        `https://api.github.com/users/${username}/${type}?page=${pageNum}&per_page=${perPage}`,
        { headers }
      );

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please wait a minute or set VITE_GITHUB_TOKEN.');
        } else if (res.status === 404) {
          throw new Error(`User "${username}" not found on GitHub.`);
        } else {
          throw new Error(`GitHub API error (${res.status})`);
        }
      }

      const data = await res.json();
      const newUsers = Array.isArray(data) ? data : [];

      // Parse Link header for pagination
      const linkHeader = res.headers.get('Link') || res.headers.get('link');
      const moreAvailable = linkHeader
        ? linkHeader.includes('rel="next"')
        : newUsers.length === perPage;

      setHasMore(moreAvailable);
      setPage(pageNum);

      if (isAppend) {
        setUsers((prev) => {
          const combined = [...prev, ...newUsers];
          // deduplicate by id/login
          const map = new Map();
          combined.forEach((u) => map.set(u.id || u.login, u));
          const uniqueList = Array.from(map.values());
          cacheRef.current[`${username}_${type}`] = {
            users: uniqueList,
            page: pageNum,
            hasMore: moreAvailable
          };
          return uniqueList;
        });
      } else {
        setUsers(newUsers);
        cacheRef.current[`${username}_${type}`] = {
          users: newUsers,
          page: pageNum,
          hasMore: moreAvailable
        };
      }
    } catch (err) {
      setError(err.message || `Failed to load ${type}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const cacheKey = `${username}_${type}`;
    const cached = cacheRef.current[cacheKey];

    if (cached) {
      setUsers(cached.users);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setLoading(false);
      setError(null);
    } else {
      setUsers([]);
      setPage(1);
      setHasMore(false);
      fetchUsers(1, false);
    }
  }, [username, type]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter((u) =>
      u.login.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [users, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Icon className="w-5 h-5 text-[#0a66c2]" />
              <span>{title}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0a66c2]">
                {totalCount !== null && totalCount !== undefined ? totalCount.toLocaleString() : users.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {isFollowers
                ? `Developers following @${username} on GitHub`
                : `Developers that @${username} follows on GitHub`}
            </p>
          </div>

          <a
            href={`https://github.com/${username}?tab=${type}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a66c2] hover:text-[#004182] transition-colors self-start sm:self-center"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Search within loaded users */}
        {users.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filter loaded ${type.toLowerCase()}...`}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0a66c2] focus:border-[#0a66c2] transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <div key={n} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 animate-pulse">
              <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-2/3"></div>
                <div className="h-2.5 bg-gray-100 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 max-w-lg mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="font-semibold text-sm">Failed to load {type}</h3>
          <p className="text-xs text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchUsers(1, false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty View */}
      {!loading && !error && users.length === 0 && (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center space-y-3">
          <Github className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-800">
            {isFollowers ? 'No followers yet' : 'Not following anyone yet'}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {isFollowers
              ? `@${username} doesn't have any followers on GitHub yet.`
              : `@${username} isn't following anyone on GitHub yet.`}
          </p>
        </div>
      )}

      {/* Users Grid */}
      {!loading && !error && filteredUsers.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <a
                key={user.id || user.login}
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-[#0a66c2]/40 hover:shadow-md transition-all duration-200 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-11 h-11 rounded-full border border-gray-100 shrink-0 group-hover:ring-2 group-hover:ring-[#0a66c2]/20 transition-all"
                    onError={(e) => {
                      e.target.src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                    }}
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-[#0a66c2] transition-colors">
                      {user.login}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate">
                      github.com/{user.login}
                    </p>
                  </div>
                </div>

                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a66c2] transition-colors shrink-0 ml-2" />
              </a>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => fetchUsers(page + 1, true)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-xs transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#0a66c2] rounded-full animate-spin" />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <>
                    <span>Load More {title}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
