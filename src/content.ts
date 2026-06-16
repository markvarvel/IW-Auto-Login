// InstantWar-Auto-Login Content Script
// Handles login form interaction and game page navigation

import { LoginData } from './utils';

if ((window as any).contentScriptInjected) { // eslint-disable-line @typescript-eslint/no-explicit-any
  console.log("InstantWar-Auto-Login content script already active.");
} else {
  (window as any).contentScriptInjected = true; // eslint-disable-line @typescript-eslint/no-explicit-any
  initIWAClick();
}

function initIWAClick() {
  const logToBackground = (message: string, type: 'info' | 'error' | 'warn' = 'info') => {
    try {
      chrome.runtime.sendMessage({ action: 'log', message: `[Tab] ${message}`, type });
    } catch (e) {
      console.log("Error sending log to background:", e);
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // ==================== ELEMENT WAITING ====================

  const waitForElement = (selector: string, timeout = 10000, interval = 500): Promise<HTMLElement | null> => {
    return new Promise<HTMLElement | null>((resolve) => {
      const startTime = Date.now();
      const checkElement = () => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          resolve(null);
        } else {
          setTimeout(checkElement, interval);
        }
      };
      checkElement();
    });
  };

  // ==================== LOGIN HANDLING ====================

  const handleLogin = async (_login: LoginData) => {
    logToBackground("Received login task.");

    // Step 1: Handle Sign Out if necessary (use waitForElement for consistency)
    const signOutButton = await waitForElement('#sign-btn', 5000);
    if (signOutButton && signOutButton.textContent?.trim() === 'Sign Out') {
      logToBackground("Already signed in. Clicking Sign Out.");
      signOutButton.click();
      await delay(3000);
    }

    // Step 2: Click "Play Now" button
    const playNowButton = await waitForElement('#play-btn-1, #play-btn-2, #play-btn-3, #play-btn-4, #play-btn-5');
    if (playNowButton) {
      logToBackground("Clicking Play Now button.");
      playNowButton.click();
    }
    

  };

  const fillLoginForm = async (login: LoginData) => {
    logToBackground("Filling login form.");
    
    // Handle create account page redirect
    if (window.location.href.includes("/authorization/account/create")) {
      await delay(3000);
      const signInLink = await waitForElement('a[href*="/authorization/Account/Login"]');
      if (signInLink) {
        signInLink.click();
        return;
      }
    }

    // Fill login form
    await delay(2000);
    const usernameField = await waitForElement('#Username') as HTMLInputElement;
    const passwordField = await waitForElement('#Password') as HTMLInputElement;
    const loginButton = await waitForElement('button[name="button"][value="login"]') as HTMLButtonElement;

    if (usernameField && passwordField && loginButton) {
      usernameField.value = login["User Name"];
      passwordField.value = login.Password;
      await delay(5000);
      loginButton.click();
      
      chrome.runtime.sendMessage({ action: 'loginFormSubmitted', login });
    } else {
      logToBackground("Login form elements not found.", 'error');
    }
  };

  // ==================== MESSAGE LISTENER ====================

  chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action === 'startAutomatedLogin') {
      await handleLogin(message.login);
    }
    else if (message.action === 'fillLoginForm') {
      await fillLoginForm(message.login);
    }
    return true;
  });
}
