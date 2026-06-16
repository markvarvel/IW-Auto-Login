/**
 * Chrome API mock for vitest.
 * Provides stubs for chrome.storage, chrome.tabs, chrome.cookies,
 * chrome.scripting, chrome.tabGroups, and chrome.runtime.
 */

import { vi } from 'vitest';

// ---------- Event system ----------

type Listener<T extends unknown[]> = (...args: T) => void;

class MockEvent<T extends unknown[]> {
  private listeners: Listener<T>[] = [];

  addListener(fn: Listener<T>) {
    this.listeners.push(fn);
  }

  removeListener(fn: Listener<T>) {
    this.listeners = this.listeners.filter(l => l !== fn);
  }

  hasListener(fn: Listener<T>) {
    return this.listeners.includes(fn);
  }

  /** Number of currently registered listeners */
  get listenerCount() {
    return this.listeners.length;
  }

  /**
   * Wait until at least one listener is registered.
   * Uses a synchronous polling loop with vi.advanceTimersByTimeAsync
   * to tick fake timers when needed.
   */
  async waitForListener(timeoutMs = 500): Promise<void> {
    if (this.listeners.length > 0) return;
    const start = Date.now();
    while (this.listeners.length === 0) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timeout waiting for listener');
      }
      await vi.advanceTimersByTimeAsync(10);
    }
  }

  /** Call all registered listeners — test helper */
  async fire(...args: T) {
    for (const fn of [...this.listeners]) {
      await fn(...args);
    }
  }

  clear() {
    this.listeners = [];
  }
}

// ---------- chrome.storage ----------

const storageData: Record<string, unknown> = {};

const storageLocal = {
  get: vi.fn(async (keys: string | string[]) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    const result: Record<string, unknown> = {};
    for (const key of keyList) {
      if (key in storageData) result[key] = storageData[key];
    }
    return result;
  }),
  set: vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(storageData, items);
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) delete storageData[key];
  }),
  clear: vi.fn(async () => {
    for (const key of Object.keys(storageData)) delete storageData[key];
  }),
};

// ---------- chrome.tabs ----------

const onUpdated = new MockEvent<[number, chrome.tabs.TabChangeInfo, chrome.tabs.Tab]>();

const tabsQuery = vi.fn(async (_queryInfo?: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => []);
const tabsCreate = vi.fn(async (props?: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> => ({
  id: 1,
  windowId: 1,
  url: props?.url || '',
  active: props?.active ?? true,
  index: 0,
  highlighted: false,
  pinned: false,
  incognito: false,
  frozen: false,
  selected: false,
  discarded: false,
  autoDiscardable: true,
  groupId: -1,
  status: 'complete',
}));
const tabsUpdate = vi.fn(async (_tabId: number, _updateProperties: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab | undefined> => undefined);
const tabsReload = vi.fn(async (_tabId: number): Promise<void> => undefined);
const tabsGet = vi.fn(async (tabId: number): Promise<chrome.tabs.Tab> => ({
  id: tabId,
  windowId: 1,
  url: 'https://www.instantwar.com',
  active: false,
  index: 0,
  highlighted: false,
  pinned: false,
  incognito: false,
  frozen: false,
  selected: false,
  discarded: false,
  autoDiscardable: true,
  groupId: -1,
  status: 'complete',
}));
const tabsGroup = vi.fn(async (_options: chrome.tabs.GroupOptions): Promise<number> => 1);
const tabsSendMessage = vi.fn(async (_tabId: number, _message: unknown): Promise<void> => undefined);

// ---------- chrome.cookies ----------

const cookiesGetAll = vi.fn(async (_filter: Record<string, unknown>): Promise<chrome.cookies.Cookie[]> => []);
const cookiesRemove = vi.fn(async (_details: { url: string; name: string }): Promise<void> => undefined);

// ---------- chrome.scripting ----------

const scriptingExecuteScript = vi.fn(async (_details: Record<string, unknown>): Promise<chrome.scripting.InjectionResult[]> => []);

// ---------- chrome.tabGroups ----------

const tabGroupsQuery = vi.fn(async (_queryInfo?: chrome.tabGroups.QueryInfo): Promise<chrome.tabGroups.TabGroup[]> => []);
const tabGroupsUpdate = vi.fn(async (_groupId: number, _updateProperties: chrome.tabGroups.UpdateProperties): Promise<chrome.tabGroups.TabGroup | undefined> => undefined);

// ---------- chrome.runtime ----------

const onMessage = new MockEvent<[unknown, chrome.runtime.MessageSender, (response: unknown) => void]>();
const runtimeSendMessage = vi.fn(async (_message: unknown): Promise<unknown> => undefined);

// ---------- Assemble global chrome ----------

export function setupChromeMock() {
  // Reset all call counts and storage
  vi.clearAllMocks();
  for (const key of Object.keys(storageData)) delete storageData[key];

  // Clear event listeners
  onUpdated.clear();
  onMessage.clear();

  // Build the global chrome object
  const chromeMock = {
    storage: { local: storageLocal },
    tabs: {
      onUpdated,
      query: tabsQuery,
      create: tabsCreate,
      update: tabsUpdate,
      reload: tabsReload,
      get: tabsGet,
      group: tabsGroup,
      sendMessage: tabsSendMessage,
    },
    cookies: {
      getAll: cookiesGetAll,
      remove: cookiesRemove,
    },
    scripting: {
      executeScript: scriptingExecuteScript,
    },
    tabGroups: {
      query: tabGroupsQuery,
      update: tabGroupsUpdate,
    },
    runtime: {
      onMessage,
      sendMessage: runtimeSendMessage,
    },
  } as unknown as typeof chrome;

  (globalThis as Record<string, unknown>).chrome = chromeMock;
  return chromeMock;
}

export function resetStorage() {
  for (const key of Object.keys(storageData)) delete storageData[key];
}

// Re-export mocks for test assertions
export const mocks = {
  storageLocal,
  runtimeSendMessage,
  tabsQuery,
  tabsCreate,
  tabsUpdate,
  tabsReload,
  tabsGet,
  tabsGroup,
  tabsSendMessage,
  cookiesGetAll,
  cookiesRemove,
  scriptingExecuteScript,
  tabGroupsQuery,
  tabGroupsUpdate,
  onUpdated,
  onMessage,
};
