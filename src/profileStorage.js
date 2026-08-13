import LZString from 'lz-string';

const STORAGE_KEY = 'gh_poster_published_profiles';

/**
 * Normalize username into a safe, lowercased slug.
 */
export function normalizeUsername(username) {
  if (!username) return '';
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

/**
 * Get all published profiles stored in localStorage.
 */
function getAllProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to read profiles from localStorage:', e);
    return {};
  }
}

/**
 * Save all profiles map back to localStorage.
 */
function saveAllProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save profiles to localStorage:', e);
  }
}

/**
 * Encode profile snapshot into a compressed URL-safe string.
 * Uses LZString if available, or native base64 fallback.
 */
export function encodeSnapshot(snapshot) {
  try {
    const jsonStr = JSON.stringify(snapshot);
    if (typeof LZString !== 'undefined' && LZString?.compressToEncodedURIComponent) {
      return LZString.compressToEncodedURIComponent(jsonStr);
    }
    // Native UTF-8 base64 URL safe fallback
    return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Failed to encode snapshot:', e);
    return '';
  }
}

/**
 * Decode profile snapshot from a compressed URL-safe string.
 */
export function decodeSnapshot(encodedStr) {
  if (!encodedStr) return null;
  try {
    if (typeof LZString !== 'undefined' && LZString?.decompressFromEncodedURIComponent) {
      const decompressed = LZString.decompressFromEncodedURIComponent(encodedStr);
      if (decompressed) return JSON.parse(decompressed);
    }
    // Native base64 decode fallback
    let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(base64), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (e) {
    console.error('Failed to decode snapshot:', e);
    return null;
  }
}

/**
 * Format a Date or ISO string dynamically to: "13 Aug 2026, 10:42 PM"
 */
export function formatSyncedTimestamp(dateInput = new Date()) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

/**
 * Save / update a published profile snapshot.
 */
export function saveProfileSnapshot({ userData, theme = 'professional', visibility = 'public' }) {
  if (!userData || !userData.login) {
    throw new Error('Invalid user data provided for publishing');
  }

  const slug = normalizeUsername(userData.login);
  const profiles = getAllProfiles();
  const existing = profiles[slug];
  const now = new Date().toISOString();

  const snapshot = {
    id: existing?.id || `profile_${slug}_${Date.now()}`,
    githubUsername: userData.login,
    slug,
    profileData: {
      avatar_url: userData.avatar_url,
      name: userData.name,
      login: userData.login,
      bio: userData.bio,
      location: userData.location,
      company: userData.company,
      created_at: userData.created_at,
      public_repos: userData.public_repos,
      followers: userData.followers,
      following: userData.following,
    },
    repositoryData: userData.top_repos || [],
    languageData: userData.languages || [],
    analyticsData: {
      chartStats: userData.chartStats || [],
      developerScore: userData.developerScore || null,
    },
    theme: theme || 'professional',
    visibility: visibility || 'public',
    published: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastSyncedAt: now,
  };

  profiles[slug] = snapshot;
  saveAllProfiles(profiles);

  return snapshot;
}

/**
 * Get profile snapshot by username.
 * Looks up localStorage first, or decodes URL payload as fallback.
 */
export function getProfileSnapshot(username, urlPayload = null) {
  const slug = normalizeUsername(username);
  const profiles = getAllProfiles();

  // 1. Check local storage
  if (profiles[slug]) {
    return profiles[slug];
  }

  // 2. Decode URL payload if passed
  if (urlPayload) {
    const decoded = decodeSnapshot(urlPayload);
    if (decoded && normalizeUsername(decoded.githubUsername) === slug) {
      return decoded;
    }
  }

  return null;
}

/**
 * Unpublish a profile (sets published = false).
 */
export function unpublishProfile(username) {
  const slug = normalizeUsername(username);
  const profiles = getAllProfiles();

  if (profiles[slug]) {
    profiles[slug].published = false;
    profiles[slug].updatedAt = new Date().toISOString();
    saveAllProfiles(profiles);
    return true;
  }

  return false;
}

/**
 * Get absolute public URL for a given profile.
 */
export function getPublicProfileUrl(username, snapshot = null) {
  const slug = normalizeUsername(username);
  const baseUrl = window.location.origin + window.location.pathname;

  let url = `${baseUrl}#/u/${slug}`;

  // If a snapshot is provided, attach compressed payload for cross-device/incognito sharing
  if (snapshot) {
    const encoded = encodeSnapshot(snapshot);
    if (encoded) {
      url += `?d=${encoded}`;
    }
  }

  return url;
}
