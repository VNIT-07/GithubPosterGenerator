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
  Activity
} from 'lucide-react';

const Card = React.forwardRef(({ children, className = "" }, ref) => (
  <div ref={ref} className={`rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
));

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false }) => {
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

const ContributionGraph = ({ contributionsByYear, theme, joinedYear, onYearChange, selectedYear, loadingYear }) => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= joinedYear; y--) {
    years.push(y);
  }

  const contributions = contributionsByYear[selectedYear] || {};

  const themeColors = {
    professional: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    cyberpunk: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    minimal: ['#ebedf0', '#d6c8b8', '#b8a08a', '#9a785c', '#7c5030']
  };

  const colors = themeColors[theme] || themeColors.professional;

  const getColor = (count) => {
    if (count === 0) return colors[0];
    if (count <= 2) return colors[1];
    if (count <= 5) return colors[2];
    if (count <= 8) return colors[3];
    return colors[4];
  };

  // Build weeks grid: for current year use "last 12 months", for past years use Jan 1 - Dec 31
  const weeks = [];
  let startDate, endDate;

  if (selectedYear === currentYear) {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setDate(oneYearAgo.getDate() - oneYearAgo.getDay());
    startDate = new Date(oneYearAgo);
    endDate = today;
  } else {
    startDate = new Date(selectedYear, 0, 1);
    // Align to start of week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());
    endDate = new Date(selectedYear, 11, 31);
  }

  const totalWeeks = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const numWeeks = Math.min(totalWeeks, 53);

  for (let w = 0; w < numWeeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);
      const key = date.toISOString().split('T')[0];
      const dateYear = date.getFullYear();
      // Only show cells that belong to the selected year (or current year range)
      const inRange = selectedYear === currentYear
        ? date <= endDate
        : dateYear === selectedYear;
      const count = inRange ? (contributions[key] || 0) : -1;
      week.push({ date: key, count, inRange });
    }
    weeks.push(week);
  }

  const months = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const d = new Date(week[0].date);
    const m = d.getMonth();
    if (m !== lastMonth) {
      months.push({ index: i, name: d.toLocaleString('en', { month: 'short' }) });
      lastMonth = m;
    }
  });

  const totalContributions = Object.values(contributions).reduce((a, b) => a + b, 0);

  // Compute totals per year for hover tooltips
  const yearTotals = {};
  years.forEach((y) => {
    const yearData = contributionsByYear[y];
    if (yearData) {
      yearTotals[y] = Object.values(yearData).reduce((a, b) => a + b, 0);
    }
  });

  const textColor = theme === 'cyberpunk' ? '#8b949e' : theme === 'minimal' ? '#78716c' : '#57606a';
  const totalColor = theme === 'cyberpunk' ? '#58a6ff' : theme === 'minimal' ? '#44403c' : '#0a66c2';

  const yearListBg = theme === 'cyberpunk' ? 'rgba(22, 27, 34, 0.8)' : theme === 'minimal' ? '#f5f5f4' : '#f6f8fa';
  const yearActiveBg = theme === 'cyberpunk' ? '#58a6ff' : theme === 'minimal' ? '#44403c' : '#0a66c2';
  const yearActiveText = '#ffffff';
  const yearHoverBg = theme === 'cyberpunk' ? 'rgba(88, 166, 255, 0.15)' : theme === 'minimal' ? '#e7e5e4' : '#eaeef2';
  const yearBorder = theme === 'cyberpunk' ? 'rgba(48, 54, 61, 0.8)' : theme === 'minimal' ? '#d6d3d1' : '#d0d7de';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Contribution Activity
        </h3>
        <span className="text-xs font-semibold" style={{ color: totalColor }}>
          {loadingYear ? '...' : totalContributions.toLocaleString()} contributions in {selectedYear === currentYear ? 'the last year' : selectedYear}
        </span>
      </div>

      <div className="flex gap-3">
        {/* Graph area */}
        <div className="flex-1 overflow-hidden" style={{ position: 'relative', minHeight: '110px' }}>
          {loadingYear ? (
            <div className="flex items-center justify-center" style={{ height: '110px' }}>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: totalColor }} />
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {/* Month labels */}
              <div className="flex" style={{ marginLeft: '28px' }}>
                {months.map((m, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-medium"
                    style={{
                      position: 'relative',
                      left: `${m.index * 13}px`,
                      color: textColor,
                      marginRight: i < months.length - 1
                        ? `${(months[i + 1]?.index - m.index) * 13 - 24}px`
                        : '0'
                    }}
                  >
                    {m.name}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div className="flex gap-0.5">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5 mr-1" style={{ width: '24px' }}>
                  {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-medium leading-none flex items-center justify-end"
                      style={{ height: '11px', color: textColor }}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                {/* Weeks columns */}
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        title={day.inRange ? `${day.count} contributions on ${day.date}` : ''}
                        style={{
                          width: '11px',
                          height: '11px',
                          backgroundColor: day.inRange ? getColor(day.count) : 'transparent',
                          borderRadius: '2px',
                          outline: day.inRange
                            ? (theme === 'cyberpunk' ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(27,31,36,0.06)')
                            : 'none'
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[9px]" style={{ color: textColor }}>Less</span>
                {colors.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: '11px',
                      height: '11px',
                      backgroundColor: c,
                      borderRadius: '2px',
                      outline: theme === 'cyberpunk' ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(27,31,36,0.06)'
                    }}
                  />
                ))}
                <span className="text-[9px]" style={{ color: textColor }}>More</span>
              </div>
            </div>
          )}
        </div>

        {/* Year list */}
        <div
          className="flex flex-col gap-0.5 shrink-0"
          style={{
            borderLeft: `1px solid ${yearBorder}`,
            paddingLeft: '8px',
            minWidth: '48px'
          }}
        >
          {years.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange(y)}
              title={yearTotals[y] !== undefined ? `${yearTotals[y].toLocaleString()} contributions in ${y}` : `Load ${y}`}
              className="transition-all duration-150 text-[11px] font-semibold rounded-md text-right"
              style={{
                padding: '3px 8px',
                backgroundColor: selectedYear === y ? yearActiveBg : 'transparent',
                color: selectedYear === y ? yearActiveText : textColor,
                cursor: 'pointer',
                border: 'none',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (selectedYear !== y) {
                  e.currentTarget.style.backgroundColor = yearHoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedYear !== y) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
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
  const [loadingContribYear, setLoadingContribYear] = useState(false);
  const posterRef = useRef(null);

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

  const fetchContributionsGraphQL = async (userToFetch, token, year = null) => {
    // For GraphQL, we can specify a date range via `from` and `to`
    const currentYear = new Date().getFullYear();
    let fromDate, toDate;

    if (year && year !== currentYear) {
      fromDate = `${year}-01-01T00:00:00Z`;
      toDate = `${year}-12-31T23:59:59Z`;
    } else {
      // Default: last 12 months
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      fromDate = oneYearAgo.toISOString();
      toDate = now.toISOString();
    }

    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username: userToFetch, from: fromDate, to: toDate }
      }),
    });

    if (!res.ok) throw new Error('GraphQL request failed');
    const data = await res.json();

    if (data.errors) throw new Error(data.errors[0].message);

    const calendar = data.data.user.contributionsCollection.contributionCalendar;
    const contributions = {};

    calendar.weeks.forEach((week) => {
      week.contributionDays.forEach((day) => {
        contributions[day.date] = day.contributionCount;
      });
    });

    return contributions;
  };

  const fetchContributionsPublicAPI = async (userToFetch, year = null) => {
    // Public API that scrapes GitHub contribution data — no token needed
    const yearParam = year ? year : 'last';
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${userToFetch}?y=${yearParam}`
    );

    if (!res.ok) throw new Error('Public contributions API failed');
    const data = await res.json();

    const contributions = {};
    if (data.contributions) {
      data.contributions.forEach((day) => {
        contributions[day.date] = day.count;
      });
    }

    return contributions;
  };

  const fetchContributions = async (userToFetch, token, year = null) => {
    // Strategy 1: Use GitHub GraphQL API (requires token, gives exact data)
    if (token) {
      try {
        return await fetchContributionsGraphQL(userToFetch, token, year);
      } catch (err) {
        console.warn('GraphQL contributions fetch failed, trying fallback:', err.message);
      }
    }

    // Strategy 2: Use public contributions API (no token needed)
    try {
      return await fetchContributionsPublicAPI(userToFetch, year);
    } catch (err) {
      console.warn('Public API contributions fetch failed:', err.message);
    }

    // Strategy 3: Return empty — show an empty graph rather than fake data
    return {};
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

      // Fetch contribution data for current year
      const currentYear = new Date().getFullYear();
      const contributions = await fetchContributions(userToFetch, token);
      const joinedYear = new Date(user.created_at).getFullYear();

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

      const totalContributions = Object.values(contributions).reduce((a, b) => a + b, 0);

      setUserData({
        ...user,
        languages,
        top_repos,
        contributionsByYear: { [currentYear]: contributions },
        joinedYear,
        selectedContribYear: currentYear,
        chartStats: [
          { label: "Volume", value: Math.min(100, Math.max(30, user.public_repos * 3)) },
          { label: "Impact", value: Math.min(100, Math.max(20, user.followers * 5)) },
          { label: "Community", value: Math.min(100, Math.max(40, user.following * 4)) },
          { label: "Consistency", value: Math.min(100, Math.max(30, (totalContributions / 365) * 25)) },
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
            <div className="relative flex-1">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder="Username or GitHub URL"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] h-10"
              />
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

              {/* Contribution Graph */}
              {userData.contributionsByYear && (
                <div className="pt-2">
                  <ContributionGraph
                    contributionsByYear={userData.contributionsByYear}
                    theme={theme}
                    joinedYear={userData.joinedYear}
                    selectedYear={userData.selectedContribYear}
                    loadingYear={loadingContribYear}
                    onYearChange={async (year) => {
                      if (userData.contributionsByYear[year]) {
                        setUserData(prev => ({ ...prev, selectedContribYear: year }));
                        return;
                      }
                      setLoadingContribYear(true);
                      setUserData(prev => ({ ...prev, selectedContribYear: year }));
                      const token = import.meta.env.VITE_GITHUB_TOKEN;
                      const yearData = await fetchContributions(userData.login, token, year);
                      setUserData(prev => ({
                        ...prev,
                        contributionsByYear: { ...prev.contributionsByYear, [year]: yearData }
                      }));
                      setLoadingContribYear(false);
                    }}
                  />
                </div>
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
