import React from 'react';

export const Card = React.forwardRef(({ children, className = "" }, ref) => (
  <div ref={ref} className={`rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
));

Card.displayName = "Card";

export const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) => {
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

export const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
);

export const RadarChart = ({ stats, color, theme }) => {
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

export const themeStyles = {
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

export const getLangColor = (lang) => {
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

export const getGithubHeaders = () => {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

