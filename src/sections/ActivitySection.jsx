import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  GitCommit,
  Star,
  GitFork,
  GitPullRequest,
  AlertCircle,
  FolderPlus,
  MessageSquare,
  Tag,
  ExternalLink,
  RefreshCw,
  Clock
} from 'lucide-react';
import { getGithubHeaders } from '../shared.jsx';

export default function ActivitySection({ username }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cacheRef = useRef({});

  const fetchActivity = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getGithubHeaders();
      const res = await fetch(
        `https://api.github.com/users/${username}/events/public?per_page=30`,
        { headers }
      );

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please wait a minute or set VITE_GITHUB_TOKEN.');
        } else if (res.status === 404) {
          throw new Error(`User "${username}" not found on GitHub.`);
        } else {
          throw new Error(`Failed to load activity (HTTP ${res.status})`);
        }
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setEvents(list);
      cacheRef.current[username] = list;
    } catch (err) {
      setError(err.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cacheRef.current[username]) {
      setEvents(cacheRef.current[username]);
      setLoading(false);
      setError(null);
    } else {
      setEvents([]);
      fetchActivity();
    }
  }, [username]);

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  const renderEventDetails = (event) => {
    const type = event.type;
    const payload = event.payload || {};
    const repoName = event.repo?.name;
    const repoUrl = `https://github.com/${repoName}`;

    switch (type) {
      case 'PushEvent': {
        const commits = payload.commits || [];
        const branch = (payload.ref || '').replace('refs/heads/', '');
        return {
          icon: GitCommit,
          iconColor: 'text-purple-600 bg-purple-50',
          title: (
            <span>
              Pushed {commits.length} {commits.length === 1 ? 'commit' : 'commits'} to{' '}
              <span className="font-semibold text-gray-800">{branch}</span>
            </span>
          ),
          repo: repoName,
          repoUrl,
          details: commits.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              {commits.slice(0, 3).map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 font-mono text-[11px] truncate">
                  <span className="text-gray-400 shrink-0">{c.sha?.substring(0, 7)}</span>
                  <span className="truncate">{c.message}</span>
                </li>
              ))}
              {commits.length > 3 && (
                <li className="text-[10px] text-gray-400 italic">
                  + {commits.length - 3} more commits
                </li>
              )}
            </ul>
          )
        };
      }
      case 'WatchEvent': {
        return {
          icon: Star,
          iconColor: 'text-amber-500 bg-amber-50',
          title: <span>Starred repository</span>,
          repo: repoName,
          repoUrl
        };
      }
      case 'CreateEvent': {
        const refType = payload.ref_type || 'repository';
        return {
          icon: FolderPlus,
          iconColor: 'text-emerald-600 bg-emerald-50',
          title: (
            <span>
              Created {refType}{' '}
              {payload.ref ? <span className="font-semibold">{payload.ref}</span> : null}
            </span>
          ),
          repo: repoName,
          repoUrl
        };
      }
      case 'ForkEvent': {
        return {
          icon: GitFork,
          iconColor: 'text-blue-600 bg-blue-50',
          title: (
            <span>
              Forked to{' '}
              <span className="font-semibold">{payload.forkee?.full_name || repoName}</span>
            </span>
          ),
          repo: repoName,
          repoUrl
        };
      }
      case 'PullRequestEvent': {
        return {
          icon: GitPullRequest,
          iconColor: 'text-indigo-600 bg-indigo-50',
          title: (
            <span>
              {payload.action === 'opened'
                ? 'Opened pull request'
                : `${payload.action || 'Updated'} pull request`}
            </span>
          ),
          repo: repoName,
          repoUrl,
          details: payload.pull_request?.title && (
            <p className="mt-1 text-xs text-gray-700 italic truncate">
              "{payload.pull_request.title}"
            </p>
          )
        };
      }
      case 'IssuesEvent': {
        return {
          icon: AlertCircle,
          iconColor: 'text-rose-600 bg-rose-50',
          title: (
            <span>
              {payload.action === 'opened'
                ? 'Opened issue'
                : `${payload.action || 'Updated'} issue`}
            </span>
          ),
          repo: repoName,
          repoUrl,
          details: payload.issue?.title && (
            <p className="mt-1 text-xs text-gray-700 italic truncate">
              "{payload.issue.title}"
            </p>
          )
        };
      }
      case 'IssueCommentEvent': {
        return {
          icon: MessageSquare,
          iconColor: 'text-sky-600 bg-sky-50',
          title: <span>Commented on issue/pull request</span>,
          repo: repoName,
          repoUrl
        };
      }
      case 'ReleaseEvent': {
        return {
          icon: Tag,
          iconColor: 'text-green-600 bg-green-50',
          title: (
            <span>
              Published release{' '}
              <span className="font-semibold">{payload.release?.tag_name}</span>
            </span>
          ),
          repo: repoName,
          repoUrl
        };
      }
      default: {
        return {
          icon: Activity,
          iconColor: 'text-gray-600 bg-gray-100',
          title: <span>{type.replace('Event', '')} activity</span>,
          repo: repoName,
          repoUrl
        };
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#0a66c2]" />
              <span>Recent Activity</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0a66c2]">
                {events.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Live chronological public events timeline for @{username}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchActivity}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors self-start sm:self-center disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex gap-4 items-start animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 max-w-lg mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="font-semibold text-sm">Failed to load recent activity</h3>
          <p className="text-xs text-red-500">{error}</p>
          <button
            type="button"
            onClick={fetchActivity}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty View */}
      {!loading && !error && events.length === 0 && (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center space-y-3">
          <Activity className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-800">No recent public activity</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            @{username} has no recent public activity on GitHub within the last 90 days.
          </p>
        </div>
      )}

      {/* Timeline List */}
      {!loading && !error && events.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="relative border-l-2 border-slate-100 ml-4 space-y-6">
            {events.map((event) => {
              const { icon: EventIcon, iconColor, title, repo, repoUrl, details } =
                renderEventDetails(event);

              return (
                <div key={event.id} className="relative pl-6 group">
                  {/* Timeline Dot Icon */}
                  <div
                    className={`absolute -left-[19px] top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${iconColor}`}
                  >
                    <EventIcon className="w-4 h-4" />
                  </div>

                  {/* Event Content */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-xs font-medium text-gray-800">
                        {title}
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(event.created_at)}</span>
                      </div>
                    </div>

                    {repo && (
                      <div className="text-xs">
                        <a
                          href={repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-gray-700 hover:text-[#0a66c2] transition-colors inline-flex items-center gap-1"
                        >
                          <span>{repo}</span>
                          <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>
                    )}

                    {details}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
