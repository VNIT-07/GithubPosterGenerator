# GitHub Developer Profile Poster Generator

[![Live Demo](https://img.shields.io/badge/Live%20Demo-githubpostergenerator.com-0a66c2?style=for-the-badge&logo=google-chrome&logoColor=white)](https://githubpostergenerator.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A modern, dynamic React application that generates customizable, high-resolution infographic posters and developer profile analytics cards from any GitHub user profile.

---

## Live Demo

Experience the live app directly in your browser:  
**[https://githubpostergenerator.com](https://githubpostergenerator.com)**

---

## Features

- **Live Autocomplete User Search**: Real-time username suggestions with avatar previews powered by the GitHub Search API, equipped with automatic URL parsing and rate-limit fallbacks.
- **Developer Skill & Activity Matrix**: Interactive radar chart evaluating **Volume**, **Impact**, **Community**, **Consistency**, and **Stack** capabilities.
- **Developer Score Index**: Real-time calculated developer rating badge based on public repository contributions, followers, stack diversity, and star impact.
- **Multi-Theme System**:
  - **Professional**: Clean, corporate LinkedIn-inspired design.
  - **Cyberpunk**: Dark futuristic aesthetic with glowing cyan accents.
  - **Minimal**: Subtle, stone-themed minimalist presentation.
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
To prevent GitHub API rate limits (60 requests/hour unauthenticated vs. 5,000 requests/hour authenticated), create a `.env` file in the root directory:

```env
VITE_GITHUB_TOKEN=your_github_personal_access_token
```

> **Note**: Generate a Personal Access Token (Classic with no special scopes required) at [GitHub Token Settings](https://github.com/settings/tokens).

### 4. Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## Setting Environment Variables for Live Deployments

When deploying to hosting platforms like **GitHub Pages**, **Vercel**, or **Netlify**:

- **Vercel / Netlify / Cloudflare Pages**:
  1. Go to your project **Settings** -> **Environment Variables**.
  2. Add `VITE_GITHUB_TOKEN` = `your_token_value`.
  3. Redeploy your project.

- **GitHub Pages (with GitHub Actions)**:
  1. Go to Repository **Settings** -> **Secrets and variables** -> **Actions**.
  2. Add a new repository secret named `VITE_GITHUB_TOKEN`.
  3. Reference the secret in your build workflow:
     ```yaml
     env:
       VITE_GITHUB_TOKEN: ${{ secrets.VITE_GITHUB_TOKEN }}
     ```

---

## Repository Architecture

```text
GithubPosterGenerator/
├── Poster.jsx             # Main Application Component & Multi-format Export System
├── src/
│   ├── DeveloperScore.jsx # Developer Score Visual Component
│   ├── developerScore.js  # Score Metric Calculation Logic
│   ├── main.jsx           # React Root Entry Point
│   └── index.css          # Tailwind Directives & Animations
├── CNAME                  # Custom Domain Configuration (githubpostergenerator.com)
├── package.json           # Scripts & Dependencies
├── vite.config.js         # Vite Server Configuration
└── README.md              # Project Documentation
```

---

## License

This project is licensed under the [MIT License](LICENSE).