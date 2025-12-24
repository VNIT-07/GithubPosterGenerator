import React, { useState, useEffect, useRef } from 'react';
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
  Share2
} from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

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

export default function App() {
  const [username, setUsername] = useState("VNIT-07");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [theme, setTheme] = useState("professional");
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

  const fetchGithubData = async () => {
    setLoading(true);
    setError(null);

    try {
      const userRes = await fetch(`https://api.github.com/users/${username}`);
      if (!userRes.ok) throw new Error("User not found");
      const user = await userRes.json();

      const reposRes = await fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`
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

      setUserData({
        ...user,
        languages,
        top_repos,
        chartStats: [
          { label: "Volume", value: 80 },
          { label: "Impact", value: 65 },
          { label: "Community", value: 75 },
          { label: "Consistency", value: 90 },
          { label: "Stack", value: 60 }
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

  return <div className="min-h-screen bg-[#f3f2ef] p-6">...</div>;
}
