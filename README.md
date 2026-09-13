# GitHub Developer Profile Poster Generator

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-FCC72B?style=for-the-badge&logo=vitest&logoColor=black)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A modern, dynamic React application that generates customizable, high-resolution infographic posters, developer profile analytics cards, and an interactive GitHub exploration dashboard from any GitHub user profile.

---

## Live Demo

Experience the live app directly in your browser:  
**[github-poster-generator.vercel.app](https://github-poster-generator.vercel.app)**

---

## Key Features

### Dynamic Infographic Poster Generator
- **Multi-Theme System**:
  - **Professional**: Clean, corporate LinkedIn-inspired design with crisp typography.
  - **Cyberpunk**: Dark futuristic aesthetic with glowing cyan accents and high contrast.
  - **Minimal**: Modern stone-themed minimalist presentation.
- **Developer Skill & Activity Matrix**: Interactive radar chart evaluating **Volume**, **Impact**, **Community**, **Consistency**, and **Stack** capabilities.
- **Developer Score Index**: Real-time calculated developer rating badge based on public repository contributions, followers, stack diversity, and star impact.
- **Language Breakdown & Star Badges**: Dynamic visual breakdown of top programming languages with accurate color tagging and repository star metrics.

### Multi-Format Export Engine with Live Preview
- **PNG**: High-definition raster image download (`.png`) optimized for social sharing.
- **PDF**: Printable profile document (`.pdf`) tailored for resumes and portfolios.
- **SVG**: Scalable vector graphic (`.svg`) for web and design integrations.
- **HTML**: Self-contained standalone webpage (`.html`) embedding the full layout and styling.
- **JSON**: Clean structured raw profile data (`.json`) with an instant **Copy JSON** utility.
- **Interactive Modal Preview**: Inspect the exact generated file preview before downloading.

### Interactive Exploration Dashboard & Sections
- **Slide-out Navigation Drawer**: Responsive sidebar menu with rotating developer inspiration quotes (Linus Torvalds, Edsger Dijkstra, Kent Beck, etc.).
- **Repositories Explorer**: Complete repository list with real-time search, language filtering, and sorting (by stars, forks, or update time).
- **Followers & Following Views**: Dedicated explorer and full interactive modal featuring search, pagination, avatar previews, and bidirectional follow tracking.
- **Pinned Repositories Showcase**: Highlight top-starred projects with GitHub REST API architecture fallbacks.
- **Starred Repositories**: Browse all repositories starred by any developer.
- **Contributions Breakdown**: Quantitative insights into recent commits, pull requests, issues, and pushed repositories.
- **Activity Feed**: Live timeline of recent public GitHub events (commits, PRs, forks, releases).

### Official Verified GitHub Achievements
- **Authentic Artwork**: Displays official GitHub achievement badges (Pull Shark, Quickdraw, Starstruck, Galaxy Brain, Pair Extraordinaire, Arctic Code Vault Contributor, YOLO).
- **Zero Fake Data**: Serverless verification API (`/api/achievements`) that scrapes and validates official public profile achievements.
- **Interactive Achievements Modal**: Detailed view showcasing criteria, unlocked tiers (Bronze, Silver, Gold), and descriptions.

### Directional Follow System
- **Real-Time Follow Status**: Context-aware Follow/Unfollow button with persistent state.
- **Directional Awareness**: Differentiates between whether you follow the user (`isFollowing`) and whether the user follows you (`followsYou` indicator).
- **Universal Self-Profile Safeguard**: Automatically hides follow controls when viewing your own authenticated profile (`isOwnProfile`).
- **Optimistic UI with Fallbacks**: Powered by Supabase with automatic local storage and in-memory fallback support.

### Real-Time Live Presence & Visitor Tracking
- **Supabase Realtime Presence**: Ultra-low latency WebSocket presence synchronization across active visitors globally.
- **Cross-Tab BroadcastChannel Synchronization**: Syncs visitor counts locally across multiple browser tabs without duplicate network requests or heartbeats.
- **Upstash Redis / Vercel KV REST Sliding Window**: Serverless heartbeat (`/api/visitors/heartbeat.js`) with 30-second TTL ZSET sliding-window tracking.
- **In-Memory Local Fallback**: Self-contained dev mode requiring zero external credentials or cloud setup.
- **Page Visibility API Optimization**: Automatically pauses heartbeat transmissions when tabs are backgrounded to conserve resources.

### Public Profile Publishing & Sharing
- **Publish Modal**: One-click profile publishing with customizable visibility (`public` or `unlisted`).
- **Standalone Public Profile View**: Direct shareable link (`/profile?u=...` or `?user=...`) with base64 state hydration, synced timestamps, and interactive actions.
- **Share Dialog**: Convenient modal to copy short URLs or trigger native mobile sharing.

### Search & Accessibility
- **Live Autocomplete User Search**: Real-time username suggestions with avatar previews powered by the GitHub Search API, URL auto-parsing, and keyboard navigation.
- **Fully Responsive**: Seamless performance across mobile, tablet, and desktop viewports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 (Hooks, Suspense, ForwardRef) |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 3.4 & PostCSS |
| **Icons** | Lucide React |
| **Canvas & Export Engine** | html2canvas |
| **Real-Time Presence** | Supabase Realtime & BroadcastChannel API |
| **Persistence & Cache** | Upstash Redis (REST API) & Vercel KV |
| **Serverless Functions** | Vercel Serverless Functions (`/api/*`) |
| **Testing Suite** | Vitest 3.0 |
| **Data Source** | GitHub REST API |

---

## Quick Start / Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/VNIT-07/GithubPosterGenerator.git
cd GithubPosterGenerator
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables (Optional)
Create a `.env` file from the provided template:

```bash
cp .env.example .env
```

```env
# 1. GitHub API Personal Access Token (Optional but Recommended)
# Increases rate limits from 60 requests/hour to 5,000 requests/hour.
VITE_GITHUB_TOKEN=your_github_personal_access_token

# 2. Supabase Realtime Presence (Optional: for live visitor counter)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 3. Upstash Redis (Optional: alternative presence backend & follow graph)
UPSTASH_REDIS_REST_URL=https://your-database-id.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# (Vercel KV alternative keys are also supported automatically):
# KV_REST_API_URL=https://your-kv-id.upstash.io
# KV_REST_API_TOKEN=your_kv_token
```

> **Zero-Config Local Fallback**: If Supabase or Upstash credentials are not provided, the application and Vite local server automatically fall back to built-in in-memory stores and local mocks. Zero external configuration is required to run the project locally.

### 4. Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` (or the port specified by Vite).

> The local Vite server includes built-in API middleware for `/api/visitors`, `/api/follows`, and `/api/achievements`, providing full serverless feature parity in local development without needing the Vercel CLI.

### 5. Run the Test Suite
```bash
npm test
```

---

## Setting Environment Variables for Live Deployments

When deploying to platforms such as **Vercel**:

1. Go to your project **Settings** -> **Environment Variables**.
2. Add the desired keys:
   - `VITE_GITHUB_TOKEN` — Your GitHub Personal Access Token.
   - `VITE_SUPABASE_URL` — Supabase project URL for real-time presence.
   - `VITE_SUPABASE_ANON_KEY` — Supabase anonymous API key.
   - `UPSTASH_REDIS_REST_URL` — Upstash Redis REST endpoint.
   - `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST token.
3. Trigger a deployment.

---

## Repository Architecture

```text
GithubPosterGenerator/
├── api/
│   ├── achievements/
│   │   └── index.js              # Serverless API: verified GitHub achievements scraper
│   ├── achievements.js           # Handler redirect for /api/achievements
│   ├── follows/
│   │   └── index.js              # Serverless API: directional follow relational store
│   ├── follows.js                # Handler redirect for /api/follows
│   └── visitors/
│       ├── heartbeat.js          # Serverless API: active visitor sliding-window TTL
│       └── index.js              # Handler redirect for /api/visitors
├── Poster.jsx                    # Core application component, poster canvas & export manager
├── src/
│   ├── sections/
│   │   ├── ActivitySection.jsx   # Public activity event timeline
│   │   ├── ContributionsSection.jsx # Commits, PRs, issues & touched repos metrics
│   │   ├── FollowersFollowingSection.jsx # Tabbed followers & following list view
│   │   ├── PinnedReposSection.jsx # Top-starred featured repositories
│   │   ├── RepositoriesSection.jsx # Searchable & filterable repositories view
│   │   └── StarredReposSection.jsx # Starred repositories explorer
│   ├── AchievementsModal.jsx     # Official GitHub achievements modal dialog
│   ├── achievementsService.js    # Official achievement definitions, badge assets & scraper
│   ├── DeveloperScore.jsx        # Developer score visual gauge & tier badge
│   ├── developerScore.js         # Algorithmic developer score calculation logic
│   ├── developerScore.test.js    # Vitest suite for developer score calculations
│   ├── FollowButton.jsx          # Context-aware directional Follow/Unfollow button
│   ├── FollowersFollowingModal.jsx # Interactive followers & following modal dialog
│   ├── followService.js          # Follow state management, directional rules & sync
│   ├── useFollowStatus.js        # React hook for follow status
│   ├── LiveVisitorCounter.jsx    # Real-time active visitor counter badge widget
│   ├── visitorSession.js         # UUID session management, Supabase Presence & BroadcastChannel
│   ├── visitorSession.test.js    # Vitest suite for visitor sessions & UUID logic
│   ├── PublicProfile.jsx         # Standalone public profile view with state hydration
│   ├── profileStorage.js         # Base64 snapshot persistence & share URL utilities
│   ├── profileStorage.test.js    # Vitest suite for profile storage serialization
│   ├── PublishModal.jsx          # Profile publishing modal with visibility options
│   ├── RightSidebar.jsx          # Quick actions, recent activity & achievement spotlight
│   ├── ShareDialog.jsx           # Share modal with clipboard copy & social triggers
│   ├── Sidebar.jsx               # Navigation drawer with developer inspiration quotes
│   ├── shared.jsx                # Shared UI primitives, radar chart & language color map
│   ├── supabaseClient.js         # Supabase client initialization & fallback detection
│   ├── main.jsx                  # React application entry point
│   └── index.css                 # Tailwind directives, custom utilities & animations
├── .env.example                  # Environment variables template
├── CNAME                         # Custom domain configuration
├── package.json                  # Scripts & dependencies
├── vite.config.js                # Vite config with built-in API dev server middleware
└── README.md                     # Project documentation
```

---

## License

This project is licensed under the [MIT License](LICENSE).