// InstantWar-Auto-Login Background Service Worker
// Combines login, refresh, and tab management

import { LoginData } from './utils';

let loginInProcess = false;
let loginQueue: LoginData[] = [];
let currentLogin: LoginData | null = null;
let currentLoginTabId: number | null = null;
let totalLoginsQueued = 0;
let currentLoginIndex = 0;
let shouldStopRefresh = false;

const logToStorage = async (message: string, type: 'info' | 'error' | 'warn' = 'info') => {
  const timestamp = new Date().toLocaleString();
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  console.log(logEntry);
  const result = await chrome.storage.local.get(['extensionLogs']);
  const currentLogs = result.extensionLogs || [];
  const updatedLogs = [...currentLogs, logEntry].slice(-200);
  await chrome.storage.local.set({ extensionLogs: updatedLogs });
};

// ==================== SHARED HELPERS ====================

// Parse range filter string into a set of 0-based indices
function parseRangeFilter(rangeFilter: string): Set<number> {
  const ranges = rangeFilter.split(',').map(r => r.trim());
  const selectedIndices = new Set<number>();
  for (const range of ranges) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(n => parseInt(n.trim(), 10));
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

// Filter array by range string
function filterByRange<T>(items: T[], rangeFilter: string | undefined): T[] {
  if (!rangeFilter || rangeFilter.trim() === '') return items;
  const indices = parseRangeFilter(rangeFilter);
  return items.filter((_, index) => indices.has(index));
}

// Helper function to wait for tab load
async function waitForTabLoad(tabId: number, timeout: number = 30000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Tab load timed out for tab ${tabId}`));
    }, timeout);

    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// ==================== LOGIN AUTOMATION ====================

async function processLoginQueue() {
  if (loginQueue.length === 0) {
    logToStorage("Login queue empty.");
    loginInProcess = false;
    currentLogin = null;
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 3000));
  logToStorage(`Processing next login. Queue: ${loginQueue.length} remaining`);
  loginInProcess = true;
  currentLogin = loginQueue.shift() || null;
  currentLoginIndex++;
  // Log the login data keys and first row values for debugging
  if (currentLogin && currentLoginIndex === 1) {
    const keys = Object.keys(currentLogin);
    logToStorage(`Login data columns: ${keys.join(', ')}`);
    logToStorage(`Login data values: Tab="${currentLogin["Tab"]}", Color="${currentLogin["Color"]}"`);
  }
  updateLoginProgress();
  
  if (!currentLogin) {
    loginInProcess = false;
    processLoginQueue();
    return;
  }

  try {
    logToStorage(`Logging in as: ${currentLogin["User Name"]}`);

    // Clear cookies for fresh login
    const cookies = await chrome.cookies.getAll({ domain: ".instantwar.com" });
    for (const cookie of cookies) {
      await chrome.cookies.remove({ url: `https://${cookie.domain}${cookie.path}`, name: cookie.name });
    }

    // Create new tab for login
    const tab = await chrome.tabs.create({ url: "https://www.instantwar.com", active: true });
    if (tab.id) {
      currentLoginTabId = tab.id;
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['assets/content.js'],
      });
      chrome.tabs.sendMessage(tab.id, {
        action: 'startAutomatedLogin',
        login: currentLogin,
      });
    }
  } catch (error) {
    logToStorage(`Error processing login for ${currentLogin["User Name"]}: ${error}`, 'error');
    loginInProcess = false;
    processLoginQueue();
  }
}

// ==================== TAB GROUPING ====================

// ==================== PROGRESS TRACKING ====================

async function updateLoginProgress() {
  await chrome.storage.local.set({
    loginProgress: {
      current: currentLoginIndex,
      total: totalLoginsQueued,
      active: loginInProcess,
    },
  });
}

async function updateRefreshProgress(current: number, total: number, active: boolean) {
  await chrome.storage.local.set({
    refreshProgress: { current, total, active },
  });
}

async function groupTabByLogin(tabId: number, login: LoginData) {
  const groupName = login["Tab"] || "IW Accounts";
  const groupColor = ((login["Color"] || "blue").trim().toLowerCase() as chrome.tabGroups.ColorEnum);
  const userName = login["User Name"] || 'unknown';

  logToStorage(`groupTabByLogin: tabId=${tabId}, group="${groupName}", color="${groupColor}", user=${userName}`);

  try {
    // Verify the tab exists and is in the right window
    let windowId: number | undefined;
    try {
      const tab = await chrome.tabs.get(tabId);
      windowId = tab.windowId;
      logToStorage(`groupTabByLogin: tab ${tabId} found in window ${windowId}, url=${tab.url}`);
    } catch (e) {
      logToStorage(`groupTabByLogin: tab ${tabId} not found: ${e}`, 'error');
      return;
    }

    if (!windowId) {
      logToStorage(`groupTabByLogin: no windowId for tab ${tabId}`, 'error');
      return;
    }

    // Find an existing group with the same name in the same window, or create a new one
    const allGroups = await chrome.tabGroups.query({ windowId });
    logToStorage(`groupTabByLogin: found ${allGroups.length} groups in window ${windowId}: ${allGroups.map(g => g.title || '(untitled)').join(', ')}`);

    const existingGroup = allGroups.find(g => g.title === groupName);

    if (existingGroup) {
      // Add this tab to the existing group
      logToStorage(`groupTabByLogin: adding tab ${tabId} to existing group "${groupName}" (id=${existingGroup.id})`);
      await chrome.tabs.group({ tabIds: [tabId], groupId: existingGroup.id });
      logToStorage(`groupTabByLogin: SUCCESS - tab ${tabId} added to group "${groupName}"`);
    } else {
      // Create a new group
      logToStorage(`groupTabByLogin: no existing group "${groupName}" found, creating new group`);
      const groupId = await chrome.tabs.group({ tabIds: [tabId] });
      await chrome.tabGroups.update(groupId, {
        title: groupName,
        color: groupColor,
        collapsed: false,
      });
      logToStorage(`groupTabByLogin: SUCCESS - created group "${groupName}" (${groupColor}) with tab ${tabId}`);
    }
  } catch (error) {
    logToStorage(`groupTabByLogin FAILED for tab ${tabId} (user=${userName}): ${error}`, 'error');
  }
}

// ==================== REFRESH AUTOMATION ====================

async function refreshAllTabs(rangeFilter?: string) {
  logToStorage("--- START REFRESH ---");
  shouldStopRefresh = false;
  const tabs = await chrome.tabs.query({});
  const instantWarTabs = filterByRange(
    tabs.filter(tab => tab.url && tab.url.includes('instantwar.com')),
    rangeFilter
  );

  logToStorage(`Refreshing ${instantWarTabs.length} tabs...`);
  
  for (let i = 0; i < instantWarTabs.length; i++) {
    if (shouldStopRefresh) {
      logToStorage("Refresh stopped by user.");
      break;
    }
    const tab = instantWarTabs[i];
    if (tab.id) {
      await updateRefreshProgress(i + 1, instantWarTabs.length, true);
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.tabs.reload(tab.id);
      try {
        await waitForTabLoad(tab.id);
        logToStorage(`Tab refreshed: ${tab.url}`);
      } catch {
        logToStorage(`Timeout refreshing tab ${tab.id}, continuing...`, 'warn');
      }
      // Wait 25s + 2s extra = 27s
      await new Promise(resolve => setTimeout(resolve, 27000));
    }
  }
  await updateRefreshProgress(0, 0, false);
  logToStorage("Refresh cycle complete.");
}

// ==================== MESSAGE HANDLER ====================

chrome.runtime.onMessage.addListener(async (message, _sender) => {
  // LOGIN ACTIONS
  if (message.action === 'startAutomatedLogin') {
    const loginCredentials = message.loginCredentials as LoginData[];
    const rangeFilter = message.rangeFilter as string | undefined;

    if (!loginCredentials || loginCredentials.length === 0) {
      logToStorage("No login credentials provided.", 'warn');
      return;
    }

    const filtered = filterByRange(loginCredentials, rangeFilter);
    logToStorage(`Queued ${filtered.length} logins for processing.`);

    loginQueue = loginQueue.concat(filtered);
    totalLoginsQueued = loginQueue.length;
    currentLoginIndex = 0;
    updateLoginProgress();
    if (!loginInProcess) processLoginQueue();
  }
  
  else if (message.action === 'stopAutomatedLogin') {
    logToStorage("Stopping login automation.");
    loginQueue = [];
    loginInProcess = false;
    currentLogin = null;
  }
  
  else if (message.action === 'loginFormSubmitted') {
    const loginName = message.login["User Name"] || 'unknown';
    // Use the tab ID we tracked from processLoginQueue — NOT _sender.tab?.id
    // because the content script may have been re-injected and the sender ID is stale
    const tabId = currentLoginTabId;
    logToStorage(`loginFormSubmitted received for ${loginName}, tabId=${tabId} (from processLoginQueue)`);

    if (tabId) {
      // Wait for the game page to load before grouping
      try {
        logToStorage(`Waiting for game page on tab ${tabId}...`);
        await waitForTabLoad(tabId, 30000);
        logToStorage(`Game page loaded on tab ${tabId}, grouping...`);
      } catch {
        logToStorage(`Tab load timed out for ${loginName}, grouping anyway...`, 'warn');
      }

      // Group the tab
      try {
        await groupTabByLogin(tabId, message.login);
      } catch (error) {
        logToStorage(`Grouping failed for ${loginName}: ${error}`, 'error');
      }

      // 22s delay + 3s queue delay = 25s total between logins
      await new Promise(resolve => setTimeout(resolve, 22000));
    } else {
      logToStorage(`No tracked tab ID for login ${loginName}`, 'warn');
    }
    loginInProcess = false;
    currentLoginTabId = null;
    updateLoginProgress();
    processLoginQueue();
  }

  // REFRESH ACTIONS
  else if (message.action === 'startRefresh') {
    await refreshAllTabs(message.rangeFilter);
  }
  
  else if (message.action === 'stopRefresh') {
    logToStorage("Refresh stop requested.");
    shouldStopRefresh = true;
  }

  // LOGGING
  else if (message.action === 'log') {
    logToStorage(message.message, message.type);
  }

  return true;
});

// ==================== TAB LISTENERS ====================

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && currentLogin) {
    if (tab.url.includes("services-g-use1.instantwar.com/authorization")) {
      try {
        // Always re-inject and send fillLoginForm on each auth page load.
        // The auth page has redirects (e.g. /authorization -> /authorization/Account/Login)
        // and we need to send fillLoginForm on the FINAL page where the form actually exists.
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['assets/content.js'],
        });
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => { (window as any).contentScriptInjected = true; }, // eslint-disable-line @typescript-eslint/no-explicit-any
        });
        chrome.tabs.sendMessage(tabId, {
          action: 'fillLoginForm',
          login: currentLogin,
        });
      } catch (error) {
        logToStorage(`Error processing authorization tab: ${error}`, 'error');
        loginInProcess = false;
        processLoginQueue();
      }
    }
  }
});


