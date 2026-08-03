# Github Poster Generator 🎨

A sleek, dynamic React component that generates a customizable, shareable infographic/poster card showcasing GitHub user stats, top languages, top repositories, and activity radar charts.

## Features ✨

- **User Search**: Instantly fetch profile data for any public GitHub username.
- **Top Languages Breakdown**: Visual percentage breakdown of languages used across repositories.
- **Top Repositories**: Showcase top starred repositories with star counts and primary languages.
- **Developer Radar Chart**: Interactive radar graph rating development volume, impact, community, consistency, and stack versatility.
- **Multiple Visual Themes**:
  - **Professional**: Clean, corporate LinkedIn-style aesthetic.
  - **Cyberpunk**: Dark neon glow theme for futuristic vibes.
  - **Minimal**: Subtle, modern minimalist style.

## Tech Stack 🛠️

- **React** (Hooks, SVG rendering)
- **Lucide React** (Icons)
- **Tailwind CSS** (Styling & utility classes)
- **GitHub REST API** (User & repository statistics)

## Quick Start / How to Run 🚀

Since this repository contains a standalone React component ([Poster.jsx](file:///Users/pc5/Documents/Vinit/GithubPosterGenerator/Poster.jsx)), you can run it in a React application environment using **Vite** or **Next.js/Create-React-App**.

---

### Option A: Create a New Vite React Project (Recommended)

1. **Create a Vite React app** inside a project folder:
   ```bash
   npx create-vite@latest my-app --template react
   cd my-app
   ```

2. **Install required dependencies**:
   ```bash
   npm install lucide-react
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **Configure Tailwind CSS** in `tailwind.config.js`:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

4. **Add Tailwind directives** to `src/index.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

5. **Copy [Poster.jsx](file:///Users/pc5/Documents/Vinit/GithubPosterGenerator/Poster.jsx)** into your `src/` directory.

6. **Import and render `Poster`** in `src/App.jsx`:
   ```jsx
   import Poster from './Poster';

   function App() {
     return <Poster />;
   }

   export default App;
   ```

7. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open the browser URL (typically `http://localhost:5173`) to view and interact with the application.

---

### Option B: Integration into an Existing React Project

1. Copy [Poster.jsx](file:///Users/pc5/Documents/Vinit/GithubPosterGenerator/Poster.jsx) into your React project.
2. Install [lucide-react](https://lucide.dev):
   ```bash
   npm install lucide-react
   ```
3. Ensure **Tailwind CSS** is installed and configured in your project.
4. Import and render `<Poster />` in your page or view component.


## License 📄

This project is licensed under the MIT License - see the [LICENSE](file:///Users/pc5/Documents/Vinit/GithubPosterGenerator/LICENSE) file for details.