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
  Globe,
  ChevronDown,
  Check,
  AlertCircle,
  X,
  Eye,
  Copy
} from 'lucide-react';
import { calculateDeveloperScore } from './src/developerScore.js';
import DeveloperScore from './src/DeveloperScore.jsx';
import ShareDialog from './src/ShareDialog.jsx';
import { saveProfileSnapshot, getPublicProfileUrl } from './src/profileStorage.js';
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

const RadarChart = ({ stats = [], color, theme }) => {
  const safeStats = Array.isArray(stats) ? stats : [];
  if (safeStats.length === 0) return null;

  const size = 180;
  const center = size / 2;
  const radius = size / 2 - 25;
  const levels = 4;

  const getPoints = (data, r) => {
    const angleStep = (Math.PI * 2) / data.length;
    return data
      .map((point, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const val = Number(point?.value) || 0;
        const value = (val / 100) * r;
        const x = center + Math.cos(angle) * value;
        const y = center + Math.sin(angle) * value;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const points = getPoints(safeStats, radius);
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

        {safeStats.map((_, i) => {
          const angle = (i * (Math.PI * 2) / safeStats.length) - Math.PI / 2;
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

        {safeStats.map((stat, i) => {
          const angle = (i * (Math.PI * 2) / safeStats.length) - Math.PI / 2;
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const posterRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  // Multi-format Download, Preview Modal & Toast state
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const downloadDropdownRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        downloadDropdownRef.current &&
        !downloadDropdownRef.current.contains(e.target)
      ) {
        setShowDownloadDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDownloadDropdown(false);
        setPreviewModal(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch user suggestions from GitHub Search API (live / dynamic)
  const fetchSuggestions = (query) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const clean = extractUsername(query).replace(/^@/, '').trim();
    if (clean.length < 1) {
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
          `https://api.github.com/search/users?q=${encodeURIComponent(clean)}&per_page=7`,
          { headers }
        );

        // Only apply results if this is still the latest request
        if (currentRequestId !== requestIdRef.current) return;

        if (res.ok) {
          const data = await res.json();
          if (currentRequestId !== requestIdRef.current) return;
          const items = data.items || [];
          if (items.length > 0) {
            setSuggestions(items);
          } else {
            setSuggestions([{ id: 'fallback', login: clean, avatar_url: `https://github.com/${clean}.png` }]);
          }
          setShowSuggestions(true);
          setActiveSuggestionIndex(-1);
        } else {
          // On API limit or error, offer exact username fallback
          setSuggestions([{ id: 'fallback', login: clean, avatar_url: `https://github.com/${clean}.png` }]);
          setShowSuggestions(true);
        }
      } catch {
        if (currentRequestId !== requestIdRef.current) return;
        setSuggestions([{ id: 'fallback', login: clean, avatar_url: `https://github.com/${clean}.png` }]);
        setShowSuggestions(true);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setSuggestionsLoading(false);
        }
      }
    }, 200);
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
      if (!userRes.ok) {
        if (userRes.status === 403) {
          throw new Error("GitHub API rate limit exceeded. Please wait a minute or set VITE_GITHUB_TOKEN in your build settings.");
        } else if (userRes.status === 404) {
          throw new Error("User not found");
        } else {
          throw new Error(`GitHub API error (${userRes.status})`);
        }
      }
      const user = await userRes.json();

      const reposRes = await fetch(
        `https://api.github.com/users/${userToFetch}/repos?sort=updated&per_page=100`,
        { headers }
      );
      let repos = [];
      if (reposRes.ok) {
        const rawRepos = await reposRes.json();
        if (Array.isArray(rawRepos)) {
          repos = rawRepos;
        }
      }



      const langMap = {};
      let total = 0;

      if (Array.isArray(repos)) {
        repos.forEach((repo) => {
          if (repo && repo.language) {
            langMap[repo.language] = (langMap[repo.language] || 0) + 1;
            total++;
          }
        });
      }

      const languages = total > 0
        ? Object.entries(langMap)
            .map(([name, count]) => ({
              name,
              percentage: Math.round((count / total) * 100),
              color: getLangColor(name)
            }))
            .slice(0, 5)
        : [];

      const top_repos = Array.isArray(repos)
        ? repos
            .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
            .slice(0, 3)
            .map((r) => ({
              name: r.name,
              stars: r.stargazers_count || 0,
              language: r.language
            }))
        : [];

      // Calculate Developer Score from real fetched data
      const devScore = calculateDeveloperScore(user, repos, languages);

      const reposCount = Number(user?.public_repos) || 0;
      const followersCount = Number(user?.followers) || 0;
      const followingCount = Number(user?.following) || 0;
      const langsCount = Array.isArray(languages) ? languages.length : 0;

      setUserData({
        ...user,
        languages,
        top_repos,
        developerScore: devScore,

        chartStats: [
          { label: "Volume", value: Math.min(100, Math.max(30, reposCount * 3)) },
          { label: "Impact", value: Math.min(100, Math.max(20, followersCount * 5)) },
          { label: "Community", value: Math.min(100, Math.max(40, followingCount * 4)) },
          { label: "Consistency", value: Math.min(100, Math.max(30, reposCount * 2)) },
          { label: "Stack", value: Math.min(100, langsCount * 20) }
        ]
      });
    } catch (err) {
      console.error("Failed to fetch GitHub profile:", err);
      setError(err.message || "Failed to load GitHub profile");
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

  // ── Multi-Format Export & Preview Handlers ────────────
  const generateHTMLContent = (data) => {
    const title = `${data.name || data.login}'s GitHub Profile`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style> body { font-family: 'Inter', sans-serif; } </style>
</head>
<body class="bg-slate-100 min-h-screen p-4 md:p-12 flex items-center justify-center">
  <div class="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
    <div class="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <img src="${data.avatar_url}" alt="${data.login}" class="w-20 h-20 rounded-full border-2 border-white/20 shadow-md">
        <div class="flex-1 text-center sm:text-left">
          <h1 class="text-2xl font-bold tracking-tight">${data.name || data.login}</h1>
          <p class="text-sm opacity-80 mt-0.5">@${data.login}</p>
          ${data.bio ? `<p class="text-xs mt-2 opacity-90 line-clamp-2">${data.bio}</p>` : ''}
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs opacity-75">
            ${data.location ? `<span>📍 ${data.location}</span>` : ''}
            ${data.company ? `<span>💼 ${data.company}</span>` : ''}
            <span>📅 Joined ${new Date(data.created_at).getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="p-6 space-y-6 text-gray-800">
      <div class="grid grid-cols-3 gap-3">
        <div class="p-3 rounded-lg text-center bg-slate-50 border border-slate-100">
          <span class="block text-xl font-bold">${data.public_repos}</span>
          <span class="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Repositories</span>
        </div>
        <div class="p-3 rounded-lg text-center bg-slate-50 border border-slate-100">
          <span class="block text-xl font-bold">${data.followers}</span>
          <span class="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Followers</span>
        </div>
        <div class="p-3 rounded-lg text-center bg-slate-50 border border-slate-100">
          <span class="block text-xl font-bold">${data.following}</span>
          <span class="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Following</span>
        </div>
      </div>
      ${data.languages && data.languages.length > 0 ? `
      <div class="space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider opacity-70">Top Languages</h3>
        <div class="space-y-2">
          ${data.languages.map(lang => `
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-medium">
                <span class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${lang.color}"></span>
                  ${lang.name}
                </span>
                <span class="opacity-75">${lang.percentage}%</span>
              </div>
              <div class="w-full h-1.5 bg-gray-200/40 rounded-full overflow-hidden">
                <div class="h-full rounded-full" style="width: ${lang.percentage}%; background-color: ${lang.color}"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      ${data.top_repos && data.top_repos.length > 0 ? `
      <div class="space-y-3 pt-2">
        <h3 class="text-xs font-bold uppercase tracking-wider opacity-70">Top Repositories</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${data.top_repos.map(repo => `
            <div class="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <p class="text-xs font-semibold truncate">${repo.name}</p>
              <div class="flex items-center justify-between text-[11px] opacity-75 mt-2">
                <span>${repo.language || 'Plain'}</span>
                <span>★ ${repo.stars}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
  };

  const generateJSONData = (data) => {
    return {
      username: data.login,
      name: data.name,
      bio: data.bio,
      avatar_url: data.avatar_url,
      profile_url: data.html_url || `https://github.com/${data.login}`,
      location: data.location,
      company: data.company,
      joined: data.created_at,
      public_repos: data.public_repos,
      followers: data.followers,
      following: data.following,
      developerScore: data.developerScore || null,
      top_languages: data.languages || [],
      top_repositories: data.top_repos || [],
      chart_stats: data.chartStats || [],
      exported_at: new Date().toISOString()
    };
  };

  const openExportPreview = async (format) => {
    if (!userData) return;
    setShowDownloadDropdown(false);
    setPreviewLoading(true);

    try {
      const el = posterRef.current;
      const login = userData.login || 'github';

      if (format === 'png') {
        if (!el) throw new Error("Profile card element not found");
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null, logging: false });
        const dataUrl = canvas.toDataURL('image/png');
        setPreviewModal({
          format: 'png',
          title: 'PNG Image Preview',
          subtitle: 'High-quality profile image ready for download',
          filename: `${login}-profile.png`,
          previewUrl: dataUrl,
          dataUrl: dataUrl
        });
      } else if (format === 'pdf') {
        if (!el) throw new Error("Profile card element not found");
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false });
        const dataUrl = canvas.toDataURL('image/png');
        setPreviewModal({
          format: 'pdf',
          title: 'PDF Print Preview',
          subtitle: 'Printable profile layout ready for export',
          filename: `${login}-profile.pdf`,
          previewUrl: dataUrl,
          dataUrl: dataUrl
        });
      } else if (format === 'svg') {
        if (!el) throw new Error("Profile card element not found");
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null, logging: false });
        const dataUrl = canvas.toDataURL('image/png');
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="${dataUrl}"/>
</svg>`;
        setPreviewModal({
          format: 'svg',
          title: 'SVG Graphic Preview',
          subtitle: 'Scalable graphic element ready for download',
          filename: `${login}-profile.svg`,
          previewUrl: dataUrl,
          content: svgContent
        });
      } else if (format === 'html') {
        const htmlContent = generateHTMLContent(userData);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        setPreviewModal({
          format: 'html',
          title: 'HTML Standalone Preview',
          subtitle: 'Self-contained webpage export preview',
          filename: `${login}-profile.html`,
          previewUrl: blobUrl,
          content: htmlContent
        });
      } else if (format === 'json') {
        const exportObj = generateJSONData(userData);
        const jsonStr = JSON.stringify(exportObj, null, 2);
        setPreviewModal({
          format: 'json',
          title: 'JSON Profile Data Preview',
          subtitle: 'Structured developer analytics & profile data',
          filename: `${login}-profile.json`,
          content: jsonStr
        });
      }
    } catch (err) {
      console.error(`Failed to prepare ${format} preview:`, err);
      showToast(err.message || `Failed to generate ${format.toUpperCase()} preview`, 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmDownload = () => {
    if (!previewModal) return;
    setIsExporting(true);

    try {
      const { format, filename, dataUrl, content } = previewModal;

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
      } else if (format === 'pdf') {
        const printWindow = window.open('', '_blank');
        if (!printWindow) throw new Error("Pop-up blocked. Please allow pop-ups for PDF export.");
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                @page { size: auto; margin: 15mm; }
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                img { max-width: 100%; height: auto; display: block; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" onload="window.print();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      } else if (format === 'svg') {
        const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'html') {
        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'json') {
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }

      showToast(`Downloaded ${filename} successfully!`);
    } catch (err) {
      console.error('Download error:', err);
      showToast(err.message || 'Download failed', 'error');
    } finally {
      setIsExporting(false);
      setPreviewModal(null);
    }
  };

  const handleShare = () => {
    if (!userData) return;
    try {
      const snapshot = saveProfileSnapshot({
        userData,
        theme,
        visibility: 'public'
      });
      const url = getPublicProfileUrl(userData.login, snapshot);
      setShareUrl(url);
    } catch (err) {
      console.error('Share failed:', err);
      const fallbackUrl = getPublicProfileUrl(userData.login);
      setShareUrl(fallbackUrl);
    }
    setShowShareModal(true);
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

  const currentTheme = themeStyles[theme] || themeStyles.professional;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      {/* Controls Container */}
      <div className="max-w-4xl mx-auto mb-8 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        {/* Row 1: Search Bar + Generate + Download */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
            {showSuggestions && (
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
                ) : suggestions.length > 0 ? (
                  suggestions.map((user, index) => (
                    <button
                      key={user.id || user.login}
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
                          onError={(e) => {
                            e.target.src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                          }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold truncate">{user.login}</span>
                        <span className="text-[11px] text-gray-400 truncate">github.com/{user.login}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(extractUsername(inputUsername))}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <span>Generate poster for <strong>{extractUsername(inputUsername)}</strong></span>
                  </button>
                )}
                {suggestionsLoading && suggestions.length > 0 && (
                  <div className="flex items-center justify-center py-2 border-t border-gray-100">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-300 border-t-[#0a66c2]"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading} className="h-10 whitespace-nowrap flex-1 sm:flex-none justify-center">
              {loading ? <LoadingSpinner /> : <RefreshCw className="w-4 h-4" />}
              Generate
            </Button>
            <div className="relative flex-1 sm:flex-none" ref={downloadDropdownRef}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDownloadDropdown((prev) => !prev)}
                disabled={loading || !userData || isExporting}
                className="h-10 whitespace-nowrap w-full justify-center"
              >
                {isExporting ? <LoadingSpinner /> : <Download className="w-4 h-4" />}
                <span>Download</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showDownloadDropdown ? 'rotate-180' : ''}`} />
              </Button>

              {showDownloadDropdown && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2 text-left"
                  style={{ animation: 'fadeSlideIn 0.15s ease-out' }}
                >
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Download Profile
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => openExportPreview('png')}
                    disabled={isExporting}
                    className="w-full px-3.5 py-2 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-base leading-none mt-0.5">🖼️</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-[#0a66c2]">PNG</div>
                      <div className="text-[11px] text-gray-400">Best for sharing</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openExportPreview('pdf')}
                    disabled={isExporting}
                    className="w-full px-3.5 py-2 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-base leading-none mt-0.5">📄</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-[#0a66c2]">PDF</div>
                      <div className="text-[11px] text-gray-400">Best for resumes & printing</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openExportPreview('svg')}
                    disabled={isExporting}
                    className="w-full px-3.5 py-2 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-base leading-none mt-0.5">📐</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-[#0a66c2]">SVG</div>
                      <div className="text-[11px] text-gray-400">Scalable graphic</div>
                    </div>
                  </button>

                  <div className="my-1.5 border-t border-gray-100"></div>

                  <button
                    type="button"
                    onClick={() => openExportPreview('html')}
                    disabled={isExporting}
                    className="w-full px-3.5 py-2 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-base leading-none mt-0.5">🌐</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-[#0a66c2]">HTML</div>
                      <div className="text-[11px] text-gray-400">Standalone webpage</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openExportPreview('json')}
                    disabled={isExporting}
                    className="w-full px-3.5 py-2 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-base leading-none mt-0.5">📊</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-[#0a66c2]">JSON</div>
                      <div className="text-[11px] text-gray-400">Profile data</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Row 2: Share Button + Theme Dropdown */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <Button
            variant="secondary"
            onClick={handleShare}
            disabled={loading || !userData}
            className="h-10 whitespace-nowrap text-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </Button>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Theme:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="h-10 px-3 pr-8 text-xs font-semibold capitalize bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0a66c2] focus:border-[#0a66c2] cursor-pointer appearance-none transition-all hover:bg-gray-50"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              {["professional", "cyberpunk", "minimal"].map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
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

      {/* Share Modal */}
      {userData && (
        <ShareDialog
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          username={userData.name || userData.login}
          profileUrl={shareUrl || getPublicProfileUrl(userData.login)}
        />
      )}

      {/* Export Preview Modal */}
      {(previewLoading || previewModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-[#0a66c2]">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    {previewModal?.title || 'Preparing Preview...'}
                    {previewModal?.format && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-[#0a66c2]">
                        {previewModal.format}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500">{previewModal?.subtitle || 'Generating export file'}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Preview Area */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-center items-center bg-slate-100/50 min-h-[300px]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3 p-8">
                  <LoadingSpinner />
                  <p className="text-xs text-gray-500 font-medium">Generating export preview…</p>
                </div>
              ) : previewModal?.format === 'json' ? (
                <div className="w-full relative bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-[400px] shadow-inner">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(previewModal.content);
                      setPreviewModal(prev => ({ ...prev, isCopied: true }));
                      setTimeout(() => setPreviewModal(prev => prev ? ({ ...prev, isCopied: false }) : null), 2000);
                    }}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans border border-slate-700 transition-colors"
                  >
                    {previewModal.isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {previewModal.isCopied ? 'Copied!' : 'Copy JSON'}
                  </button>
                  <pre className="pr-20">{previewModal.content}</pre>
                </div>
              ) : previewModal?.format === 'html' ? (
                <div className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-md bg-white">
                  <iframe
                    src={previewModal.previewUrl}
                    title="HTML Export Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              ) : previewModal?.previewUrl ? (
                <div className="max-w-full overflow-hidden rounded-xl border border-gray-200 shadow-lg bg-white p-2">
                  <img
                    src={previewModal.previewUrl}
                    alt="Export Preview"
                    className="max-h-[380px] w-auto object-contain rounded-lg"
                  />
                </div>
              ) : null}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
              <span className="text-xs font-mono text-gray-400 truncate max-w-[220px]">
                {previewModal?.filename}
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setPreviewModal(null)}
                  className="text-xs h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmDownload}
                  disabled={previewLoading || !previewModal}
                  className="text-xs h-9 px-4 gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {previewModal?.format?.toUpperCase()}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-red-900 text-white border-red-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
          style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
