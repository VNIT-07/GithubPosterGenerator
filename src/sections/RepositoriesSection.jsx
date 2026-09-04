import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Star,
  GitFork,
  ExternalLink,
  Code,
  Calendar,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { getGithubHeaders, getLangColor } from '../shared.jsx';

export default function RepositoriesSection({ username, initialRepos = null }) {
  const [repos, setRepos] = useState(Array.isArray(initialRepos) ? initialRepos : []);
  const [loading, setLoading] = useState(!Array.isArray(initialRepos) || initialRepos.length === 0);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [sortBy, setSortBy] = useState('stars'); // 'stars' | 'updated' | 'name' | 'forks'

  useEffect(() => {
    let isCancelled = false;

    const fetchRepos = async () => {
      // If already provided via initialRepos, we don't necessarily have to re-fetch unless empty
      if (Array.isArray(initialRepos) && initialRepos.length > 0) {
        setRepos(initialRepos);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const headers = getGithubHeaders();
        const res = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
          { headers }
        );

        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('GitHub API rate limit exceeded. Please wait a minute or set VITE_GITHUB_TOKEN.');
          } else if (res.status === 404) {
            throw new Error(`User "${username}" not found on GitHub.`);
          } else {
            throw new Error(`Failed to load repositories (HTTP ${res.status})`);
          }
        }

        const data = await res.json();
        if (!isCancelled) {
          setRepos(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load repositories');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchRepos();

    return () => {
      isCancelled = true;
    };
  }, [username, initialRepos]);

  // Extract unique languages and counts
  const languageStats = useMemo(() => {
    const counts = {};
    repos.forEach((r) => {
      if (r.language) {
        counts[r.language] = (counts[r.language] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [repos]);

  // Filter and sort repos
  const filteredRepos = useMemo(() => {
    return repos
      .filter((repo) => {
        const matchesSearch =
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesLang = selectedLanguage === 'ALL' || repo.language === selectedLanguage;
        return matchesSearch && matchesLang;
      })
      .sort((a, b) => {
        if (sortBy === 'stars') {
          return (b.stargazers_count || 0) - (a.stargazers_count || 0);
        }
        if (sortBy === 'forks') {
          return (b.forks_count || 0) - (a.forks_count || 0);
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        // default: updated
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
  }, [repos, searchQuery, selectedLanguage, sortBy]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0a66c2]" />
              <span>Repositories</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0a66c2]">
                {repos.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Explore public repositories, stars, forks, and tech stack for @{username}
            </p>
          </div>

          <a
            href={`https://github.com/${username}?tab=repositories`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a66c2] hover:text-[#004182] transition-colors self-start sm:self-center"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Filter Controls */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a repository..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0a66c2] focus:border-[#0a66c2] transition-all"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a66c2] cursor-pointer"
            >
              <option value="stars">Sort: Most Stars</option>
              <option value="updated">Sort: Recently Updated</option>
              <option value="forks">Sort: Most Forks</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Language Filter Pills */}
        {languageStats.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedLanguage('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                selectedLanguage === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({repos.length})
            </button>
            {languageStats.map(([lang, count]) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                  selectedLanguage === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getLangColor(lang) }}
                />
                <span>{lang}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-4/5"></div>
              <div className="h-3 bg-gray-100 rounded w-3/5"></div>
              <div className="pt-2 flex gap-4">
                <div className="h-3 bg-gray-200 rounded w-14"></div>
                <div className="h-3 bg-gray-200 rounded w-14"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 max-w-lg mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="font-semibold text-sm">Failed to load repositories</h3>
          <p className="text-xs text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRepos.length === 0 && (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center space-y-3">
          <Layers className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-800">No repositories found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery || selectedLanguage !== 'ALL'
              ? 'Try adjusting your search or language filter.'
              : `@${username} has no public repositories.`}
          </p>
          {(searchQuery || selectedLanguage !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedLanguage('ALL');
              }}
              className="text-xs font-semibold text-[#0a66c2] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Repositories Grid */}
      {!loading && !error && filteredRepos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id || repo.name}
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
                    <span>{repo.name}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>
                  {repo.fork && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                      Fork
                    </span>
                  )}
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

                {repo.updated_at && (
                  <span className="text-[10px] text-gray-400" title={new Date(repo.updated_at).toLocaleString()}>
                    {formatDate(repo.updated_at)}
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
