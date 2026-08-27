import React, { useState, useEffect } from 'react';
import {
  Github,
  Code,
  MapPin,
  Calendar,
  Briefcase,
  TrendingUp,
  Award,
  Share2,
  Lock,
  UserX,
  AlertTriangle,
  ArrowLeft,
  Home,
  ExternalLink,
  Star
} from 'lucide-react';
import { Card, RadarChart, themeStyles, getLangColor } from './shared';
import DeveloperScore from './DeveloperScore.jsx';
import ShareDialog from './ShareDialog.jsx';
import { calculateDeveloperScore } from './developerScore.js';
import {
  getProfileSnapshot,
  formatSyncedTimestamp,
  saveProfileSnapshot,
  getPublicProfileUrl
} from './profileStorage';

export default function PublicProfile({ username: propUsername }) {
  const getParams = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const u = propUsername || params.get('u') || params.get('user');
      const d = params.get('d');
      return { user: u, payload: d };
    } catch {
      return { user: propUsername, payload: null };
    }
  };
  const { user: username, payload: urlPayload } = getParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      if (!username) {
        setError('No username provided');
        setLoading(false);
        return;
      }

      // 1. Attempt to load snapshot from LocalStorage or URL compressed payload
      let existingSnapshot = getProfileSnapshot(username, urlPayload);

      if (existingSnapshot) {
        setSnapshot(existingSnapshot);
        setLoading(false);
        document.title = `${existingSnapshot.profileData.name || existingSnapshot.githubUsername} — Developer Profile`;
        return;
      }

      // 2. If no saved snapshot exists, fetch directly from GitHub API as a fallback
      try {
        const token = import.meta.env.VITE_GITHUB_TOKEN;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
        if (!userRes.ok) {
          if (userRes.status === 404) {
            setError('NOT_FOUND');
          } else {
            setError('API_ERROR');
          }
          setLoading(false);
          return;
        }

        const user = await userRes.json();

        const reposRes = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
          { headers }
        );
        const repos = reposRes.ok ? await reposRes.json() : [];

        // Languages distribution
        const langMap = {};
        let total = 0;
        repos.forEach((repo) => {
          if (repo.language) {
            langMap[repo.language] = (langMap[repo.language] || 0) + 1;
            total++;
          }
        });

        const languages = Object.entries(langMap)
          .map(([name, count]) => ({
            name,
            percentage: Math.round((count / total) * 100),
            color: getLangColor(name)
          }))
          .slice(0, 5);

        // Top Repos
        const top_repos = repos
          .sort((a, b) => b.stargazers_count - a.stargazers_count)
          .slice(0, 3)
          .map((r) => ({
            name: r.name,
            stars: r.stargazers_count,
            language: r.language
          }));

        // Developer Score
        const devScore = calculateDeveloperScore(user, repos, languages);

        const userDataCombined = {
          ...user,
          languages,
          top_repos,
          developerScore: devScore,
          chartStats: [
            { label: 'Volume', value: Math.min(100, Math.max(30, user.public_repos * 3)) },
            { label: 'Impact', value: Math.min(100, Math.max(20, user.followers * 5)) },
            { label: 'Community', value: Math.min(100, Math.max(40, user.following * 4)) },
            { label: 'Consistency', value: Math.min(100, Math.max(30, user.public_repos * 2)) },
            { label: 'Stack', value: Math.min(100, languages.length * 20) }
          ]
        };

        // Create & save auto-snapshot
        const freshSnapshot = saveProfileSnapshot({
          userData: userDataCombined,
          theme: 'professional',
          visibility: 'public'
        });

        setSnapshot(freshSnapshot);
        document.title = `${user.name || user.login} — Developer Profile`;
      } catch (err) {
        console.error('Failed to load public profile:', err);
        setError('SERVER_ERROR');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [username, urlPayload]);

  // Loading State Skeletons
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center items-center font-sans">
        <div className="w-full max-w-2xl bg-white rounded-xl p-6 shadow-md space-y-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-200 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-slate-100 rounded-lg" />
            <div className="h-16 bg-slate-100 rounded-lg" />
            <div className="h-16 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-48 bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }

  // Error States
  if (error || !snapshot) {
    if (error === 'NOT_FOUND') {
      return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center items-center font-sans">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md shadow-lg space-y-4">
            <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Profile Not Found</h2>
            <p className="text-sm text-gray-600">
              This developer profile does not exist or is no longer publicly available.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a66c2] text-white font-medium text-sm rounded-lg hover:bg-[#004182] transition-colors"
            >
              <Home className="w-4 h-4" /> Go Home
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center items-center font-sans">
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-md shadow-lg space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-600">We couldn't load this developer profile.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium text-sm rounded-lg hover:bg-black transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Check visibility and published flag
  if (!snapshot.published || snapshot.visibility === 'private') {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center items-center font-sans">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md shadow-lg space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Profile Unavailable</h2>
          <p className="text-sm text-gray-600">This developer profile is currently private.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a66c2] text-white font-medium text-sm rounded-lg hover:bg-[#004182] transition-colors"
          >
            <Home className="w-4 h-4" /> Go Home
          </a>
        </div>
      </div>
    );
  }

  // Profile data & styling
  const { profileData, repositoryData, languageData, analyticsData, theme, lastSyncedAt } = snapshot;
  const currentTheme = themeStyles[theme] || themeStyles.professional;
  const profileUrl = getPublicProfileUrl(snapshot.githubUsername, snapshot);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      {/* Navigation & Controls Bar */}
      <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center bg-white p-3 px-4 rounded-xl shadow-sm border border-gray-200">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Generator</span>
        </a>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="px-3 py-1.5 bg-[#0a66c2] text-white hover:bg-[#004182] text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Profile
          </button>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="max-w-4xl mx-auto flex justify-center">
        <Card className={`w-full max-w-2xl ${currentTheme.bg} transition-all duration-300`}>
          {/* Header Section */}
          <div className={`p-6 ${currentTheme.headerBg}`}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <img
                src={profileData.avatar_url}
                alt={profileData.name || profileData.login}
                className="w-20 h-20 rounded-full border-2 border-white/20 shadow-md"
                onError={(e) => {
                  e.target.src = `https://unavatar.io/github/${profileData.login}`;
                }}
              />
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight">
                  {profileData.name || profileData.login}
                </h1>
                <p className="text-sm opacity-80 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                  <span>@{profileData.login}</span>
                  <a
                    href={`https://github.com/${profileData.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${profileData.login}'s GitHub profile`}
                    className="inline-flex items-center opacity-60 hover:opacity-100 transition-all duration-200 hover:scale-110"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </p>
                {profileData.bio && (
                  <p className="text-xs mt-2 opacity-90 line-clamp-2 max-w-lg">
                    {profileData.bio}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs opacity-75">
                  {profileData.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {profileData.location}
                    </span>
                  )}
                  {profileData.company && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {profileData.company}
                    </span>
                  )}
                  {profileData.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Joined {new Date(profileData.created_at).getFullYear()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-6 space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg text-center ${currentTheme.cardInner}`}>
                <span className="block text-xl font-bold">{profileData.public_repos}</span>
                <span className="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Repositories</span>
              </div>
              <div className={`p-3 rounded-lg text-center ${currentTheme.cardInner}`}>
                <span className="block text-xl font-bold">{profileData.followers}</span>
                <span className="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Followers</span>
              </div>
              <div className={`p-3 rounded-lg text-center ${currentTheme.cardInner}`}>
                <span className="block text-xl font-bold">{profileData.following}</span>
                <span className="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Following</span>
              </div>
            </div>

            {/* Languages & Radar Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Top Languages */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" /> Top Languages
                </h3>
                <div className="space-y-2">
                  {languageData && languageData.length > 0 ? (
                    languageData.map((lang) => (
                      <div key={lang.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
                            {lang.name}
                          </span>
                          <span className="opacity-75">{lang.percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200/40 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${lang.percentage}%`,
                              backgroundColor: lang.color
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs opacity-60 italic">No language data available</p>
                  )}
                </div>
              </div>

              {/* Radar Chart */}
              {analyticsData.chartStats && (
                <div className="flex flex-col items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Developer Skill Matrix
                  </h3>
                  <RadarChart stats={analyticsData.chartStats} color={currentTheme.accent} theme={theme} />
                </div>
              )}
            </div>

            {/* Developer Score */}
            {analyticsData.developerScore && (
              <DeveloperScore
                scoreData={analyticsData.developerScore}
                theme={theme}
                currentTheme={currentTheme}
              />
            )}

            {/* Top Repositories */}
            {repositoryData && repositoryData.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Top Repositories
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {repositoryData.map((repo) => (
                    <a
                      key={repo.name}
                      href={`https://github.com/${profileData.login}/${repo.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 rounded-lg ${currentTheme.cardInner} flex flex-col justify-between hover:opacity-90 transition-opacity`}
                    >
                      <p className="text-xs font-semibold truncate">{repo.name}</p>
                      <div className="flex items-center justify-between text-[11px] opacity-75 mt-2">
                        <span>{repo.language || 'Plain'}</span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {repo.stars}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Timestamp */}
            <div className="pt-4 border-t border-gray-200/40 text-center">
              <p className="text-[11px] opacity-60">
                Last updated: {formatSyncedTimestamp(lastSyncedAt)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Share Modal */}
      <ShareDialog
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        username={profileData.name || profileData.login}
        profileUrl={profileUrl}
      />
    </div>
  );
}
