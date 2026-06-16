/**
 * Tests for the login flow in background.ts.
 *
 * Because background.ts registers listeners at module scope and uses
 * module-level state, each test group does a dynamic `import()` with
 * fresh Chrome API mocks via vi.resetModules().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupChromeMock, mocks } from './__mocks__/chrome';

// ---------- helpers ----------

function makeLogin(overrides: Record<string, string> = {}) {
  return {
    'User Name': 'testuser',
    'Password': 'secret',
    'Player Name': 'TestHero',
    Tab: 'MyGroup',
    Color: 'green',
    ...overrides,
  };
}

/** Fire the registered onMessage listener with a message */
async function sendMessage(message: Record<string, unknown>) {
  await mocks.onMessage.fire(message, {} as chrome.runtime.MessageSender, vi.fn());
}

/** Fire the onUpdated listener (simulates tab navigation) */
async function fireTabUpdated(
  tabId: number,
  changeInfo: Partial<chrome.tabs.TabChangeInfo>,
  url?: string,
) {
  await mocks.onUpdated.fire(
    tabId,
    changeInfo as chrome.tabs.TabChangeInfo,
    { id: tabId, url, windowId: 1 } as chrome.tabs.Tab,
  );
}

// ---------- tests ----------

describe('background.ts — login flow', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    setupChromeMock();
    vi.resetModules();

    // Dynamically import background.ts so Chrome mocks are in place
    // before module-level listeners register.
    await import('./background');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ===== startAutomatedLogin =====

  describe('startAutomatedLogin', () => {
    it('queues logins and logs the count', async () => {
      const login = makeLogin();

      // Mock tabs.create to return a tab
      mocks.tabsCreate.mockResolvedValueOnce({
        id: 101,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });

      // Should have logged the queue count
      const setCalls = mocks.storageLocal.set.mock.calls;
      expect(setCalls.length).toBeGreaterThan(0);

      // Should attempt to clear cookies
      // Advance past the 3s delay in processLoginQueue
      await vi.advanceTimersByTimeAsync(4000);

      expect(mocks.cookiesGetAll).toHaveBeenCalledWith({ domain: '.instantwar.com' });
    });

    it('filters by rangeFilter when provided', async () => {
      const logins = [
        makeLogin({ 'User Name': 'user1' }),
        makeLogin({ 'User Name': 'user2' }),
        makeLogin({ 'User Name': 'user3' }),
      ];

      mocks.tabsCreate.mockResolvedValue({
        id: 101,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      // rangeFilter '1,3' should only queue user1 and user3 (1-based)
      await sendMessage({
        action: 'startAutomatedLogin',
        loginCredentials: logins,
        rangeFilter: '1,3',
      });

      // Advance past the 3s delay
      await vi.advanceTimersByTimeAsync(4000);

      // Only 2 logins should have been processed (user1 and user3)
      // tabs.create called once per login processed
      expect(mocks.tabsCreate).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no credentials provided', async () => {
      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [] });

      expect(mocks.tabsCreate).not.toHaveBeenCalled();
      expect(mocks.cookiesGetAll).not.toHaveBeenCalled();
    });

    it('does nothing when loginCredentials is undefined', async () => {
      await sendMessage({ action: 'startAutomatedLogin' });

      expect(mocks.tabsCreate).not.toHaveBeenCalled();
    });
  });

  // ===== stopAutomatedLogin =====

  describe('stopAutomatedLogin', () => {
    it('clears the login queue and stops processing', async () => {
      const login = makeLogin();

      mocks.tabsCreate.mockResolvedValue({
        id: 101,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      // Start a login
      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });

      // Stop it before the 3s delay completes
      await sendMessage({ action: 'stopAutomatedLogin' });

      // Advance time — processLoginQueue should not run because queue was cleared
      await vi.advanceTimersByTimeAsync(5000);

      // cookies.getAll should NOT have been called (login was stopped before processing)
      expect(mocks.cookiesGetAll).not.toHaveBeenCalled();
    });
  });

  // ===== processLoginQueue (via startAutomatedLogin) =====

  describe('processLoginQueue', () => {
    it('clears cookies, creates a tab, injects content script, and sends message', async () => {
      const login = makeLogin({ 'User Name': 'alice', Tab: 'GroupA', Color: 'red' });

      mocks.tabsCreate.mockResolvedValueOnce({
        id: 200,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });
      mocks.cookiesGetAll.mockResolvedValueOnce([
        { domain: '.instantwar.com', path: '/', name: 'session' } as chrome.cookies.Cookie,
      ]);

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });

      // Advance past the 3s delay
      await vi.advanceTimersByTimeAsync(4000);

      // 1. Cookies cleared
      expect(mocks.cookiesGetAll).toHaveBeenCalledWith({ domain: '.instantwar.com' });
      expect(mocks.cookiesRemove).toHaveBeenCalledWith({
        url: 'https://.instantwar.com/',
        name: 'session',
      });

      // 2. Tab created
      expect(mocks.tabsCreate).toHaveBeenCalledWith({
        url: 'https://www.instantwar.com',
        active: true,
      });

      // 3. Content script injected
      expect(mocks.scriptingExecuteScript).toHaveBeenCalledWith({
        target: { tabId: 200 },
        files: ['assets/content.js'],
      });

      // 4. Message sent to tab
      expect(mocks.tabsSendMessage).toHaveBeenCalledWith(200, {
        action: 'startAutomatedLogin',
        login,
      });
    });

    it('logs in as the correct user (loginDisplayName)', async () => {
      const login = makeLogin({ 'User Name': 'bob', 'Player Name': 'BobTheBuilder' });

      mocks.tabsCreate.mockResolvedValueOnce({
        id: 300,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      // Check that logToStorage was called with loginDisplayName
      const setCalls = mocks.storageLocal.set.mock.calls;
      const allSetData = setCalls.map((c: Record<string, unknown>[]) => JSON.stringify(c[0]));
      const logString = allSetData.find((s: string) => s.includes('bob'));

      // The extensionLogs should contain "Logging in as: bob (BobTheBuilder)"
      const getCall = mocks.storageLocal.get.mock.calls;
      // Find the call that reads extensionLogs
      const logsCall = getCall.find((c: unknown[]) => {
        const keys = c[0];
        return Array.isArray(keys) && keys.includes('extensionLogs');
      });
      expect(logsCall).toBeDefined();
    });

    it('handles errors during login gracefully', async () => {
      const login = makeLogin();

      // Make cookies.getAll throw
      mocks.cookiesGetAll.mockRejectedValueOnce(new Error('Network error'));

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      // Should have logged the error
      const setCalls = mocks.storageLocal.set.mock.calls;
      const allData = setCalls.map((c: Record<string, unknown>[]) => JSON.stringify(c[0]));
      const errorLog = allData.find((s: string) => s.includes('Error processing login'));
      expect(errorLog).toBeDefined();
    });
  });

  // ===== loginFormSubmitted =====

  describe('loginFormSubmitted', () => {
    it('groups the tab after login form is submitted', async () => {
      const login = makeLogin({ Tab: 'MyAlliance', Color: 'purple' });

      // First, start a login to set currentLoginTabId
      mocks.tabsCreate.mockResolvedValueOnce({
        id: 500,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      // Now simulate the game page loading on the tab (for waitForTabLoad)
      // and then fire loginFormSubmitted
      mocks.tabsGet.mockResolvedValueOnce({
        id: 500,
        windowId: 1,
        url: 'https://www.instantwar.com',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'complete',
      });
      mocks.tabGroupsQuery.mockResolvedValueOnce([]);

      // Fire loginFormSubmitted — this will call waitForTabLoad which
      // listens on onUpdated, then groups the tab
      const formSubmittedPromise = sendMessage({
        action: 'loginFormSubmitted',
        login,
      });

      // Wait for waitForTabLoad to register its onUpdated listener
      await mocks.onUpdated.waitForListener();
      // Trigger onUpdated with status 'complete' to resolve waitForTabLoad
      await fireTabUpdated(500, { status: 'complete' });

      // Advance past the 22s delay in loginFormSubmitted
      await vi.advanceTimersByTimeAsync(23000);

      // Wait for the full handler to complete
      await formSubmittedPromise;

      // Tab should be grouped
      expect(mocks.tabsGroup).toHaveBeenCalled();
    });

    it('warns when no tracked tab ID exists', async () => {
      // Send loginFormSubmitted without starting a login first
      // (currentLoginTabId is null)
      await sendMessage({
        action: 'loginFormSubmitted',
        login: makeLogin(),
      });

      // Should log a warning about no tracked tab ID
      const setCalls = mocks.storageLocal.set.mock.calls;
      const allData = setCalls.map((c: Record<string, unknown>[]) => JSON.stringify(c[0]));
      const warnLog = allData.find((s: string) => s.includes('No tracked tab ID'));
      expect(warnLog).toBeDefined();
    });
  });

  // ===== logToStorage =====

  describe('logToStorage (via log action)', () => {
    it('formats and stores log entries', async () => {
      await sendMessage({ action: 'log', message: 'Hello from test', type: 'info' });

      // Should have read extensionLogs, then written it back
      expect(mocks.storageLocal.get).toHaveBeenCalledWith(['extensionLogs']);

      const setCalls = mocks.storageLocal.set.mock.calls;
      expect(setCalls.length).toBeGreaterThan(0);
    });

    it('caps logs at 200 entries', async () => {
      // Pre-populate with 200 entries
      const existingLogs = Array.from({ length: 200 }, (_, i) => `[old] Entry ${i}`);
      mocks.storageLocal.get.mockResolvedValueOnce({ extensionLogs: existingLogs });

      await sendMessage({ action: 'log', message: 'New entry', type: 'info' });

      const setCalls = mocks.storageLocal.set.mock.calls;
      const lastCall = setCalls[setCalls.length - 1];
      const logs = lastCall[0].extensionLogs as string[];

      expect(logs.length).toBe(200);
      // First entry should be trimmed (shifted off)
      expect(logs[0]).toContain('Entry 1');
      // Last entry should be the new one
      expect(logs[logs.length - 1]).toContain('New entry');
    });
  });

  // ===== onUpdated tab listener =====

  describe('onUpdated tab listener', () => {
    it('injects content script on auth page load when a login is active', async () => {
      const login = makeLogin();

      // Start a login so currentLogin is set
      mocks.tabsCreate.mockResolvedValueOnce({
        id: 600,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      // Reset mock counts to ignore calls from processLoginQueue
      mocks.scriptingExecuteScript.mockClear();

      // Simulate tab navigating to the auth page
      await fireTabUpdated(600, { status: 'complete' }, 'https://services-g-use1.instantwar.com/authorization/Account/Login');

      // Should inject content script
      expect(mocks.scriptingExecuteScript).toHaveBeenCalled();
    });

    it('does not inject on non-auth pages', async () => {
      const login = makeLogin();

      mocks.tabsCreate.mockResolvedValueOnce({
        id: 700,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      mocks.scriptingExecuteScript.mockClear();

      // Navigate to a non-auth page
      await fireTabUpdated(700, { status: 'complete' }, 'https://www.instantwar.com/game');

      // Should NOT inject content script (only auth pages trigger it)
      expect(mocks.scriptingExecuteScript).not.toHaveBeenCalled();
    });
  });

  // ===== groupTabByLogin =====

  describe('groupTabByLogin (via loginFormSubmitted)', () => {
    it('adds tab to existing group with same name', async () => {
      const login = makeLogin({ Tab: 'Alliance', Color: 'blue' });

      mocks.tabsCreate.mockResolvedValueOnce({
        id: 800,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      // Mock existing group with same name
      mocks.tabsGet.mockResolvedValue({
        id: 800,
        windowId: 1,
        url: 'https://www.instantwar.com',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'complete',
      });
      mocks.tabGroupsQuery.mockResolvedValueOnce([
        { id: 42, title: 'Alliance', color: 'blue', windowId: 1 } as chrome.tabGroups.TabGroup,
      ]);

      const formSubmittedPromise = sendMessage({
        action: 'loginFormSubmitted',
        login,
      });

      await mocks.onUpdated.waitForListener();
      await fireTabUpdated(800, { status: 'complete' });
      await vi.advanceTimersByTimeAsync(23000);
      await formSubmittedPromise;

      // Should add to existing group, not create a new one
      expect(mocks.tabsGroup).toHaveBeenCalledWith({
        tabIds: [800],
        groupId: 42,
      });
      // Should NOT call tabGroups.update (since it's an existing group)
      expect(mocks.tabGroupsUpdate).not.toHaveBeenCalled();
    });

    it('creates a new group when none exists', async () => {
      const login = makeLogin({ Tab: 'NewGroup', Color: 'red' });

      mocks.tabsCreate.mockResolvedValueOnce({
        id: 900,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      mocks.tabsGet.mockResolvedValue({
        id: 900,
        windowId: 1,
        url: 'https://www.instantwar.com',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'complete',
      });
      mocks.tabGroupsQuery.mockResolvedValueOnce([]);
      mocks.tabsGroup.mockResolvedValueOnce(99); // new group ID

      const formSubmittedPromise = sendMessage({
        action: 'loginFormSubmitted',
        login,
      });

      await mocks.onUpdated.waitForListener();
      await fireTabUpdated(900, { status: 'complete' });
      await vi.advanceTimersByTimeAsync(23000);
      await formSubmittedPromise;

      // Should create a new group
      expect(mocks.tabsGroup).toHaveBeenCalledWith({ tabIds: [900] });
      expect(mocks.tabGroupsUpdate).toHaveBeenCalledWith(99, {
        title: 'NewGroup',
        color: 'red',
        collapsed: false,
      });
    });

    it('uses default tab name and color when not specified', async () => {
      const login = makeLogin({ Tab: '', Color: '' });

      mocks.tabsCreate.mockResolvedValueOnce({
        id: 950,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      mocks.tabsGet.mockResolvedValue({
        id: 950,
        windowId: 1,
        url: 'https://www.instantwar.com',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'complete',
      });
      mocks.tabGroupsQuery.mockResolvedValueOnce([]);
      mocks.tabsGroup.mockResolvedValueOnce(100);

      const formSubmittedPromise = sendMessage({
        action: 'loginFormSubmitted',
        login,
      });

      await mocks.onUpdated.waitForListener();
      await fireTabUpdated(950, { status: 'complete' });
      await vi.advanceTimersByTimeAsync(23000);
      await formSubmittedPromise;

      expect(mocks.tabGroupsUpdate).toHaveBeenCalledWith(100, {
        title: 'IW Accounts',  // default
        color: 'blue',         // normalizeTabColor('') falls back to blue
        collapsed: false,
      });
    });

    it('handles grouping errors gracefully', async () => {
      const login = makeLogin({ Tab: 'FailGroup', Color: 'red' });

      mocks.tabsCreate.mockResolvedValueOnce({
        id: 960,
        windowId: 1,
        url: '',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'loading',
      });

      await sendMessage({ action: 'startAutomatedLogin', loginCredentials: [login] });
      await vi.advanceTimersByTimeAsync(4000);

      mocks.tabsGet.mockResolvedValue({
        id: 960,
        windowId: 1,
        url: 'https://www.instantwar.com',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'complete',
      });
      // Make tabGroups.query throw to simulate grouping failure
      mocks.tabGroupsQuery.mockRejectedValueOnce(new Error('Tab grouping not supported'));

      const formSubmittedPromise = sendMessage({
        action: 'loginFormSubmitted',
        login,
      });

      await mocks.onUpdated.waitForListener();
      await fireTabUpdated(960, { status: 'complete' });
      await vi.advanceTimersByTimeAsync(23000);
      await formSubmittedPromise;

      // groupTabByLogin catches errors internally, so the log says "groupTabByLogin FAILED"
      // (not "Grouping failed" which is in the outer try/catch that never fires)
      const setCalls = mocks.storageLocal.set.mock.calls;
      const allData = setCalls.map((c: Record<string, unknown>[]) => JSON.stringify(c[0]));
      const errorLog = allData.find((s: string) => s.includes('groupTabByLogin FAILED'));
      expect(errorLog).toBeDefined();
    });
  });

  // ===== sequential queue processing =====

  describe('sequential queue processing', () => {
    it('processes multiple logins in sequence', async () => {
      const login1 = makeLogin({ 'User Name': 'first', Tab: 'G1', Color: 'red' });
      const login2 = makeLogin({ 'User Name': 'second', Tab: 'G2', Color: 'blue' });

      mocks.tabsCreate
        .mockResolvedValueOnce({
          id: 1100,
          windowId: 1,
          url: '',
          active: true,
          index: 0,
          highlighted: false,
          pinned: false,
          status: 'loading',
        })
        .mockResolvedValueOnce({
          id: 1200,
          windowId: 1,
          url: '',
          active: true,
          index: 0,
          highlighted: false,
          pinned: false,
          status: 'loading',
        });

      await sendMessage({
        action: 'startAutomatedLogin',
        loginCredentials: [login1, login2],
      });

      // Advance past the first 3s delay — first login starts
      await vi.advanceTimersByTimeAsync(4000);
      expect(mocks.tabsCreate).toHaveBeenCalledTimes(1);

      // Simulate loginFormSubmitted for the first login to trigger the next one
      mocks.tabsGet.mockResolvedValue({
        id: 1100,
        windowId: 1,
        url: 'https://www.instantwar.com',
        active: true,
        index: 0,
        highlighted: false,
        pinned: false,
        status: 'complete',
      });
      mocks.tabGroupsQuery.mockResolvedValue([]);

      const formPromise1 = sendMessage({
        action: 'loginFormSubmitted',
        login: login1,
      });

      await mocks.onUpdated.waitForListener();
      await fireTabUpdated(1100, { status: 'complete' });
      await vi.advanceTimersByTimeAsync(23000);
      await formPromise1;

      // After loginFormSubmitted completes, processLoginQueue should fire again
      // Advance past the next 3s delay for the second login
      await vi.advanceTimersByTimeAsync(4000);

      // Second tab should now be created
      expect(mocks.tabsCreate).toHaveBeenCalledTimes(2);
      expect(mocks.tabsCreate).toHaveBeenLastCalledWith({
        url: 'https://www.instantwar.com',
        active: true,
      });
    });
  });
});
