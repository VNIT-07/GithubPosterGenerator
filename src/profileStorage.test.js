import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeUsername,
  saveProfileSnapshot,
  getProfileSnapshot,
  unpublishProfile,
  formatSyncedTimestamp,
  encodeSnapshot,
  decodeSnapshot
} from './profileStorage.js';

// In-memory localStorage mock for node test runner
const memoryStorage = {};
globalThis.localStorage = {
  getItem: (key) => memoryStorage[key] || null,
  setItem: (key, val) => { memoryStorage[key] = String(val); },
  removeItem: (key) => { delete memoryStorage[key]; },
  clear: () => { Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]); },
};

describe('Profile Storage Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes usernames to lowercase clean slugs', () => {
    expect(normalizeUsername('  WhatsApp  ')).toBe('whatsapp');
    expect(normalizeUsername('VNIT-07')).toBe('vnit-07');
    expect(normalizeUsername('User@123!')).toBe('user123');
  });

  it('saves and retrieves a profile snapshot', () => {
    const mockUserData = {
      login: 'whatsapp',
      name: 'WhatsApp Dev',
      avatar_url: 'https://avatar.url',
      public_repos: 10,
      followers: 100,
      following: 5,
      languages: [{ name: 'JavaScript', percentage: 100, color: '#F7DF1E' }],
      top_repos: [{ name: 'repo1', stars: 50, language: 'JavaScript' }],
      developerScore: { overall: 85, breakdown: {}, label: 'Strong Developer' },
      chartStats: [{ label: 'Volume', value: 50 }]
    };

    const saved = saveProfileSnapshot({
      userData: mockUserData,
      theme: 'cyberpunk',
      visibility: 'public'
    });

    expect(saved.slug).toBe('whatsapp');
    expect(saved.published).toBe(true);
    expect(saved.theme).toBe('cyberpunk');
    expect(saved.visibility).toBe('public');

    const fetched = getProfileSnapshot('whatsapp');
    expect(fetched).not.toBeNull();
    expect(fetched.profileData.name).toBe('WhatsApp Dev');
  });

  it('unpublishes a profile correctly', () => {
    const mockUserData = { login: 'unpublishme' };
    saveProfileSnapshot({ userData: mockUserData });

    const success = unpublishProfile('unpublishme');
    expect(success).toBe(true);

    const fetched = getProfileSnapshot('unpublishme');
    expect(fetched.published).toBe(false);
  });

  it('encodes and decodes snapshots for URL compression', () => {
    const snapshot = {
      githubUsername: 'testuser',
      profileData: { name: 'Test User' },
      theme: 'minimal'
    };

    const encoded = encodeSnapshot(snapshot);
    expect(encoded).toBeTypeOf('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeSnapshot(encoded);
    expect(decoded.githubUsername).toBe('testuser');
    expect(decoded.profileData.name).toBe('Test User');
  });

  it('formats synced timestamp dynamically', () => {
    const testDate = new Date('2026-08-13T22:42:00Z');
    const formatted = formatSyncedTimestamp(testDate);
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Aug');
  });
});
