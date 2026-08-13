import { describe, it, expect } from 'vitest';
import {
  calculateDeveloperScore,
  calcRepoQuality,
  calcCommunityImpact,
  calcConsistency,
  calcCommunity,
  calcTechDiversity,
  getScoreLabel,
} from './developerScore.js';

// ── Helpers to build mock data ──────────────────────────────────

function makeRepo(overrides = {}) {
  return {
    name: 'test-repo',
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    size: 100,
    language: 'JavaScript',
    has_issues: true,
    open_issues_count: 0,
    pushed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    login: 'testuser',
    public_repos: 5,
    followers: 0,
    following: 0,
    created_at: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('Developer Score', () => {
  // 1. Empty profile
  describe('Empty profile', () => {
    it('returns 0 overall for null/empty inputs', () => {
      const result = calculateDeveloperScore(null, null, null);
      expect(result.overall).toBe(0);
      expect(result.label).toBe('Early Developer');
    });

    it('returns 0 overall for empty arrays', () => {
      const result = calculateDeveloperScore({}, [], []);
      expect(result.overall).toBe(0);
    });

    it('handles 0 repos and 0 followers', () => {
      const user = makeUser({ public_repos: 0, followers: 0, following: 0 });
      const result = calculateDeveloperScore(user, [], []);
      expect(result.overall).toBe(0);
    });
  });

  // 2. Low-activity developer
  describe('Low-activity developer', () => {
    it('produces a low but non-zero score', () => {
      const user = makeUser({ public_repos: 2, followers: 1, following: 3 });
      const repos = [
        makeRepo({
          stargazers_count: 0,
          forks_count: 0,
          language: 'Python',
          size: 50,
          pushed_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        makeRepo({
          stargazers_count: 1,
          forks_count: 0,
          language: 'Python',
          size: 30,
          pushed_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ];
      const result = calculateDeveloperScore(user, repos, []);
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThan(50);
    });
  });

  // 3. Average developer
  describe('Average developer', () => {
    it('produces a moderate score', () => {
      const user = makeUser({ public_repos: 15, followers: 30, following: 50 });
      const repos = Array.from({ length: 15 }, (_, i) =>
        makeRepo({
          name: `repo-${i}`,
          stargazers_count: Math.floor(Math.random() * 20),
          forks_count: Math.floor(Math.random() * 5),
          language: ['JavaScript', 'Python', 'TypeScript', 'Go'][i % 4],
          size: 500 + i * 100,
          pushed_at: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      );
      const result = calculateDeveloperScore(user, repos, []);
      expect(result.overall).toBeGreaterThanOrEqual(30);
      expect(result.overall).toBeLessThanOrEqual(80);
    });
  });

  // 4. Highly active developer
  describe('Highly active developer', () => {
    it('produces a high score', () => {
      const user = makeUser({
        public_repos: 80,
        followers: 500,
        following: 100,
        created_at: new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const langs = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C++'];
      const repos = Array.from({ length: 50 }, (_, i) =>
        makeRepo({
          name: `repo-${i}`,
          stargazers_count: 20 + Math.floor(i * 5),
          forks_count: 5 + Math.floor(i * 2),
          watchers_count: 10 + i,
          language: langs[i % langs.length],
          size: 2000 + i * 300,
          has_issues: true,
          open_issues_count: Math.floor(i / 3),
          pushed_at: new Date(Date.now() - (i * 7) * 24 * 60 * 60 * 1000).toISOString(),
        })
      );

      const result = calculateDeveloperScore(user, repos, []);
      expect(result.overall).toBeGreaterThanOrEqual(70);
    });
  });

  // 5. Missing contribution data
  describe('Missing contribution data', () => {
    it('calculates without crashing when push dates are missing', () => {
      const user = makeUser({ public_repos: 5 });
      const repos = [
        makeRepo({ pushed_at: null, updated_at: null }),
        makeRepo({ pushed_at: undefined, updated_at: undefined }),
      ];
      const result = calculateDeveloperScore(user, repos, []);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });
  });

  // 6. Missing language data
  describe('Missing language data', () => {
    it('calculates with techDiversity = 0 when no languages', () => {
      const user = makeUser({ public_repos: 3 });
      const repos = [
        makeRepo({ language: null }),
        makeRepo({ language: null }),
      ];
      const result = calculateDeveloperScore(user, repos, []);
      expect(result.breakdown.techDiversity).toBe(0);
      expect(result.overall).toBeGreaterThanOrEqual(0);
    });
  });

  // 7. Large repository/star counts
  describe('Large counts', () => {
    it('caps scores at 100 even with extreme values', () => {
      const user = makeUser({ public_repos: 500, followers: 100000, following: 5000 });
      const repos = Array.from({ length: 100 }, (_, i) =>
        makeRepo({
          stargazers_count: 50000,
          forks_count: 10000,
          watchers_count: 50000,
          language: ['JS', 'TS', 'Py', 'Go', 'Rust', 'C', 'Java', 'Ruby'][i % 8],
          size: 50000,
          pushed_at: new Date().toISOString(),
          open_issues_count: 200,
        })
      );
      const result = calculateDeveloperScore(user, repos, []);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.breakdown.repoQuality).toBeLessThanOrEqual(100);
      expect(result.breakdown.communityImpact).toBeLessThanOrEqual(100);
      expect(result.breakdown.consistency).toBeLessThanOrEqual(100);
      expect(result.breakdown.community).toBeLessThanOrEqual(100);
      expect(result.breakdown.techDiversity).toBeLessThanOrEqual(100);
    });
  });

  // 8. Score boundaries
  describe('Score boundaries', () => {
    it('overall is always between 0 and 100', () => {
      // Test with many random-ish profiles
      const profiles = [
        { user: null, repos: null },
        { user: {}, repos: [] },
        { user: makeUser({ followers: 1 }), repos: [makeRepo()] },
        {
          user: makeUser({ followers: 99999 }),
          repos: Array.from({ length: 100 }, () =>
            makeRepo({ stargazers_count: 99999 })
          ),
        },
      ];

      profiles.forEach(({ user, repos }) => {
        const result = calculateDeveloperScore(user, repos, []);
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
      });
    });

    it('all sub-scores are between 0 and 100', () => {
      const user = makeUser({ public_repos: 20, followers: 50 });
      const repos = Array.from({ length: 20 }, (_, i) =>
        makeRepo({
          stargazers_count: i * 3,
          language: ['JS', 'Python', 'Go'][i % 3],
          size: 500,
        })
      );
      const result = calculateDeveloperScore(user, repos, []);
      Object.values(result.breakdown).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  // 9. Score labels
  describe('Score labels', () => {
    it('returns correct labels for each tier', () => {
      expect(getScoreLabel(100)).toBe('Exceptional Developer');
      expect(getScoreLabel(95)).toBe('Exceptional Developer');
      expect(getScoreLabel(90)).toBe('Exceptional Developer');
      expect(getScoreLabel(89)).toBe('Strong Developer');
      expect(getScoreLabel(80)).toBe('Strong Developer');
      expect(getScoreLabel(79)).toBe('Active Developer');
      expect(getScoreLabel(70)).toBe('Active Developer');
      expect(getScoreLabel(69)).toBe('Growing Developer');
      expect(getScoreLabel(60)).toBe('Growing Developer');
      expect(getScoreLabel(59)).toBe('Developing Profile');
      expect(getScoreLabel(40)).toBe('Developing Profile');
      expect(getScoreLabel(39)).toBe('Early Developer');
      expect(getScoreLabel(0)).toBe('Early Developer');
    });
  });

  // 10. Sub-score calculators individually
  describe('Individual sub-score calculators', () => {
    it('calcRepoQuality returns 0 for empty repos', () => {
      expect(calcRepoQuality([])).toBe(0);
      expect(calcRepoQuality(null)).toBe(0);
    });

    it('calcCommunityImpact handles no repos with some followers', () => {
      const user = makeUser({ followers: 100 });
      const score = calcCommunityImpact(user, []);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('calcConsistency returns 0 for no repos', () => {
      expect(calcConsistency(makeUser(), [])).toBe(0);
      expect(calcConsistency(makeUser(), null)).toBe(0);
    });

    it('calcCommunity handles no repos but has followers/following', () => {
      const user = makeUser({ followers: 50, following: 30 });
      const score = calcCommunity(user, []);
      expect(score).toBeGreaterThan(0);
    });

    it('calcTechDiversity returns 0 for no repos', () => {
      expect(calcTechDiversity([], [])).toBe(0);
    });

    it('calcTechDiversity returns 10 for single language', () => {
      const repos = [
        makeRepo({ language: 'Python', size: 1000 }),
        makeRepo({ language: 'Python', size: 500 }),
      ];
      expect(calcTechDiversity(repos, [])).toBe(10);
    });

    it('calcTechDiversity rewards diverse, evenly distributed languages', () => {
      const diverseRepos = [
        makeRepo({ language: 'JavaScript', size: 1000 }),
        makeRepo({ language: 'Python', size: 1000 }),
        makeRepo({ language: 'Go', size: 1000 }),
        makeRepo({ language: 'Rust', size: 1000 }),
        makeRepo({ language: 'TypeScript', size: 1000 }),
      ];
      const unevenRepos = [
        makeRepo({ language: 'JavaScript', size: 10000 }),
        makeRepo({ language: 'Python', size: 10 }),
        makeRepo({ language: 'Go', size: 10 }),
        makeRepo({ language: 'Rust', size: 10 }),
        makeRepo({ language: 'TypeScript', size: 10 }),
      ];
      const diverseScore = calcTechDiversity(diverseRepos, []);
      const unevenScore = calcTechDiversity(unevenRepos, []);
      expect(diverseScore).toBeGreaterThan(unevenScore);
    });
  });

  // 11. Determinism
  describe('Determinism', () => {
    it('produces the same result for the same input', () => {
      const user = makeUser({ public_repos: 10, followers: 25 });
      const repos = Array.from({ length: 10 }, (_, i) =>
        makeRepo({
          stargazers_count: i * 2,
          language: ['JS', 'Python'][i % 2],
          size: 500,
          pushed_at: '2025-06-15T00:00:00Z',
        })
      );
      const r1 = calculateDeveloperScore(user, repos, []);
      const r2 = calculateDeveloperScore(user, repos, []);
      expect(r1).toEqual(r2);
    });
  });
});
