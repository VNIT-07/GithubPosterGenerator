# GitHub Developer Profile Poster Generator

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A modern, dynamic React application that generates customizable, high-resolution infographic posters and developer profile analytics cards from any GitHub user profile.

---

## Live Demo

Experience the live app directly in your browser:  
**[github-poster-generator.vercel.app](https://github-poster-generator.vercel.app)**

---

## Features

- **Live Autocomplete User Search**: Real-time username suggestions with avatar previews powered by the GitHub Search API, equipped with automatic URL parsing and rate-limit fallbacks.
- **Developer Skill & Activity Matrix**: Interactive radar chart evaluating **Volume**, **Impact**, **Community**, **Consistency**, and **Stack** capabilities.
- **Developer Score Index**: Real-time calculated developer rating badge based on public repository contributions, followers, stack diversity, and star impact.
- **Multi-Theme System**:
  - **Professional**: Clean, corporate LinkedIn-inspired design.
  - **Cyberpunk**: Dark futuristic aesthetic with glowing cyan accents.
  - **Minimal**: Subtle, stone-themed minimalist presentation.
- **Real-Time Live Visitor Counter**: Serverless active presence tracking powered by an anonymous UUID heartbeat mechanism and Upstash Redis sliding-window TTL, optimized with the Page Visibility API.
- **Multi-Format Export Engine with Live Preview**:
  - **PNG** — High-definition image download (`.png`) for social sharing.
  - **PDF** — Printable profile layout (`.pdf`) tailored for resumes and printing.
  - **SVG** — Vector graphic (`.svg`) for scalable design integrations.
  - **HTML** — Standalone web page (`.html`) containing the complete profile layout.
  - **JSON** — Structured raw data (`.json`) with an interactive **Copy JSON** utility.
- **Interactive Modal Preview**: Inspect the exact generated file preview before downloading.
- **Fully Responsive**: Seamless performance across mobile, tablet, and desktop viewports.

---

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Canvas / Export Engine**: html2canvas
- **Data Source**: GitHub REST API
- **Live Presence & Persistence**: Upstash Redis (REST API) & Vercel Serverless Functions

---

## Quick Start / Local Setup

Follow these steps to run the application locally:

### 1. Clone the repository
```bash
git clone https://github.com/VNIT-07/GithubPosterGenerator.git
cd GithubPosterGenerator
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables (Optional but Recommended)
To prevent GitHub API rate limits and enable real-time visitor tracking across multiple deployments, create a `.env` file from the provided template:

```bash
cp .env.example .env
```

```env
# GitHub Personal Access Token (Increases rate limits from 60 to 5,000 req/hr)
VITE_GITHUB_TOKEN=your_github_personal_access_token

# Upstash Redis (For Real-Time Global Visitor Counter)
UPSTASH_REDIS_REST_URL=https://your-database-id.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

> **Note**: If Upstash Redis credentials are not configured, the application automatically runs with a built-in local in-memory fallback with zero setup required.

### 4. Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## Setting Environment Variables for Live Deployments

When deploying to hosting platforms like **Vercel**:

1. Go to your project **Settings** -> **Environment Variables**.
2. Add the following keys:
   - `VITE_GITHUB_TOKEN` = `your_token_value`
   - `UPSTASH_REDIS_REST_URL` = `your_upstash_url`
   - `UPSTASH_REDIS_REST_TOKEN` = `your_upstash_token`
3. Redeploy your project.

---

## Repository Architecture

```text
GithubPosterGenerator/
├── api/
│   └── visitors/
│       ├── heartbeat.js       # Vercel Serverless Function (Upstash Redis Presence & TTL)
│       └── index.js           # API Entry Point for Visitor Count
├── Poster.jsx                 # Main Application Component & Multi-format Export System
├── src/
│   ├── DeveloperScore.jsx     # Developer Score Visual Component
│   ├── developerScore.js      # Score Metric Calculation Logic
│   ├── LiveVisitorCounter.jsx # Real-time Live Visitor Counter Badge Component
│   ├── visitorSession.js      # Anonymous UUID & Heartbeat Dispatcher
│   ├── profileStorage.js      # Profile Storage & Dynamic URL Link Utilities
│   ├── ShareDialog.jsx        # Social Share & Link Copy Dialog
│   ├── shared.jsx             # Shared UI Components & Design Tokens
│   ├── main.jsx               # React Root Entry Point
│   └── index.css              # Tailwind Directives & Animations
├── .env.example               # Environment Variables Template
├── CNAME                      # Custom Domain Configuration (githubpostergenerator.com)
├── package.json               # Scripts & Dependencies
├── vite.config.js             # Vite Server Configuration & Local API Dev Middleware
└── README.md                  # Project Documentation
```

---

## License

This project is licensed under the [MIT License](LICENSE).