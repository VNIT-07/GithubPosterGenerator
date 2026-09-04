import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Star,
  Search,
  ExternalLink,
  GitFork,
  AlertCircle,
  RefreshCw,
  Github
} from 'lucide-react';
import { getGithubHeaders, getLangColor } from '../shared.jsx';

export default function StarredReposSection({ username }) {
  const [starred, setStarred] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const cacheRef = useRef({});

  const fetchStarred = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getGithubHeaders();
      const res = await fetch(
        `https://api.github.com/users/${username}/starred?per_page=30`,
        { headers }
      );

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('GitHub API rate limit exceeded or access restricted.');
        } else if (res.status === 404) {
          throw new Error(`User "${username}" not found on GitHub.`);
        } else {
          throw new Error(`Failed to load starred repositories (HTTP ${res.status})`);
        }
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setStarred(list);
      cacheRef.current[username] = list;
    } catch (err) {
      setError(err.message || 'Failed to load starred repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cacheRef.current[username]) {
      setStarred(cacheRef.current[username]);
      setLoading(false);
      setError(null);
    } else {
      setStarred([]);
      fetchStarred();
    }
  }, [username]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return starred;
    const q = searchQuery.toLowerCase();
    return starred.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.full_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [starred, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>Starred Repositories</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {starred.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Public projects starred and bookmarked by @{username}
            </p>
          </div>

          <a
            href={`https://github.com/${username}?tab=stars`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a66c2] hover:text-[#004182] transition-colors self-start sm:self-center"
          >
            <span>View all stars on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Search */}
        {starred.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search starred repositories..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0a66c2] focus:border-[#0a66c2] transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-100 rounded w-4/5"></div>
              <div className="pt-2 flex gap-4">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {!loading && error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-900 max-w-lg mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="font-semibold text-sm">Unable to load starred repositories</h3>
          <p className="text-xs text-amber-800">{error}</p>
          <button
            type="button"
            onClick={fetchStarred}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty View */}
      {!loading && !error && starred.length === 0 && (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center space-y-3">
          <Star className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-800">No starred repositories found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            @{username} hasn't publicly starred any repositories yet or has star activity set to private.
          </p>
        </div>
      )}

      {/* Starred Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((repo) => (
            <div
              key={repo.id || repo.full_name}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-[#0a66c2]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-gray-900 group-hover:text-[#0a66c2] transition-colors inline-flex items-center gap-1.5 break-all"
                  >
                    <span>{repo.full_name || repo.name}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {repo.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <div className="flex items-center gap-3">
                  {repo.language && (
                    <span className="flex items-center gap-1.5 font-medium text-gray-700">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getLangColor(repo.language) }}
                      />
                      {repo.language}
                    </span>
                  )}

                  <span className="flex items-center gap-1" title={`${repo.stargazers_count || 0} stars`}>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{repo.stargazers_count || 0}</span>
                  </span>

                  {(repo.forks_count || 0) > 0 && (
                    <span className="flex items-center gap-1" title={`${repo.forks_count} forks`}>
                      <GitFork className="w-3 h-3 text-gray-400" />
                      <span>{repo.forks_count}</span>
                    </span>
                  )}
                </div>

                {repo.owner?.login && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <span>by @{repo.owner.login}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
