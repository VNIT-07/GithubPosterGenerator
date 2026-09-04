/**
 * GitHub Official Achievements Service
 * 
 * Manages official GitHub achievement definitions, authentic asset URLs,
 * dynamic fetching, and verification from public GitHub profiles.
 * Strictly zero fake badges or emoji replacements.
 */

export const OFFICIAL_ACHIEVEMENTS = [
  {
    slug: 'pull-shark',
    title: 'Pull Shark',
    description: 'Opened pull requests that have been successfully merged into codebases.',
    criteria: 'Merged 2 or more pull requests',
    badgeUrl: 'https://github.githubassets.com/assets/pull-shark-default--light-medium-bbfa33a17a26.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/pull-shark-default.png',
    tier: 'Bronze'
  },
  {
    slug: 'quickdraw',
    title: 'Quickdraw',
    description: 'Closed an issue or pull request within 5 minutes of opening.',
    criteria: 'Closed issue or PR within 5 minutes',
    badgeUrl: 'https://github.githubassets.com/assets/quickdraw-default--light-medium-5450fadcbe37.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/quickdraw-default.png',
    tier: 'Gold'
  },
  {
    slug: 'pair-extraordinaire',
    title: 'Pair Extraordinaire',
    description: 'Co-authored commits in a merged pull request.',
    criteria: 'Coauthored in a merged pull request',
    badgeUrl: 'https://github.githubassets.com/assets/pair-extraordinaire-default--light-medium-023a1005b4b1.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/pair-extraordinaire-default.png',
    tier: 'Silver'
  },
  {
    slug: 'starstruck',
    title: 'Starstruck',
    description: 'Created a repository that has earned stars from developers across GitHub.',
    criteria: 'Created repository with 16+ stars',
    badgeUrl: 'https://github.githubassets.com/assets/starstruck-default--light-medium-44e24ab4b60e.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/starstruck-default.png',
    tier: 'Bronze'
  },
  {
    slug: 'galaxy-brain',
    title: 'Galaxy Brain',
    description: 'Provided community answers that were officially accepted in GitHub Discussions.',
    criteria: '2 or more accepted answers in Discussions',
    badgeUrl: 'https://github.githubassets.com/assets/galaxy-brain-default--light-medium-2433e14316d3.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/galaxy-brain-default.png',
    tier: 'Silver'
  },
  {
    slug: 'yolo',
    title: 'YOLO',
    description: 'Merged own pull request without code review.',
    criteria: 'Merged PR without code review',
    badgeUrl: 'https://github.githubassets.com/assets/yolo-default--light-medium-61386ab71ef1.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/yolo-default.png',
    tier: 'Bronze'
  },
  {
    slug: 'arctic-code-vault-contributor',
    title: 'Arctic Code Vault Contributor',
    description: 'Contributed code to open source repositories preserved in the 2020 GitHub Archive Program.',
    criteria: 'Code captured in 2020 Arctic World Archive',
    badgeUrl: 'https://github.githubassets.com/assets/arctic-code-vault-contributor-default--light-medium-40e4f20e8b15.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/arctic-code-vault-contributor-default.png',
    tier: 'Special'
  },
  {
    slug: 'mars-2020-contributor',
    title: 'Mars 2020 Contributor',
    description: 'Contributed code to open source libraries used in NASA’s Mars 2020 Ingenuity Helicopter mission.',
    criteria: 'Contributed to Mars 2020 helicopter mission repos',
    badgeUrl: 'https://github.githubassets.com/assets/mars-2020-contributor-default--light-medium-14f77c3a0da4.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/mars-2020-contributor-default.png',
    tier: 'Special'
  },
  {
    slug: 'public-sponsor',
    title: 'Public Sponsor',
    description: 'Actively sponsoring open source developers and maintainers via GitHub Sponsors.',
    criteria: 'Active sponsor via GitHub Sponsors',
    badgeUrl: 'https://github.githubassets.com/assets/public-sponsor-default--light-medium-37d403ef8841.png',
    fallbackUrl: 'https://raw.githubusercontent.com/Schweinepriester/github-profile-achievements/main/images/public-sponsor-default.png',
    tier: 'Special'
  }
];

// In-memory cache keyed by lowercase username
const achievementsCache = new Map();

/**
 * Normalizes an achievement slug or title
 */
function normalizeSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Parses GitHub HTML response for authentic achievements
 */
export function parseAchievementsFromHtml(html, username) {
  const earned = [];
  const seenSlugs = new Set();

  if (!html || typeof html !== 'string') {
    return earned;
  }

  // Method 1: Target `<details data-achievement-slug="...">`
  const detailsRegex = /<details[^>]*data-achievement-slug="([^"]+)"[^>]*>([\s\S]*?)<\/details>/gi;
  let match;
  while ((match = detailsRegex.exec(html)) !== null) {
    const slug = match[1].toLowerCase().trim();
    const content = match[2];

    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);

      // Extract image URL
      const imgMatch = content.match(/<img[^>]+src="([^">]+)"[^>]*alt="([^">]*)"/i) ||
                       content.match(/<img[^>]+alt="([^">]*)"[^>]*src="([^">]+)"/i);
      let badgeUrl = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : imgMatch[2]) : '';
      if (!badgeUrl.startsWith('http')) {
        const anySrc = content.match(/src="([^">]+)"/i);
        badgeUrl = anySrc ? anySrc[1] : '';
      }

      // Extract title from <h3> or alt
      const h3Match = content.match(/<h3[^>]*>([^<]+)<\/h3>/i);
      let title = h3Match ? h3Match[1].trim() : '';
      if (!title && imgMatch) {
        const altText = (imgMatch[2] || imgMatch[1] || '').replace(/Achievement:\s*/i, '').trim();
        if (altText) title = altText;
      }

      // Extract tier / multiplier (e.g. "x2", "x3", "Gold")
      const tierMatch = content.match(/(?:tier|multiplier|Label)[^>]*>([^<]+)<\//i) ||
                        content.match(/<span[^>]*class="[^"]*Label[^"]*"[^>]*>([^<]+)<\/span>/i);
      const tier = tierMatch ? tierMatch[1].trim() : undefined;

      // Find official metadata if available
      const official = OFFICIAL_ACHIEVEMENTS.find((a) => a.slug === slug || normalizeSlug(a.title) === slug);

      earned.push({
        slug,
        title: title || official?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: official?.description || 'Verified GitHub profile achievement.',
        criteria: official?.criteria || 'Earned on GitHub',
        badgeUrl: badgeUrl || official?.badgeUrl || official?.fallbackUrl,
        tier: tier || official?.tier || 'Earned',
        status: 'earned',
        earnedAt: new Date().toISOString()
      });
    }
  }

  // Method 2: Main profile sidebar or summary badge images
  if (earned.length === 0) {
    const badgeImgRegex = /<img[^>]+src="([^">]+)"[^>]+alt="Achievement:\s*([^">]+)"/gi;
    let imgMatch2;
    while ((imgMatch2 = badgeImgRegex.exec(html)) !== null) {
      const src = imgMatch2[1];
      const title = imgMatch2[2].trim();
      const slug = normalizeSlug(title);

      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        const official = OFFICIAL_ACHIEVEMENTS.find((a) => a.slug === slug);
        earned.push({
          slug,
          title: title || official?.title,
          description: official?.description || 'Verified GitHub profile achievement.',
          criteria: official?.criteria || 'Earned on GitHub',
          badgeUrl: src || official?.badgeUrl,
          tier: official?.tier || 'Earned',
          status: 'earned'
        });
      }
    }
  }

  return earned;
}

/**
 * Fetches verified real GitHub achievements for a given username.
 * Returns { success: boolean, achievements: Array, message: string }
 */
export async function fetchUserAchievements(username) {
  if (!username || typeof username !== 'string') {
    return {
      success: false,
      achievements: [],
      message: 'Username is required'
    };
  }

  const cleanUser = username.trim().toLowerCase();

  // Check cache first
  if (achievementsCache.has(cleanUser)) {
    return achievementsCache.get(cleanUser);
  }

  // Attempt 1: Call internal API endpoint `/api/achievements?username={cleanUser}`
  try {
    const res = await fetch(`/api/achievements?username=${encodeURIComponent(cleanUser)}`, {
      headers: { Accept: 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      const result = {
        success: true,
        username: cleanUser,
        achievements: Array.isArray(data.achievements) ? data.achievements : [],
        message: data.message || (data.achievements?.length > 0 ? 'Verified' : 'No public achievements found')
      };
      achievementsCache.set(cleanUser, result);
      return result;
    }
  } catch (err) {
    // API endpoint might be unhandled in static preview; proceed to fallback proxy
    console.warn('API route /api/achievements unreachable, trying direct proxy fallback:', err);
  }

  // Attempt 2: Direct public proxy fallback for static hosting
  try {
    const targetUrl = `https://github.com/${cleanUser}?tab=achievements`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const parsed = parseAchievementsFromHtml(html, cleanUser);

      const result = {
        success: true,
        username: cleanUser,
        achievements: parsed,
        message: parsed.length > 0 ? 'Verified' : 'No public achievements found'
      };
      achievementsCache.set(cleanUser, result);
      return result;
    }
  } catch (proxyErr) {
    console.warn('Proxy fallback failed:', proxyErr);
  }

  // If all live fetches fail, return clean unavailable state
  const unavailableResult = {
    success: false,
    username: cleanUser,
    achievements: [],
    message: 'Achievements unavailable'
  };
  return unavailableResult;
}

/**
 * Clears cached achievements (useful when switching users or refreshing)
 */
export function clearAchievementsCache(username) {
  if (username) {
    achievementsCache.delete(username.trim().toLowerCase());
  } else {
    achievementsCache.clear();
  }
}
