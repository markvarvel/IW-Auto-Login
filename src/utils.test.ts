/**
 * Tests for utils.ts pure functions.
 *
 * Tests the pure/deterministic utilities: getBrowserAPI, validateLoginData,
 * getTimestampColor, and isRecentlyLoaded.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupChromeMock } from './__mocks__/chrome';describe('utils.ts', () => {
  beforeEach(() => {
    setupChromeMock();
    vi.resetModules();
  });

  // ===== getBrowserAPI =====

  describe('getBrowserAPI', () => {
    it('exports browserAPI that is defined', async () => {
      const { browserAPI } = await import('./utils');
      expect(browserAPI).toBeDefined();
    });
  });

  // ===== validateLoginData =====

  describe('validateLoginData', () => {
    it('returns valid for data with required columns', async () => {
      const { validateLoginData } = await import('./utils');
      const data = [
        { 'User Name': 'alice', Password: 'pass123' },
        { 'User Name': 'bob', Password: 'pass456' },
      ];
      const result = validateLoginData(data);
      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toEqual([]);
      expect(result.extraColumns).toEqual([]);
    });

    it('returns valid with optional columns present', async () => {
      const { validateLoginData } = await import('./utils');
      const data = [
        {
          'User Name': 'alice',
          Password: 'pass123',
          'Player Name': 'Alice',
          Email: 'alice@example.com',
          Tab: 'Tab1',
          Position: 1,
          Color: '#ff0000',
        },
      ];
      const result = validateLoginData(data);
      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toEqual([]);
      expect(result.extraColumns).toEqual([]);
    });

    it('reports missing required columns', async () => {
      const { validateLoginData } = await import('./utils');
      const data = [{ 'Player Name': 'alice' } as import('./utils').LoginData];
      const result = validateLoginData(data);
      expect(result.isValid).toBe(false);
      expect(result.missingColumns).toContain('User Name');
      expect(result.missingColumns).toContain('Password');
    });

    it('reports extra columns not in schema', async () => {
      const { validateLoginData } = await import('./utils');
      const data = [
        { 'User Name': 'alice', Password: 'pass', Unknown: 'value' },
      ];
      const result = validateLoginData(data);
      expect(result.isValid).toBe(true);
      expect(result.extraColumns).toEqual(['Unknown']);
    });

    it('returns valid for empty data array', async () => {
      const { validateLoginData } = await import('./utils');
      const result = validateLoginData([]);
      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toEqual([]);
      expect(result.extraColumns).toEqual([]);
    });

    it('checks only the first row for columns', async () => {
      const { validateLoginData } = await import('./utils');
      const data = [
        { 'User Name': 'alice', Password: 'pass', Extra: 'x' },
        { 'User Name': 'bob', Password: 'pass', Another: 'y' },
      ];
      const result = validateLoginData(data);
      expect(result.extraColumns).toEqual(['Extra']);
      // The second row's 'Another' is NOT checked — only first row columns
    });
  });

  // ===== getTimestampColor =====

  describe('getTimestampColor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-16T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns green for timestamp less than 1 hour ago', async () => {
      const { getTimestampColor } = await import('./utils');
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      expect(getTimestampColor(thirtyMinAgo)).toBe('#4caf50');
    });

    it('returns orange for timestamp between 1h and 24h ago', async () => {
      const { getTimestampColor } = await import('./utils');
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      expect(getTimestampColor(sixHoursAgo)).toBe('#ff9800');
    });

    it('returns red for timestamp more than 24h ago', async () => {
      const { getTimestampColor } = await import('./utils');
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(getTimestampColor(twoDaysAgo)).toBe('#f44336');
    });

    it('returns secondary color for invalid timestamp', async () => {
      const { getTimestampColor } = await import('./utils');
      expect(getTimestampColor('not-a-date')).toBe('text.secondary');
    });

    it('returns green for timestamp exactly 0ms ago', async () => {
      const { getTimestampColor } = await import('./utils');
      const now = new Date().toISOString();
      expect(getTimestampColor(now)).toBe('#4caf50');
    });
  });

  // ===== isRecentlyLoaded =====

  describe('isRecentlyLoaded', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-16T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true for timestamp within last 5 minutes', async () => {
      const { isRecentlyLoaded } = await import('./utils');
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      expect(isRecentlyLoaded(twoMinAgo)).toBe(true);
    });

    it('returns false for timestamp older than 5 minutes', async () => {
      const { isRecentlyLoaded } = await import('./utils');
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(isRecentlyLoaded(tenMinAgo)).toBe(false);
    });

    it('returns false for invalid timestamp', async () => {
      const { isRecentlyLoaded } = await import('./utils');
      expect(isRecentlyLoaded('invalid')).toBe(false);
    });

    it('returns true for timestamp exactly at the boundary (just under 5 min)', async () => {
      const { isRecentlyLoaded } = await import('./utils');
      const justUnder5Min = new Date(Date.now() - 5 * 60 * 1000 + 1).toISOString();
      expect(isRecentlyLoaded(justUnder5Min)).toBe(true);
    });

    it('returns false for timestamp exactly at 5 minutes', async () => {
      const { isRecentlyLoaded } = await import('./utils');
      const exactly5Min = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(isRecentlyLoaded(exactly5Min)).toBe(false);
    });
  });
});
