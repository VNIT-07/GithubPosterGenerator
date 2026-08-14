import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  Github, 
  Code,
  Users, 
  GitBranch, 
  MapPin, 
  Calendar, 
  Download, 
  RefreshCw, 
  Briefcase,
  TrendingUp,
  Award,
  Layers,
  Share2,
  Globe
} from 'lucide-react';
import { calculateDeveloperScore } from './src/developerScore.js';
import DeveloperScore from './src/DeveloperScore.jsx';
const Card = React.forwardRef(({ children, className = "" }, ref) => (
  <div ref={ref} className={`rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
));

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) => {
  const baseStyle =
    "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 active:scale-95";

  const variants = {
    primary: "bg-[#0a66c2] text-white hover:bg-[#004182] shadow-sm",
    secondary: "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50",
    outline: "border-2 border-gray-200 text-gray-600 hover:border-[#0a66c2] hover:text-[#0a66c2] bg-transparent",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900",
    danger: "bg-red-50 text-red-600 hover:bg-red-100"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
);

const RadarChart = ({ stats, color, theme }) => {
  const size = 180;
  const center = size / 2;
  const radius = size / 2 - 25;
  const levels = 4;

  const getPoints = (data, r) => {
    const angleStep = (Math.PI * 2) / data.length;
    return data
      .map((point, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const value = (point.value / 100) * r;
        const x = center + Math.cos(angle) * value;
        const y = center + Math.sin(angle) * value;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const points = getPoints(stats, radius);
  const gridColor =
    theme === "cyberpunk" ? "rgba(0, 255, 255, 0.2)" : "#e5e7eb";
  const textColor =
    theme === "cyberpunk" ? "#22d3ee" : "#64748b";

  return (
    <div className="relative flex justify-center items-center">
      <svg width={size} height={size} className="overflow-visible">
        {[...Array(levels)].map((_, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={(radius / levels) * (i + 1)}
            fill="none"
            stroke={gridColor}
            strokeDasharray="4 4"
          />
        ))}

        {stats.map((_, i) => {
          const angle = (i * (Math.PI * 2) / stats.length) - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={gridColor}
            />
          );
        })}

        <polygon
          points={points}
          fill={color}
          fillOpacity="0.2"
          stroke={color}
          strokeWidth="2"
        />

        {stats.map((stat, i) => {
          const angle = (i * (Math.PI * 2) / stats.length) - Math.PI / 2;
          const labelRadius = radius + 15;
          const x = center + Math.cos(angle) * labelRadius;
          const y = center + Math.sin(angle) * labelRadius;
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dy="0.3em"
              fill={textColor}
              fontSize="9"
              fontWeight="600"
              className="uppercase tracking-wider font-sans"
            >
              {stat.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};




export default function App() {
  const [username, setUsername] = useState("VNIT-07");
  const [inputUsername, setInputUsername] = useState("VNIT-07");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [theme, setTheme] = useState("professional");

  const posterRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  // Fetch user suggestions from GitHub Search API (live / dynamic)
  const fetchSuggestions = (query) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
      requestIdRef.current++;
      return;
    }

    setSuggestionsLoading(true);
    setShowSuggestions(true);

    // Increment request ID so stale responses are ignored
    const currentRequestId = ++requestIdRef.current;

    debounceTimerRef.current = setTimeout(async () => {
      const token = import.meta.env.VITE_GITHUB_TOKEN;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const res = await fetch(
          `https://api.github.com/search/users?q=${encodeURIComponent(trimmed)}&per_page=7`,
          { headers }
        );

        // Only apply results if this is still the latest request
        if (currentRequestId !== requestIdRef.current) return;

        if (res.ok) {
          const data = await res.json();
          if (currentRequestId !== requestIdRef.current) return;
          setSuggestions(data.items || []);
          setShowSuggestions(true);
          setActiveSuggestionIndex(-1);
        }
      } catch {
        if (currentRequestId !== requestIdRef.current) return;
        // Network error — keep dropdown open, just clear loading
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setSuggestionsLoading(false);
        }
      }
    }, 150);
  };

  // Handle selecting a suggestion
  const handleSelectSuggestion = (login) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    requestIdRef.current++;
    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionsLoading(false);
    setActiveSuggestionIndex(-1);
    setInputUsername(login);
    setUsername(login);
    fetchGithubData(login);
  };

  // Handle keyboard navigation in suggestions
  const handleInputKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeSuggestionIndex].login);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLangColor = (lang) => {
    const colors = {
      Python: "#3572A5",
      JavaScript: "#F7DF1E",
      TypeScript: "#3178C6",
      HTML: "#e34c26",
      CSS: "#563d7c",
      Java: "#b07219",
      "C++": "#f34b7d",
      Go: "#00ADD8",
      Rust: "#dea584"
    };
    return colors[lang] || "#6e7681";
  };



  const fetchGithubData = async (userToFetch = username) => {
    setLoading(true);
    setError(null);

    const token = import.meta.env.VITE_GITHUB_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const userRes = await fetch(`https://api.github.com/users/${userToFetch}`, { headers });
      if (!userRes.ok) throw new Error("User not found");
      const user = await userRes.json();

      const reposRes = await fetch(
        `https://api.github.com/users/${userToFetch}/repos?sort=updated&per_page=100`,
        { headers }
      );
      const repos = await reposRes.json();



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

      const top_repos = repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 3)
        .map((r) => ({
          name: r.name,
          stars: r.stargazers_count,
          language: r.language
        }));



      // Calculate Developer Score from real fetched data
      const devScore = calculateDeveloperScore(user, repos, languages);

      setUserData({
        ...user,
        languages,
        top_repos,
        developerScore: devScore,

        chartStats: [
          { label: "Volume", value: Math.min(100, Math.max(30, user.public_repos * 3)) },
          { label: "Impact", value: Math.min(100, Math.max(20, user.followers * 5)) },
          { label: "Community", value: Math.min(100, Math.max(40, user.following * 4)) },
          { label: "Consistency", value: Math.min(100, Math.max(30, user.public_repos * 2)) },
          { label: "Stack", value: Math.min(100, languages.length * 20) }
        ]
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGithubData();
  }, []);

  const extractUsername = (input) => {
    const trimmed = input.trim();
    // Match GitHub profile URLs like https://github.com/username or github.com/username
    const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/?$/i);
    if (urlMatch) return urlMatch[1];
    return trimmed;
  };

  const handleDownload = async () => {
    const el = posterRef.current;
    if (!el) return;

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${userData?.login || 'github'}-poster.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try right-clicking the poster and selecting "Save as image".');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    requestIdRef.current++;
    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionsLoading(false);
    const user = extractUsername(inputUsername);
    if (user) {
      setInputUsername(user);
      setUsername(user);
      fetchGithubData(user);
    }
  };

  // Theme Styles
  const themeStyles = {
    professional: {
      bg: "bg-white text-gray-900 border border-gray-200 shadow-xl",
      accent: "#0a66c2",
      headerBg: "bg-gradient-to-r from-slate-900 to-slate-800 text-white",
      badge: "bg-blue-50 text-[#0a66c2] border border-blue-100",
      cardInner: "bg-slate-50 border border-slate-100"
    },
    cyberpunk: {
      bg: "bg-slate-950 text-cyan-400 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]",
      accent: "#06b6d4",
      headerBg: "bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border-b border-cyan-500/30 text-cyan-300",
      badge: "bg-cyan-950 text-cyan-400 border border-cyan-800",
      cardInner: "bg-slate-900/80 border border-cyan-500/20"
    },
    minimal: {
      bg: "bg-stone-50 text-stone-800 border border-stone-200 shadow-lg",
      accent: "#44403c",
      headerBg: "bg-stone-200 text-stone-900",
      badge: "bg-stone-200 text-stone-700",
      cardInner: "bg-white border border-stone-200"
    }
  };

  const currentTheme = themeStyles[theme];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      {/* Controls Container */}
      <div className="max-w-4xl mx-auto mb-8 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          {/* Search Form + Buttons */}
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1" ref={inputRef}>
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => {
                  setInputUsername(e.target.value);
                  fetchSuggestions(e.target.value);
                }}
                onKeyDown={handleInputKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  } else if (inputUsername.trim().length >= 1) {
                    fetchSuggestions(inputUsername);
                  }
                }}
                placeholder="Username or GitHub URL"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] h-10"
                autoComplete="off"
              />
              {/* Suggestions Dropdown */}
              {showSuggestions && (suggestions.length > 0 || suggestionsLoading) && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                  style={{ maxHeight: '360px', overflowY: 'auto', animation: 'fadeSlideIn 0.15s ease-out' }}
                >
                  {suggestionsLoading && suggestions.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-gray-400 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[#0a66c2]"></div>
                      Searching GitHub users…
                    </div>
                  ) : (
                    suggestions.map((user, index) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(user.login)}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 ${
                          index === activeSuggestionIndex
                            ? 'bg-blue-50 text-[#0a66c2]'
                            : 'text-gray-700 hover:bg-gray-50'
                        } ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={user.avatar_url}
                            alt={user.login}
                            className="w-8 h-8 rounded-full border border-gray-200"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold truncate">{user.login}</span>
                          <span className="text-[11px] text-gray-400 truncate">github.com/{user.login}</span>
                        </div>
                      </button>
                    ))
                  )}
                  {suggestionsLoading && suggestions.length > 0 && (
                    <div className="flex items-center justify-center py-2 border-t border-gray-100">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-300 border-t-[#0a66c2]"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button type="submit" disabled={loading} className="h-10 whitespace-nowrap">
              {loading ? <LoadingSpinner /> : <RefreshCw className="w-4 h-4" />}
              Generate
            </Button>
            <Button variant="secondary" onClick={handleDownload} disabled={loading || !userData} className="h-10 whitespace-nowrap">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </form>

          {/* Divider */}
          <div className="hidden md:block w-px h-8 bg-gray-200"></div>

          {/* Theme Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Layers className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Theme:</span>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {["professional", "cyberpunk", "minimal"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                    theme === t
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <LoadingSpinner />
            <p className="text-gray-500 text-sm">Fetching GitHub Profile...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center max-w-md">
            <p className="font-semibold">Failed to load profile</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : userData ? (
          <Card className={`w-full max-w-2xl ${currentTheme.bg} transition-all duration-300`} ref={posterRef}>
            {/* Header Section */}
            <div className={`p-6 ${currentTheme.headerBg}`}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <img
                  src={userData.avatar_url}
                  alt={userData.name || userData.login}
                  className="w-20 h-20 rounded-full border-2 border-white/20 shadow-md"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {userData.name || userData.login}
                  </h1>
                  <p className="text-sm opacity-80 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                    @{userData.login}
                    <a
                      href={`https://github.com/${userData.login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View ${userData.login}'s GitHub profile`}
                      className="inline-flex items-center opacity-60 hover:opacity-100 transition-all duration-200 hover:scale-110"
                      style={{ textDecoration: 'none', fontSize: '0.85em' }}
                    >
                      🔗
                    </a>
                  </p>
                  {userData.bio && (
                    <p className="text-xs mt-2 opacity-90 line-clamp-2 max-w-lg">
                      {userData.bio}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs opacity-75">
                    {userData.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {userData.location}
                      </span>
                    )}
                    {userData.company && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {userData.company}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Joined {new Date(userData.created_at).getFullYear()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Body Section */}
            <div className="p-6 space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg text-center ${currentTheme.cardInner}`}>
                  <span className="block text-xl font-bold">{userData.public_repos}</span>
                  <span className="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Repositories</span>
                </div>
                <div className={`p-3 rounded-lg text-center ${currentTheme.cardInner}`}>
                  <span className="block text-xl font-bold">{userData.followers}</span>
                  <span className="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Followers</span>
                </div>
                <div className={`p-3 rounded-lg text-center ${currentTheme.cardInner}`}>
                  <span className="block text-xl font-bold">{userData.following}</span>
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
                    {userData.languages.map((lang) => (
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
                    ))}
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="flex flex-col items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Developer Skill Matrix
                  </h3>
                  <RadarChart stats={userData.chartStats} color={currentTheme.accent} theme={theme} />
                </div>
              </div>

              {/* Developer Score */}
              {userData.developerScore && (
                <DeveloperScore
                  scoreData={userData.developerScore}
                  theme={theme}
                  currentTheme={currentTheme}
                />
              )}

              {/* Top Repositories */}
              {userData.top_repos && userData.top_repos.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> Top Repositories
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {userData.top_repos.map((repo) => (
                      <div key={repo.name} className={`p-3 rounded-lg ${currentTheme.cardInner} flex flex-col justify-between`}>
                        <p className="text-xs font-semibold truncate">{repo.name}</p>
                        <div className="flex items-center justify-between text-[11px] opacity-75 mt-2">
                          <span>{repo.language || "Plain"}</span>
                          <span>★ {repo.stars}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
