/**
 * Pure utility functions for login automation.
 * These are stateless helpers extracted for testability.
 */

import type { LoginData } from './utils';

/**
 * Parse a range filter string into a Set of 0-based indices.
 * Supports formats: "1,3,5" or "1-5" or "1-3,7,10-12"
 */
export function parseRangeFilter(rangeFilter: string): Set<number> {
  const ranges = rangeFilter.split(',').map(r => r.trim());
  const selectedIndices = new Set<number>();
  for (const range of ranges) {
    if (range.includes('-')) {
      const parts = range.split('-').map(n => parseInt(n.trim(), 10));
      const [start, end] = parts;
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) selectedIndices.add(i - 1);
      }
    } else {
      const index = parseInt(range, 10);
      if (!isNaN(index)) selectedIndices.add(index - 1);
    }
  }
  return selectedIndices;
}

/**
 * Filter an array by a range string. Returns all items if rangeFilter is empty.
 * Range is 1-based (user-facing), converted to 0-based internally.
 */
export function filterByRange<T>(items: T[], rangeFilter: string | undefined): T[] {
  if (!rangeFilter || rangeFilter.trim() === '') return items;
  const indices = parseRangeFilter(rangeFilter);
  return items.filter((_, index) => indices.has(index));
}

/**
 * Parse an InstantWar login range string like "1-5,8,10-12" into
 * a concise summary string: "5 accounts (ranges: 1-5, 8, 10-12)"
 */
export function summarizeRange(loginCount: number, rangeFilter: string | undefined): string {
  if (!rangeFilter || rangeFilter.trim() === '') {
    return `${loginCount} accounts (all)`;
  }
  return `${loginCount} accounts (ranges: ${rangeFilter})`;
}

/**
 * Validate that a login object has the required fields.
 * Returns true if the login has a non-empty "User Name" and "Password".
 */
export function isValidLogin(login: Record<string, unknown>): boolean {
  const userName = login['User Name'];
  const password = login['Password'];
  return (
    typeof userName === 'string' &&
    userName.trim().length > 0 &&
    typeof password === 'string' &&
    password.trim().length > 0
  );
}

/**
 * Extract a safe display name from login data for logging.
 * Never exposes the password.
 */
export function loginDisplayName(login: Partial<LoginData>): string {
  const userName = String(login['User Name'] || 'unknown');
  const playerName = String(login['Player Name'] || '');
  if (playerName) {
    return `${userName} (${playerName})`;
  }
  return userName;
}

/**
 * Normalize a Chrome TabGroup color string to a valid TabGroups.ColorEnum.
 * Falls back to "blue" if the color is not recognized.
 */
export function normalizeTabColor(color: string | undefined): string {
  const validColors = [
    'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey',
  ];
  const normalized = (color || 'blue').trim().toLowerCase();
  return validColors.includes(normalized) ? normalized : 'blue';
}

/**
 * Format a log entry with timestamp and type prefix.
 */
export function formatLogEntry(
  message: string,
  type: 'info' | 'error' | 'warn' = 'info',
): string {
  const timestamp = new Date().toLocaleString();
  return `[${timestamp}] [${type.toUpperCase()}] ${message}`;
}
