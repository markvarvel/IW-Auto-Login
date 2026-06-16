/**
 * Tests for the content.ts login form interaction.
 *
 * content.ts runs code at module scope (re-injection guard + initIWAClick),
 * so each test group uses dynamic import() with fresh mocks via vi.resetModules().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupChromeMock, mocks } from './__mocks__/chrome';

// ---------- DOM mock helpers ----------

function createFakeElement(tag: string, attrs: Record<string, string> = {}) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

// ---------- Tests ----------

describe('content.ts', () => {
  let querySelectorMock: ReturnType<typeof vi.fn>;
  let originalLocation: PropertyDescriptor | undefined;

  beforeEach(async () => {
    vi.useFakeTimers();
    setupChromeMock();
    vi.resetModules();

    // Save original window.location descriptor before any override
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location');

    // Reset the re-injection guard
    delete (window as Record<string, unknown>).contentScriptInjected;

    // Mock document.querySelector
    querySelectorMock = vi.fn(() => null);
    vi.spyOn(document, 'querySelector').mockImplementation(querySelectorMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (window as Record<string, unknown>).contentScriptInjected;

    // Restore original window.location if it was overridden by Object.defineProperty
    if (originalLocation) {
      Object.defineProperty(window, 'location', originalLocation);
    }
  });

  // ===== re-injection guard =====

  describe('re-injection guard', () => {
    it('sets contentScriptInjected on first import', async () => {
      await import('./content');
      expect((window as Record<string, unknown>).contentScriptInjected).toBe(true);
    });

    it('logs warning on second import', async () => {
      // First import
      (window as Record<string, unknown>).contentScriptInjected = true;
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await import('./content');

      expect(consoleSpy).toHaveBeenCalledWith(
        'InstantWar-Auto-Login content script already active.',
      );
      consoleSpy.mockRestore();
    });
  });

  // ===== waitForElement =====

  describe('waitForElement (via fillLoginForm)', () => {
    it('fills login form when all elements are found', async () => {
      // Create fake form elements
      const usernameField = createFakeElement('input', { id: 'Username' }) as HTMLInputElement;
      const passwordField = createFakeElement('input', { id: 'Password' }) as HTMLInputElement;
      const loginButton = createFakeElement('button', { name: 'button', value: 'login' }) as HTMLButtonElement;
      vi.spyOn(loginButton, 'click').mockImplementation(() => {});

      querySelectorMock.mockImplementation((selector: string) => {
        if (selector === '#Username') return usernameField;
        if (selector === '#Password') return passwordField;
        if (selector === 'button[name="button"][value="login"]') return loginButton;
        return null;
      });

      await import('./content');

      // Send fillLoginForm message
      const messagePromise = mocks.onMessage.fire(
        {
          action: 'fillLoginForm',
          login: { 'User Name': 'alice', Password: 'secret123' },
        },
        {} as chrome.runtime.MessageSender,
        vi.fn(),
      );

      // Advance past the 2000ms delay before filling form
      await vi.advanceTimersByTimeAsync(2500);

      // Check form was filled
      expect(usernameField.value).toBe('alice');
      expect(passwordField.value).toBe('secret123');

      // Advance past the 5000ms delay before clicking login
      await vi.advanceTimersByTimeAsync(5500);

      expect(loginButton.click).toHaveBeenCalled();

      // Should have sent loginFormSubmitted message
      await messagePromise;
      expect(mocks.tabsSendMessage).not.toHaveBeenCalled(); // sendMessage is from chrome.runtime, not tabs
    });

    it('sends loginFormSubmitted after clicking login', async () => {
      const usernameField = createFakeElement('input', { id: 'Username' }) as HTMLInputElement;
      const passwordField = createFakeElement('input', { id: 'Password' }) as HTMLInputElement;
      const loginButton = createFakeElement('button', { name: 'button', value: 'login' }) as HTMLButtonElement;
      vi.spyOn(loginButton, 'click').mockImplementation(() => {});

      querySelectorMock.mockImplementation((selector: string) => {
        if (selector === '#Username') return usernameField;
        if (selector === '#Password') return passwordField;
        if (selector === 'button[name="button"][value="login"]') return loginButton;
        return null;
      });

      await import('./content');

      const login = { 'User Name': 'bob', Password: 'pass456' };
      mocks.onMessage.fire(
        { action: 'fillLoginForm', login },
        {} as chrome.runtime.MessageSender,
        vi.fn(),
      );

      // Advance past delays: 2000ms (before fill) + 5000ms (before click)
      await vi.advanceTimersByTimeAsync(8000);

      // chrome.runtime.sendMessage should have been called with loginFormSubmitted
      expect(mocks.runtimeSendMessage).toHaveBeenCalledWith({
        action: 'loginFormSubmitted',
        login,
      });
    });

    it('logs error when form elements are not found', async () => {
      // All queries return null — no form elements
      querySelectorMock.mockReturnValue(null);

      await import('./content');

      mocks.onMessage.fire(
        {
          action: 'fillLoginForm',
          login: { 'User Name': 'test', Password: 'test' },
        },
        {} as chrome.runtime.MessageSender,
        vi.fn(),
      );

      // fillLoginForm awaits 3 sequential waitForElement calls (#Username, #Password, button),
      // each polling for up to 10s. Total: 2000ms delay + 3×10s = 32s.
      await vi.advanceTimersByTimeAsync(35000);

      // Should have sent a log message about missing elements via sendMessage
      expect(mocks.runtimeSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'log',
          message: expect.stringContaining('Login form elements not found'),
        }),
      );
    });

    it('handles create account page redirect', async () => {
      // Mock window.location.href for the create account page
      const testUrl = 'https://services-g-use1.instantwar.com/authorization/account/create';
      Object.defineProperty(window, 'location', {
        value: {
          href: testUrl,
          toString: () => testUrl,
        },
        writable: true,
        configurable: true,
      });

      const signInLink = createFakeElement('a', { href: '/authorization/Account/Login' });
      vi.spyOn(signInLink, 'click').mockImplementation(() => {});

      querySelectorMock.mockImplementation((selector: string) => {
        if (selector.includes('/authorization/Account/Login')) return signInLink;
        return null;
      });

      await import('./content');

      mocks.onMessage.fire(
        {
          action: 'fillLoginForm',
          login: { 'User Name': 'test', Password: 'test' },
        },
        {} as chrome.runtime.MessageSender,
        vi.fn(),
      );

      // Advance past the 3000ms delay on create account page
      await vi.advanceTimersByTimeAsync(3500);

      expect(signInLink.click).toHaveBeenCalled();
    });
  });

  // ===== handleLogin =====

  describe('handleLogin (via startAutomatedLogin)', () => {
    it('clicks Sign Out if already signed in, then Play Now', async () => {
      const signOutBtn = createFakeElement('button', { id: 'sign-btn' });
      signOutBtn.textContent = 'Sign Out';
      vi.spyOn(signOutBtn, 'click').mockImplementation(() => {});

      const playBtn = createFakeElement('button', { id: 'play-btn-1' });
      vi.spyOn(playBtn, 'click').mockImplementation(() => {});

      querySelectorMock.mockImplementation((selector: string) => {
        if (selector === '#sign-btn') return signOutBtn;
        if (selector.includes('play-btn')) return playBtn;
        return null;
      });

      await import('./content');

      mocks.onMessage.fire(
        {
          action: 'startAutomatedLogin',
          login: { 'User Name': 'alice', Password: 'secret' },
        },
        {} as chrome.runtime.MessageSender,
        vi.fn(),
      );

      // Advance past the 5000ms waitForElement timeout for sign-btn
      await vi.advanceTimersByTimeAsync(5500);

      // Should click Sign Out
      expect(signOutBtn.click).toHaveBeenCalled();

      // Advance past the 3000ms delay after sign out
      await vi.advanceTimersByTimeAsync(3500);

      // Should then click Play Now
      expect(playBtn.click).toHaveBeenCalled();
    });

    it('clicks Play Now directly when not signed in', async () => {
      const playBtn = createFakeElement('button', { id: 'play-btn-2' });
      vi.spyOn(playBtn, 'click').mockImplementation(() => {});

      querySelectorMock.mockImplementation((selector: string) => {
        if (selector === '#sign-btn') return null; // no sign-out button
        if (selector.includes('play-btn')) return playBtn;
        return null;
      });

      await import('./content');

      mocks.onMessage.fire(
        {
          action: 'startAutomatedLogin',
          login: { 'User Name': 'bob', Password: 'pass' },
        },
        {} as chrome.runtime.MessageSender,
        vi.fn(),
      );

      // Advance past the 5000ms waitForElement for sign-btn (returns null)
      // Then the Play Now waitForElement resolves immediately
      await vi.advanceTimersByTimeAsync(5500);

      expect(playBtn.click).toHaveBeenCalled();
    });

    it('logs when Play Now button is not found', async () => {
      querySelectorMock.mockReturnValue(null);

      await import('./content');

      mocks.onMessage.fire(
        {
          action: 'startAutomatedLogin',
          login: { 'User Name': 'test', Password: 'test' },
        },
        {} as chrome.runtime.MessageSender,
        vi.fn(),
      );

      // Advance past the 5000ms waitForElement for sign-btn
      await vi.advanceTimersByTimeAsync(5500);

      // Should have logged "Received login task." via sendMessage
      expect(mocks.runtimeSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'log',
          message: expect.stringContaining('Received login task'),
        }),
      );
    });
  });

  // ===== logToBackground =====

  describe('logToBackground', () => {
    it('sends log messages to background via chrome.runtime.sendMessage', async () => {
      querySelectorMock.mockReturnValue(null);

      await import('./content');

      mocks.onMessage.fire(
        {
          action: 'fillLoginForm',
          login: { 'User Name': 'test', Password: 'test' },
        },
        {} as chrome.runtime.MessageSender,
        vi.fn(),
      );

      // Advance past delays so logToBackground is called
      await vi.advanceTimersByTimeAsync(8000);

      // logToBackground sends to chrome.runtime.sendMessage with [Tab] prefix
      expect(mocks.runtimeSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'log',
          message: expect.stringContaining('[Tab]'),
        }),
      );
    });
  });
});
