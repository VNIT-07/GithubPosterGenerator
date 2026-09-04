/**
 * Vercel Serverless Function: GET /api/achievements?username={username}
 * 
 * Fetches and parses verified public achievements from GitHub for the specified user.
 * Zero duplicate infrastructure, supports CORS, safe error handling.
 */

function normalizeSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract username parameter
  let username = '';
  if (req.query && req.query.username) {
    username = req.query.username;
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      username = parsedUrl.searchParams.get('username') || '';
    } catch {
      username = '';
    }
  }

  username = (username || '').trim();
  if (!username) {
    return res.status(400).json({
      error: 'Username query parameter is required',
      achievements: []
    });
  }

  try {
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };

    // First attempt: /username?tab=achievements
    const achievementsUrl = `https://github.com/${encodeURIComponent(username)}?tab=achievements`;
    const response = await fetch(achievementsUrl, {
      headers: fetchHeaders,
      redirect: 'follow'
    });

    let html = '';
    let status = response.status;

    if (response.ok) {
      html = await response.text();
    } else if (status === 404) {
      // If achievements tab returns 404, check main profile page
      const profileUrl = `https://github.com/${encodeURIComponent(username)}`;
      const profileRes = await fetch(profileUrl, {
        headers: fetchHeaders,
        redirect: 'follow'
      });
      if (profileRes.ok) {
        html = await profileRes.text();
      } else {
        return res.status(200).json({
          success: true,
          username,
          achievements: [],
          message: 'No public achievements found'
        });
      }
    } else {
      return res.status(200).json({
        success: false,
        username,
        achievements: [],
        message: 'Achievements unavailable'
      });
    }

    // Parse achievements from HTML
    const earned = [];
    const seenSlugs = new Set();

    // 1. Check for `<details data-achievement-slug="...">`
    const detailsRegex = /<details[^>]*data-achievement-slug="([^"]+)"[^>]*>([\s\S]*?)<\/details>/gi;
    let match;
    while ((match = detailsRegex.exec(html)) !== null) {
      const slug = match[1].toLowerCase().trim();
      const content = match[2];

      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);

        const imgMatch = content.match(/<img[^>]+src="([^">]+)"[^>]*alt="([^">]*)"/i) ||
                         content.match(/<img[^>]+alt="([^">]*)"[^>]*src="([^">]+)"/i);
        let badgeUrl = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : imgMatch[2]) : '';
        if (!badgeUrl.startsWith('http')) {
          const anySrc = content.match(/src="([^">]+)"/i);
          badgeUrl = anySrc ? anySrc[1] : '';
        }

        const h3Match = content.match(/<h3[^>]*>([^<]+)<\/h3>/i);
        let title = h3Match ? h3Match[1].trim() : '';
        if (!title && imgMatch) {
          title = (imgMatch[2] || imgMatch[1] || '').replace(/Achievement:\s*/i, '').trim();
        }

        const tierMatch = content.match(/<span[^>]*class="[^"]*Label[^"]*"[^>]*>([^<]+)<\/span>/i);
        const tier = tierMatch ? tierMatch[1].trim() : undefined;

        earned.push({
          slug,
          title: title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          badgeUrl,
          tier: tier || 'Earned',
          status: 'earned'
        });
      }
    }

    // 2. Check for achievement badge images on main profile
    if (earned.length === 0) {
      const badgeImgRegex = /<img[^>]+src="([^">]+)"[^>]+alt="Achievement:\s*([^">]+)"/gi;
      let imgMatch2;
      while ((imgMatch2 = badgeImgRegex.exec(html)) !== null) {
        const src = imgMatch2[1];
        const title = imgMatch2[2].trim();
        const slug = normalizeSlug(title);

        if (!seenSlugs.has(slug)) {
          seenSlugs.add(slug);
          earned.push({
            slug,
            title,
            badgeUrl: src,
            tier: 'Earned',
            status: 'earned'
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      username,
      achievements: earned,
      count: earned.length,
      message: earned.length > 0 ? 'Achievements retrieved' : 'No public achievements found'
    });
  } catch (error) {
    console.error('Error fetching GitHub achievements:', error);
    return res.status(200).json({
      success: false,
      username,
      achievements: [],
      message: 'Achievements unavailable'
    });
  }
}
