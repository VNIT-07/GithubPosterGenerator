import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  ExternalLink,
  GitCommit,
  GitPullRequest,
  AlertCircle,
  Calendar,
  Layers,
  FileCode,
  Info
} from 'lucide-react';
import { getGithubHeaders } from '../shared.jsx';

export default function ContributionsSection({ username, userData }) {
  const [eventStats, setEventStats] = useState({
    commits: 0,
    pullRequests: 0,
    issues: 0,
    reposPushed: 0
  });
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef({});

  useEffect(() => {
    let isCancelled = false;

    const fetchRecentContributions = async () => {
      if (cacheRef.current[username]) {
        setEventStats(cacheRef.current[username]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const headers = getGithubHeaders();
        const res = await fetch(
          `https://api.github.com/users/${username}/events/public?per_page=100`,
          { headers }
        );

        if (res.ok) {
          const events = await res.json();
          let commits = 0;
          let pullRequests = 0;
          let issues = 0;
          const reposPushedSet = new Set();

          if (Array.isArray(events)) {
            events.forEach((ev) => {
              if (ev.type === 'PushEvent') {
                const count = ev.payload?.commits?.length || 1;
                commits += count;
                if (ev.repo?.name) reposPushedSet.add(ev.repo.name);
              } else if (ev.type === 'PullRequestEvent') {
                pullRequests += 1;
              } else if (ev.type === 'IssuesEvent') {
                issues += 1;
              }
            });
          }

          const calculated = {
            commits,
            pullRequests,
            issues,
            reposPushed: reposPushedSet.size
          };

          if (!isCancelled) {
            setEventStats(calculated);
            cacheRef.current[username] = calculated;
          }
        }
      } catch (err) {
        console.warn('Could not fetch recent contribution events:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchRecentContributions();

    return () => {
      isCancelled = true;
    };
  }, [username]);

  const joinedYear = userData?.created_at
    ? new Date(userData.created_at).getFullYear()
    : null;

  const calculateYearsOnGithub = () => {
    if (!userData?.created_at) return null;
    const diff = Date.now() - new Date(userData.created_at).getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return years > 0 ? `${years}+ years` : 'Less than 1 year';
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0a66c2]" />
              <span>Contributions & Activity Overview</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Verified public contribution footprint for @{username}
            </p>
          </div>

          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a66c2] hover:text-[#004182] transition-colors self-start sm:self-center"
          >
            <span>View GitHub Graph</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* GitHub Contribution Heatmap Limitation Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-800 space-y-2">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0a66c2] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900">
              Contribution Heatmap Data Availability
            </h4>
            <p className="text-slate-600 leading-relaxed">
              GitHub does not provide an official public REST endpoint for the interactive 365-day contribution calendar heatmap graph, which combines private and public contributions.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Rather than fabricating mock contribution numbers, GitProfile summarizes real, verified metrics below from the GitHub REST API and links directly to the official calendar graph.
            </p>
            <div className="pt-2">
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a66c2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors shadow-xs"
              >
                <span>Open Full Contribution Calendar on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Real Contribution Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Public Repos */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Public Repos
            </span>
            <Layers className="w-4 h-4 text-[#0a66c2]" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {userData?.public_repos?.toLocaleString() || 0}
          </div>
          <p className="text-[11px] text-gray-400">Repositories authored & shared</p>
        </div>

        {/* Metric 2: Public Gists */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Public Gists
            </span>
            <FileCode className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {userData?.public_gists?.toLocaleString() || 0}
          </div>
          <p className="text-[11px] text-gray-400">Code snippets published</p>
        </div>

        {/* Metric 3: Recent Push Commits */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Recent Commits
            </span>
            <GitCommit className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? (
              <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
            ) : (
              eventStats.commits
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            From latest 100 public events
          </p>
        </div>

        {/* Metric 4: Member Since */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Tenure
            </span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {calculateYearsOnGithub() || 'Active'}
          </div>
          <p className="text-[11px] text-gray-400">
            {joinedYear ? `Member since ${joinedYear}` : 'GitHub member'}
          </p>
        </div>
      </div>

      {/* Additional Verified Activity Summary */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Recent Public Event Distribution
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-lg font-bold text-slate-900">{eventStats.reposPushed}</div>
            <div className="text-xs text-slate-500 mt-0.5">Active Repositories Pushed</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-lg font-bold text-slate-900">{eventStats.pullRequests}</div>
            <div className="text-xs text-slate-500 mt-0.5">Recent Pull Requests</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-lg font-bold text-slate-900">{eventStats.issues}</div>
            <div className="text-xs text-slate-500 mt-0.5">Recent Issues Opened</div>
          </div>
        </div>
      </div>
    </div>
  );
}
