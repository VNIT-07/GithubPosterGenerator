import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Layers,
  Users,
  UserCheck,
  Pin,
  Star,
  BarChart3,
  Activity,
  Award,
  Sparkles,
  ArrowRight,
  RotateCw,
  X,
  Github
} from 'lucide-react';

const DEVELOPER_QUOTES = [
  {
    quote: "Build today, a better tomorrow.",
    author: "For a better GitHub"
  },
  {
    quote: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra"
  },
  {
    quote: "First, solve the problem. Then, write the code.",
    author: "John Johnson"
  },
  {
    quote: "Make it work, make it right, make it fast.",
    author: "Kent Beck"
  },
  {
    quote: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds"
  },
  {
    quote: "Code is like humor. When you have to explain it, it's bad.",
    author: "Cory House"
  }
];

export default function Sidebar({
  activeSection = 'overview',
  onSelectSection,
  userData,
  onCreatePoster,
  isOpen = false,
  onClose
}) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNextQuote = (e) => {
    e.stopPropagation();
    setQuoteIndex((prev) => (prev + 1) % DEVELOPER_QUOTES.length);
  };

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'repositories',
      label: 'Repositories',
      icon: Layers,
      badge: userData?.public_repos !== undefined ? userData.public_repos : null
    },
    {
      id: 'followers',
      label: 'Followers',
      icon: Users,
      badge: userData?.followers !== undefined ? userData.followers : null
    },
    {
      id: 'following',
      label: 'Following',
      icon: UserCheck,
      badge: userData?.following !== undefined ? userData.following : null
    },
    {
      id: 'pinned',
      label: 'Pinned Repos',
      icon: Pin,
      badge: null
    },
    {
      id: 'starred',
      label: 'Starred Repos',
      icon: Star,
      badge: null
    },
    {
      id: 'contributions',
      label: 'Contributions',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: Activity,
      badge: null
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Award,
      badge: null
    }
  ];

  const formatBadge = (num) => {
    if (num === null || num === undefined) return null;
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return num.toString();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between gap-4 p-4">
      <div className="space-y-4">
        {/* Header with Close Button (visible at all breakpoints) */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Github className="w-4 h-4" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">GitProfile</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Top Quote / Brand Card */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 relative group transition-all duration-200 hover:border-slate-300">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Inspiration</span>
            </div>
            <button
              type="button"
              onClick={handleNextQuote}
              title="Next quote"
              aria-label="Next developer quote"
              className="text-slate-400 hover:text-[#0a66c2] p-0.5 rounded transition-colors"
            >
              <RotateCw className="w-3 h-3 transition-transform group-hover:rotate-45 duration-200" />
            </button>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-800 leading-relaxed italic">
            "{DEVELOPER_QUOTES[quoteIndex].quote}"
          </p>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <span>—</span>
            <span className="truncate">{DEVELOPER_QUOTES[quoteIndex].author}</span>
          </div>
        </div>

        {/* 2. Sidebar Navigation */}
        <nav className="space-y-1" aria-label="Sidebar navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badgeValue = formatBadge(item.badge);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  if (onClose) onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-left group cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/90 text-[#0a66c2] font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                      isActive
                        ? 'text-[#0a66c2]'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {badgeValue !== null && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md shrink-0 transition-colors ${
                      isActive
                        ? 'bg-blue-100/80 text-[#0a66c2]'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                    }`}
                  >
                    {badgeValue}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom Area: CTA & Footer */}
      <div className="space-y-4 pt-2">
        {/* Share Your Profile CTA Card */}
        <div className="bg-gradient-to-b from-blue-50/50 to-slate-50 border border-blue-100 rounded-xl p-3.5 space-y-2.5">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Share Your Profile</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              Generate and share your beautiful GitHub profile card.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onCreatePoster) onCreatePoster();
              if (onClose) onClose();
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0a66c2] hover:bg-[#004182] text-white text-xs font-semibold shadow-xs transition-all duration-150 active:scale-98"
          >
            <span>Create Poster</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex" style={{ top: '60px' }}>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs sidebar-backdrop-in"
        style={{ top: '60px' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className="relative bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto no-scrollbar"
        style={{
          width: 'min(320px, 85vw)',
          animation: 'drawerSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {sidebarContent}
      </div>
    </div>
  );
}
