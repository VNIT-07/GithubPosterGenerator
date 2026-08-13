/**
 * Developer Score Calculation Utility
 *
 * Calculates an overall developer score (0–100) from GitHub profile
 * and repository data across five weighted categories.
 *
 * Weights:
 *   Repository Quality  → 20%
 *   Community Impact     → 20%
 *   Consistency          → 20%
 *   Community            → 15%
 *   Tech Diversity       → 25%
 */

// ── Helpers ────────────────────────────────────────────────────────

/** Clamp a value between lo and hi. */
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/**
 * Logarithmic normalization: maps a raw count to 0–100 using
 *   score = (log(1 + value) / log(1 + ceiling)) * 100
 * This gives diminishing returns for huge values while keeping
 * sensitivity for small profiles.
 */
const logNorm = (value, ceiling) => {
  if (ceiling <= 0) return 0;
  const v = Math.max(0, value);
  return clamp((Math.log(1 + v) / Math.log(1 + ceiling)) * 100);
};

/**
 * Safe accessor — returns fallback when the value is null / undefined / NaN.
 */
const safe = (v, fallback = 0) =>
  v == null || Number.isNaN(v) ? fallback : v;

// ── Sub-score calculators ──────────────────────────────────────────

/**
 * Repository Quality (0–100)
 *
 * Considers: stars, forks, freshness, maintained count, popularity.
 */
export function calcRepoQuality(repos) {
  if (!repos || repos.length === 0) return 0;

  const totalStars = repos.reduce((s, r) => s + safe(r.stargazers_count), 0);
  const totalForks = repos.reduce((s, r) => s + safe(r.forks_count), 0);

  // Average stars per repo (log-scaled, ceiling 50 avg ≈ 100)
  const avgStars = totalStars / repos.length;
  const starScore = logNorm(avgStars, 50);

  // Average forks per repo (log-scaled, ceiling 20 avg ≈ 100)
  const avgForks = totalForks / repos.length;
  const forkScore = logNorm(avgForks, 20);

  // Freshness — proportion of repos updated in the last year
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const freshCount = repos.filter((r) => {
    const pushed = r.pushed_at || r.updated_at;
    return pushed && new Date(pushed).getTime() > oneYearAgo;
  }).length;
  const freshnessScore = clamp((freshCount / repos.length) * 100);

  // Maintained count (log-scaled, ceiling 30 repos ≈ 100)
  const maintainedScore = logNorm(repos.length, 30);

  // Popularity — best repo stars (log-scaled, ceiling 500)
  const bestStars = Math.max(...repos.map((r) => safe(r.stargazers_count)), 0);
  const popularityScore = logNorm(bestStars, 500);

  return clamp(
    Math.round(
      starScore * 0.25 +
        forkScore * 0.15 +
        freshnessScore * 0.25 +
        maintainedScore * 0.2 +
        popularityScore * 0.15
    )
  );
}

/**
 * Community Impact (0–100)
 *
 * Considers: total stars, total forks, followers, repo engagement, popular repos.
 */
export function calcCommunityImpact(user, repos) {
  if (!repos || repos.length === 0) {
    // Only followers available
    return clamp(Math.round(logNorm(safe(user?.followers), 500) * 0.5));
  }

  const totalStars = repos.reduce((s, r) => s + safe(r.stargazers_count), 0);
  const totalForks = repos.reduce((s, r) => s + safe(r.forks_count), 0);
  const totalWatchers = repos.reduce((s, r) => s + safe(r.watchers_count), 0);

  const starScore = logNorm(totalStars, 1000);
  const forkScore = logNorm(totalForks, 300);
  const followerScore = logNorm(safe(user?.followers), 500);

  // Engagement — watchers relative to repos
  const avgWatchers = totalWatchers / repos.length;
  const engagementScore = logNorm(avgWatchers, 50);

  // Popular repos — count of repos with ≥ 10 stars
  const popularCount = repos.filter(
    (r) => safe(r.stargazers_count) >= 10
  ).length;
  const popularScore = logNorm(popularCount, 10);

  return clamp(
    Math.round(
      starScore * 0.3 +
        forkScore * 0.15 +
        followerScore * 0.25 +
        engagementScore * 0.15 +
        popularScore * 0.15
    )
  );
}

/**
 * Consistency (0–100)
 *
 * Without the Events API we approximate from:
 *   - repos / year (creation cadence)
 *   - recency of pushes
 *   - spread of push dates (activity distribution)
 */
export function calcConsistency(user, repos) {
  if (!repos || repos.length === 0) return 0;

  // Account age in years (minimum 1)
  const createdAt = user?.created_at
    ? new Date(user.created_at).getTime()
    : Date.now();
  const ageYears = Math.max(
    1,
    (Date.now() - createdAt) / (365.25 * 24 * 60 * 60 * 1000)
  );

  // Repos per year (ceiling 10/year ≈ 100)
  const reposPerYear = repos.length / ageYears;
  const cadenceScore = logNorm(reposPerYear, 10);

  // Recency — how recently the most recent repo was pushed
  const pushTimes = repos
    .map((r) => {
      const t = r.pushed_at || r.updated_at;
      return t ? new Date(t).getTime() : 0;
    })
    .filter((t) => t > 0);

  let recencyScore = 0;
  if (pushTimes.length > 0) {
    const latestPush = Math.max(...pushTimes);
    const daysSincePush = (Date.now() - latestPush) / (24 * 60 * 60 * 1000);
    // Within 7 days → 100, within 30 → ~80, within 90 → ~50, >365 → low
    recencyScore = clamp(Math.round(100 * Math.exp(-daysSincePush / 60)));
  }

  // Activity spread — how many distinct months have pushes (last 2 years)
  const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
  const recentPushTimes = pushTimes.filter((t) => t > twoYearsAgo);
  const months = new Set(
    recentPushTimes.map((t) => {
      const d = new Date(t);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );
  // 24 possible months, ceiling at 18 active months for max score
  const spreadScore = clamp(Math.round((months.size / 18) * 100));

  // Active development — repos updated in last 6 months
  const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const recentlyActiveCount = repos.filter((r) => {
    const t = r.pushed_at || r.updated_at;
    return t && new Date(t).getTime() > sixMonthsAgo;
  }).length;
  const activeDevScore = logNorm(recentlyActiveCount, 15);

  return clamp(
    Math.round(
      cadenceScore * 0.2 +
        recencyScore * 0.3 +
        spreadScore * 0.3 +
        activeDevScore * 0.2
    )
  );
}

/**
 * Community (0–100)
 *
 * Considers: followers, following, forks received, issues enabled, open-source participation.
 */
export function calcCommunity(user, repos) {
  const followers = safe(user?.followers);
  const following = safe(user?.following);

  const followerScore = logNorm(followers, 500);
  const followingScore = logNorm(following, 200);

  if (!repos || repos.length === 0) {
    return clamp(
      Math.round(followerScore * 0.5 + followingScore * 0.5)
    );
  }

  const totalForks = repos.reduce((s, r) => s + safe(r.forks_count), 0);
  const forkScore = logNorm(totalForks, 200);

  // Repos with issues enabled (community-friendly signal)
  const issueEnabledCount = repos.filter((r) => r.has_issues).length;
  const issueScore = clamp(
    Math.round((issueEnabledCount / repos.length) * 100)
  );

  // Open issues across all repos (proxy for active participation)
  const totalOpenIssues = repos.reduce(
    (s, r) => s + safe(r.open_issues_count),
    0
  );
  const issueActivityScore = logNorm(totalOpenIssues, 100);

  return clamp(
    Math.round(
      followerScore * 0.3 +
        followingScore * 0.15 +
        forkScore * 0.2 +
        issueScore * 0.15 +
        issueActivityScore * 0.2
    )
  );
}

/**
 * Tech Diversity (0–100)
 *
 * Uses Shannon entropy of language distribution weighted by repo size.
 * Penalizes tiny repos to avoid over-rewarding noise.
 */
export function calcTechDiversity(repos, languages) {
  if (!repos || repos.length === 0) return 0;

  // Build size-weighted language distribution
  const langWeights = {};
  let totalWeight = 0;

  repos.forEach((r) => {
    if (!r.language) return;
    // Weight by repo size (min 1 to avoid zero-weight)
    const weight = Math.max(1, safe(r.size));
    langWeights[r.language] = (langWeights[r.language] || 0) + weight;
    totalWeight += weight;
  });

  const langEntries = Object.entries(langWeights);
  const langCount = langEntries.length;

  if (langCount === 0) return 0;
  if (langCount === 1) return 10; // Single language = minimal diversity

  // Shannon entropy
  let entropy = 0;
  langEntries.forEach(([, w]) => {
    const p = w / totalWeight;
    if (p > 0) entropy -= p * Math.log2(p);
  });

  // Max entropy for this many languages
  const maxEntropy = Math.log2(langCount);
  // Evenness (0–1): how evenly distributed the languages are
  const evenness = maxEntropy > 0 ? entropy / maxEntropy : 0;

  // Raw language count score (ceiling ~8 languages for max, but diminishing)
  const countScore = logNorm(langCount, 8);

  // Combine: evenness matters more than raw count
  const diversityRaw = evenness * 0.6 + countScore / 100 * 0.4;

  return clamp(Math.round(diversityRaw * 100));
}

// ── Label ──────────────────────────────────────────────────────────

/**
 * Returns a human-readable label for the given score.
 */
export function getScoreLabel(score) {
  if (score >= 90) return "Exceptional Developer";
  if (score >= 80) return "Strong Developer";
  if (score >= 70) return "Active Developer";
  if (score >= 60) return "Growing Developer";
  if (score >= 40) return "Developing Profile";
  return "Early Developer";
}

// ── Main entry ─────────────────────────────────────────────────────

/**
 * Calculate the overall Developer Score.
 *
 * @param {Object} user       — GitHub user object (from /users/:login)
 * @param {Array}  repos      — Array of repo objects (from /users/:login/repos)
 * @param {Array}  languages  — Processed language array [{name, percentage, color}]
 * @returns {{ overall: number, breakdown: Object, label: string }}
 */
export function calculateDeveloperScore(user, repos, languages) {
  const safeRepos = Array.isArray(repos) ? repos : [];
  const safeLangs = Array.isArray(languages) ? languages : [];

  const repoQuality = calcRepoQuality(safeRepos);
  const communityImpact = calcCommunityImpact(user, safeRepos);
  const consistency = calcConsistency(user, safeRepos);
  const community = calcCommunity(user, safeRepos);
  const techDiversity = calcTechDiversity(safeRepos, safeLangs);

  const overall = clamp(
    Math.round(
      repoQuality * 0.2 +
        communityImpact * 0.2 +
        consistency * 0.2 +
        community * 0.15 +
        techDiversity * 0.25
    )
  );

  return {
    overall,
    breakdown: {
      repoQuality,
      communityImpact,
      consistency,
      community,
      techDiversity,
    },
    label: getScoreLabel(overall),
  };
}
