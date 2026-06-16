import { describe, it, expect } from 'vitest';
import {
  parseRangeFilter,
  filterByRange,
  summarizeRange,
  isValidLogin,
  loginDisplayName,
  normalizeTabColor,
  formatLogEntry,
} from './login-utils';

// ==================== parseRangeFilter ====================

describe('parseRangeFilter', () => {
  it('parses a single number', () => {
    const result = parseRangeFilter('3');
    expect(result).toEqual(new Set([2]));
  });

  it('parses a comma-separated list', () => {
    const result = parseRangeFilter('1,3,5');
    expect(result).toEqual(new Set([0, 2, 4]));
  });

  it('parses a range', () => {
    const result = parseRangeFilter('2-5');
    expect(result).toEqual(new Set([1, 2, 3, 4]));
  });

  it('parses mixed ranges and singles', () => {
    const result = parseRangeFilter('1-3,7,10-12');
    expect(result).toEqual(new Set([0, 1, 2, 6, 9, 10, 11]));
  });

  it('handles spaces around entries', () => {
    const result = parseRangeFilter(' 1 - 3 , 5 ');
    expect(result).toEqual(new Set([0, 1, 2, 4]));
  });

  it('returns empty set for empty string', () => {
    const result = parseRangeFilter('');
    expect(result).toEqual(new Set());
  });

  it('returns empty set for non-numeric input', () => {
    const result = parseRangeFilter('abc');
    expect(result).toEqual(new Set());
  });
});

// ==================== filterByRange ====================

describe('filterByRange', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('returns all items when rangeFilter is undefined', () => {
    expect(filterByRange(items, undefined)).toEqual(items);
  });

  it('returns all items when rangeFilter is empty', () => {
    expect(filterByRange(items, '')).toEqual(items);
  });

  it('returns all items when rangeFilter is whitespace only', () => {
    expect(filterByRange(items, '   ')).toEqual(items);
  });

  it('filters by single index', () => {
    expect(filterByRange(items, '2')).toEqual(['b']);
  });

  it('filters by range', () => {
    expect(filterByRange(items, '1-3')).toEqual(['a', 'b', 'c']);
  });

  it('filters by mixed entries', () => {
    expect(filterByRange(items, '1,4')).toEqual(['a', 'd']);
  });

  it('returns empty array when no items match', () => {
    expect(filterByRange(items, '10-20')).toEqual([]);
  });
});

// ==================== summarizeRange ====================

describe('summarizeRange', () => {
  it('shows all accounts when no range', () => {
    expect(summarizeRange(10, undefined)).toBe('10 accounts (all)');
  });

  it('shows all accounts for empty range', () => {
    expect(summarizeRange(10, '')).toBe('10 accounts (all)');
  });

  it('shows range summary', () => {
    expect(summarizeRange(7, '1-3,7,10-12')).toBe('7 accounts (ranges: 1-3,7,10-12)');
  });
});

// ==================== isValidLogin ====================

describe('isValidLogin', () => {
  it('returns true for valid login', () => {
    expect(isValidLogin({ 'User Name': 'user1', 'Password': 'pass1' })).toBe(true);
  });

  it('returns false when User Name is empty', () => {
    expect(isValidLogin({ 'User Name': '', 'Password': 'pass1' })).toBe(false);
  });

  it('returns false when Password is empty', () => {
    expect(isValidLogin({ 'User Name': 'user1', 'Password': '' })).toBe(false);
  });

  it('returns false when User Name is whitespace only', () => {
    expect(isValidLogin({ 'User Name': '   ', 'Password': 'pass1' })).toBe(false);
  });

  it('returns false when fields are missing', () => {
    expect(isValidLogin({})).toBe(false);
  });

  it('returns false when fields are not strings', () => {
    expect(isValidLogin({ 'User Name': 123, 'Password': true })).toBe(false);
  });
});

// ==================== loginDisplayName ====================

describe('loginDisplayName', () => {
  it('returns User Name only when no Player Name', () => {
    expect(loginDisplayName({ 'User Name': 'user1' })).toBe('user1');
  });

  it('returns User Name (Player Name) when both exist', () => {
    expect(loginDisplayName({ 'User Name': 'user1', 'Player Name': 'Hero' })).toBe('user1 (Hero)');
  });

  it('returns "unknown" when User Name is missing', () => {
    expect(loginDisplayName({})).toBe('unknown');
  });
});

// ==================== normalizeTabColor ====================

describe('normalizeTabColor', () => {
  it('returns the color when valid', () => {
    expect(normalizeTabColor('red')).toBe('red');
    expect(normalizeTabColor('blue')).toBe('blue');
    expect(normalizeTabColor('purple')).toBe('purple');
  });

  it('normalizes case', () => {
    expect(normalizeTabColor('RED')).toBe('red');
    expect(normalizeTabColor('Blue')).toBe('blue');
  });

  it('trims whitespace', () => {
    expect(normalizeTabColor('  green  ')).toBe('green');
  });

  it('falls back to blue for invalid color', () => {
    expect(normalizeTabColor('invalid')).toBe('blue');
    expect(normalizeTabColor('')).toBe('blue');
    expect(normalizeTabColor(undefined)).toBe('blue');
  });
});

// ==================== formatLogEntry ====================

describe('formatLogEntry', () => {
  it('formats info log entry', () => {
    const entry = formatLogEntry('Test message');
    expect(entry).toMatch(/^\[.*\] \[INFO\] Test message$/);
  });

  it('formats error log entry', () => {
    const entry = formatLogEntry('Error occurred', 'error');
    expect(entry).toMatch(/^\[.*\] \[ERROR\] Error occurred$/);
  });

  it('formats warn log entry', () => {
    const entry = formatLogEntry('Warning', 'warn');
    expect(entry).toMatch(/^\[.*\] \[WARN\] Warning$/);
  });
});
