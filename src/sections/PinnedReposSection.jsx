import React from 'react';
import {
  Pin,
  Info,
  ExternalLink,
  Star,
  GitFork,
  Award
} from 'lucide-react';
import { getLangColor } from '../shared.jsx';

export default function PinnedReposSection({ username, topRepos = [] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Pin className="w-5 h-5 text-[#0a66c2]" />
              <span>Pinned Repositories</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Curated showcase repositories for @{username}
            </p>
          </div>

          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a66c2] hover:text-[#004182] transition-colors self-start sm:self-center"
          >
            <span>View Pinned on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* GitHub REST API Architectural Notice */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 text-xs text-blue-900 space-y-2">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0a66c2] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-blue-950">
              GitHub API Architecture Notice
            </h4>
            <p className="text-blue-800 leading-relaxed">
              GitHub does not expose pinned repositories through the standard REST endpoint. Pinned items require GitHub's authenticated GraphQL schema or scraping GitHub profile markup.
            </p>
            <p className="text-blue-700/90 pt-1">
              To ensure data integrity with zero fabricated data, we showcase @{username}'s top-starred featured repositories below, or you can jump directly to their profile pins.
            </p>
            <div className="pt-2">
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a66c2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors shadow-xs"
              >
                <span>View Pinned Repos on GitHub.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Featured / Top Starred Alternative Showcase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Featured Top Repositories</span>
          </h3>
          <span className="text-[11px] text-gray-400">
            Ranked by community stars
          </span>
        </div>

        {Array.isArray(topRepos) && topRepos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topRepos.map((repo) => (
              <a
                key={repo.name}
                href={`https://github.com/${username}/${repo.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-[#0a66c2]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#0a66c2] transition-colors truncate">
                      {repo.name}
                    </span>
                    <Pin className="w-3 h-3 text-[#0a66c2] shrink-0" />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {repo.description || `Public repository by @${username}`}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  {repo.language ? (
                    <span className="flex items-center gap-1.5 font-medium text-gray-700">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getLangColor(repo.language) }}
                      />
                      {repo.language}
                    </span>
                  ) : (
                    <span className="text-gray-400">Plain</span>
                  )}

                  <span className="flex items-center gap-1 font-semibold text-gray-700">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{repo.stars || 0}</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-xs text-gray-500">
            No public repositories available to feature.
          </div>
        )}
      </div>
    </div>
  );
}
