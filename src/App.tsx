import { useState, useMemo, useEffect } from 'react';
import {
  LoginData,
  ProgressState,
  browserAPI,
  parseXlsxBuffer,
  readFromHandle,
  validateLoginData,
  loadRecentFiles,
  addRecentFile,
  removeRecentFile,
  loadActiveFile,
  type RecentFile,
  type SchemaValidation,
} from './utils';
import LoginTab from './components/LoginTab';
import RefreshTab from './components/RefreshTab';
import LogsTab from './components/LogsTab';
import SettingsTab, { type ExtensionSettings, DEFAULT_SETTINGS } from './components/SettingsTab';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Refresh from '@mui/icons-material/Refresh';
import Upload from '@mui/icons-material/Upload';
import Help from '@mui/icons-material/Help';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import SettingsBrightness from '@mui/icons-material/SettingsBrightness';
import Settings from '@mui/icons-material/Settings';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

/** Try to read from the active stored file handle. Returns data or null. */
async function readStoredHandle(): Promise<LoginData[] | null> {
  try {
    const active = await loadActiveFile();
    if (!active) return null;
    return await readFromHandle(active.handle);
  } catch {
    return null;
  }
}

export default function App() {
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState<'system' | 'dark' | 'light'>('system');
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [tabIndex, setTabIndex] = useState(0);

  const isDark = darkMode === 'system' ? systemPrefersDark : darkMode === 'dark';

  // Login state
  const [loginCredentials, setLoginCredentials] = useState<LoginData[]>([]);
  const [rangeFilter, setRangeFilter] = useState('');

  // Refresh state
  const [refreshRangeFilter, setRefreshRangeFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Progress tracking
  const [loginProgress, setLoginProgress] = useState<ProgressState>({ current: 0, total: 0, active: false });
  const [refreshProgress, setRefreshProgress] = useState<ProgressState>({ current: 0, total: 0, active: false });

  // Last loaded timestamp
  const [lastLoaded, setLastLoaded] = useState<string>('');

  // Whether the user has chosen a file yet
  const [needsSetup, setNeedsSetup] = useState(true);

  // Schema validation warnings
  const [schemaWarning, setSchemaWarning] = useState<SchemaValidation | null>(null);

  // Recent files list
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [activeFileName, setActiveFileName] = useState('');

  // Logs
  const [logs, setLogs] = useState<string[]>([]);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'info' | 'error' | 'success' | 'warning';
    action?: { label: string; onClick: () => void };
  }>({ open: false, message: '', severity: 'info' });

  const showSnackbar = (
    message: string,
    severity: 'info' | 'error' | 'success' | 'warning' = 'info',
    action?: { label: string; onClick: () => void },
  ) => {
    setSnackbar({ open: true, message, severity, action });
  };

  const dismissSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  /** Apply loaded credentials to state + storage, run schema validation */
  const applyCredentials = async (data: LoginData[]) => {
    const validation = validateLoginData(data);
    setSchemaWarning(validation.isValid ? null : validation);
    const timestamp = new Date().toLocaleString();
    await browserAPI.storage.local.set({ loginCredentials: data, lastLoaded: timestamp });
    setLoginCredentials(data);
    setLastLoaded(timestamp);
    setNeedsSetup(false);
  };

  /** Refresh the recent files list from IndexedDB */
  const refreshRecentFiles = async () => {
    const files = await loadRecentFiles();
    setRecentFiles(files);
  };

  // ==================== MOUNT: auto-load from cache or stored handle ====================
  useEffect(() => {
    browserAPI.storage.local.get(
      ['loginCredentials', 'extensionLogs', 'loginProgress', 'refreshProgress', 'lastLoaded', 'darkMode'],
      async (result) => {
        // 1) Always try to re-read from the stored file handle to get the latest data
        const freshData = await readStoredHandle();
        if (freshData && freshData.length > 0) {
          await applyCredentials(freshData);
        } else if (result.loginCredentials && result.loginCredentials.length > 0) {
          // 2) Fall back to cached credentials if file handle is expired
          setLoginCredentials(result.loginCredentials);
          setNeedsSetup(false);
        }
        // else: needsSetup stays true → user sees the "Choose File" prompt
        // Load recent files list
        const files = await loadRecentFiles();
        setRecentFiles(files);
        const active = await loadActiveFile();
        setActiveFileName(active?.name || files[0]?.name || '');
        // Only load cached lastLoaded if we didn't re-read fresh data from file
        if (!freshData || freshData.length === 0) {
          if (result.lastLoaded) setLastLoaded(result.lastLoaded);
        }
        if (result.extensionLogs) setLogs(result.extensionLogs);
        if (result.loginProgress) setLoginProgress(result.loginProgress);
        if (result.refreshProgress) setRefreshProgress(result.refreshProgress);
        if (result.darkMode) setDarkMode(result.darkMode);
        if (result.extensionSettings) setSettings({ ...DEFAULT_SETTINGS, ...result.extensionSettings });
        if (result.extensionSettings?.defaultTab != null) setTabIndex(result.extensionSettings.defaultTab);
      }
    );

    const onStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        if (changes.extensionLogs) setLogs(changes.extensionLogs.newValue || []);
        if (changes.loginProgress) setLoginProgress(changes.loginProgress.newValue || { current: 0, total: 0, active: false });
        if (changes.refreshProgress) setRefreshProgress(changes.refreshProgress.newValue || { current: 0, total: 0, active: false });
      }
    };

    browserAPI.storage.onChanged.addListener(onStorageChange);
    return () => browserAPI.storage.onChanged.removeListener(onStorageChange);
  }, []);

  const cycleDarkMode = () => {
    setDarkMode((prev) => {
      const next = prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system';
      browserAPI.storage.local.set({ darkMode: next });
      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? 'dark' : 'light',
          primary: { main: '#00e5ff' },
          secondary: { main: '#ff1744' },
        },
      }),
    [isDark]
  );

  // ==================== FILE HANDLING ====================

/** Whether the File System Access API is available (not in extension popups). */
const hasFileSystemAccess = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  /**
   * Primary file chooser — uses the File System Access API if available,
   * otherwise falls back to a standard file input element.
   */
  const handleChooseFile = async () => {
    if (hasFileSystemAccess) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Excel Files',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                'application/vnd.ms-excel': ['.xls', '.xlt'],
              },
            },
          ],
          multiple: false,
        });
        const data = await readFromHandle(handle);
        if (data && data.length > 0) {
          await addRecentFile(handle, handle.name);
          await refreshRecentFiles();
          setActiveFileName(handle.name);
          await applyCredentials(data);
          showSnackbar(`Loaded ${data.length} login accounts`, 'success');
        } else {
          showSnackbar('No valid login data found. Check that your file has the correct column headers.', 'error');
        }
      } catch (err) {
        // User cancelled the picker — that's fine
        if ((err as Error).name !== 'AbortError') {
          showSnackbar(`Failed to load file: ${(err as Error).message}`, 'error');
        }
      }
    } else {
      // Fallback: trigger the hidden file input
      document.getElementById('file-upload-primary')?.click();
    }
  };

  /** File input handler — used by both the fallback chooser and the manual upload button */
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const json = parseXlsxBuffer(e.target?.result as ArrayBuffer);
        if (json.length > 0) {
          await applyCredentials(json);
          setActiveFileName(file.name);
          showSnackbar(`Loaded ${json.length} login accounts`, 'success');
        } else {
          showSnackbar('No valid login data found. Check that your file has the correct column headers.', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }
    // Reset input so same file can be re-selected
    event.target.value = '';
  };

  /** Select a file from the recent files list */
  const handleSelectRecentFile = async (file: RecentFile) => {
    try {
      const data = await readFromHandle(file.handle);
      if (data && data.length > 0) {
        // Move to top of recent list and mark as active
        await addRecentFile(file.handle, file.name);
        await refreshRecentFiles();
        setActiveFileName(file.name);
        await applyCredentials(data);
        showSnackbar(`Loaded ${data.length} login accounts from ${file.name}`, 'success');
      } else {
        await removeRecentFile(file.name);
        await refreshRecentFiles();
        showSnackbar(
          `Cannot read "${file.name}". The file may have been moved, renamed, or deleted.`,
          'error',
          { label: 'Choose File', onClick: handleChooseFile },
        );
      }
    } catch {
      await removeRecentFile(file.name);
      await refreshRecentFiles();
      showSnackbar(
        `Failed to read "${file.name}". It may have been moved or deleted.`,
        'error',
        { label: 'Choose File', onClick: handleChooseFile },
      );
    }
  };

  /** Remove a file from the recent list */
  const handleRemoveRecentFile = async (name: string) => {
    await removeRecentFile(name);
    await refreshRecentFiles();
    // If the removed file was the active one, pick the next file or show setup prompt
    if (name === activeFileName) {
      const remaining = (await loadRecentFiles());
      const nextActive = remaining[0]?.name || '';
      setActiveFileName(nextActive);
      if (!nextActive) {
        setLoginCredentials([]);
        setNeedsSetup(true);
        setSchemaWarning(null);
        await browserAPI.storage.local.remove('loginCredentials');
      }
    }
  };

  /** Reload: try stored handle first, fall back to file input prompt */
  const handleReloadFile = async () => {
    setIsReloading(true);
    try {
      const data = await readStoredHandle();
      if (data && data.length > 0) {
        await applyCredentials(data);
        showSnackbar(`Reloaded ${data.length} login accounts from your file`, 'success');
      } else {
        // Stored handle is invalid/expired — prompt user to choose again
        showSnackbar(
          'File reference expired. The file may have been moved or deleted.',
          'warning',
          { label: 'Choose File', onClick: handleChooseFile },
        );
      }
    } catch {
      showSnackbar(
        'Failed to reload file. It may have been moved or deleted.',
        'error',
        { label: 'Choose File', onClick: handleChooseFile },
      );
    }
    setIsReloading(false);
  };

  // ==================== LOGIN HANDLERS ====================

  const doStartLogin = () => {
    browserAPI.runtime.sendMessage({
      action: 'startAutomatedLogin',
      loginCredentials,
      rangeFilter,
    });
    showSnackbar('Starting automated login...', 'info');
  };

  const handleAutomateLogin = () => {
    if (loginCredentials.length === 0) {
      showSnackbar('No login data found. Please choose your Excel file first.', 'error');
      return;
    }
    if (settings.confirmBeforeStart) {
      setConfirmDialog({
        open: true,
        title: 'Start Login Automation',
        message: `This will attempt to log in to ${loginCredentials.length} accounts. Continue?`,
        onConfirm: doStartLogin,
      });
    } else {
      doStartLogin();
    }
  };

  const handleStopLogin = () => {
    browserAPI.runtime.sendMessage({ action: 'stopAutomatedLogin' });
    showSnackbar('Login automation stopped', 'warning');
  };

  // ==================== REFRESH HANDLERS ====================

  const doStartRefresh = () => {
    setIsRefreshing(true);
    browserAPI.runtime.sendMessage({
      action: 'startRefresh',
      rangeFilter: refreshRangeFilter,
    });
    showSnackbar('Starting refresh...', 'info');
  };

  const handleStartRefresh = () => {
    if (settings.confirmBeforeStart) {
      setConfirmDialog({
        open: true,
        title: 'Start Refresh',
        message: 'This will refresh all InstantWar tabs. Continue?',
        onConfirm: doStartRefresh,
      });
    } else {
      doStartRefresh();
    }
  };

  const handleStopRefresh = () => {
    browserAPI.runtime.sendMessage({ action: 'stopRefresh' });
    setIsRefreshing(false);
    showSnackbar('Refresh stopped', 'warning');
  };

  const handleClearLogs = () => {
    browserAPI.storage.local.set({ extensionLogs: [] });
    setLogs([]);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100%', minWidth: 350, maxWidth: 800, height: 650, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            InstantWar-Auto-Login
          </Typography>
          <Tooltip title={`Theme: ${darkMode.charAt(0).toUpperCase() + darkMode.slice(1)} (click to cycle)`} arrow>
            <IconButton onClick={cycleDarkMode} size="small">
              {darkMode === 'dark' ? <DarkMode /> : darkMode === 'light' ? <LightMode /> : <SettingsBrightness />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tabs navigation */}
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} variant="fullWidth">
          <Tab label="Login" icon={<Upload />} />
          <Tab label="Refresh" icon={<Refresh />} />
          <Tab label="Logs" icon={<Help />} />
          <Tab label="Settings" icon={<Settings />} />
        </Tabs>

        {/* Tab content */}
        <Box key={tabIndex} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } }, animation: 'fadeIn 0.2s ease-out' }}>
          {tabIndex === 0 && (
            <LoginTab
              loginCredentials={loginCredentials}
              rangeFilter={rangeFilter}
              onRangeFilterChange={setRangeFilter}
              isReloading={isReloading}
              lastLoaded={lastLoaded}
              loginProgress={loginProgress}
              needsSetup={needsSetup}
              schemaWarning={schemaWarning}
              recentFiles={recentFiles}
              activeFileName={activeFileName}
              onChooseFile={handleChooseFile}
              onSelectRecentFile={handleSelectRecentFile}
              onRemoveRecentFile={handleRemoveRecentFile}
              onFileUpload={handleFileInput}
              onReload={handleReloadFile}
              onStartLogin={handleAutomateLogin}
              onStopLogin={handleStopLogin}
            />
          )}

          {tabIndex === 1 && (
            <RefreshTab
              refreshRangeFilter={refreshRangeFilter}
              onRefreshRangeFilterChange={setRefreshRangeFilter}
              isRefreshing={isRefreshing}
              refreshProgress={refreshProgress}
              onStartRefresh={handleStartRefresh}
              onStopRefresh={handleStopRefresh}
            />
          )}

          {tabIndex === 2 && (
            <LogsTab
              logs={logs}
              onClearLogs={handleClearLogs}
            />
          )}

          {tabIndex === 3 && (
            <SettingsTab
              settings={settings}
              onSettingsChange={setSettings}
            />
          )}
        </Box>
      </Box>

      {/* Hidden file input for fallback when showOpenFilePicker is unavailable */}
      <input
        type="file"
        accept=".xlsx,.xls"
        id="file-upload-primary"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      {/* Confirmation dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((d) => ({ ...d, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialog((d) => ({ ...d, open: false }))}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const action = confirmDialog.onConfirm;
              setConfirmDialog((d) => ({ ...d, open: false }));
              action();
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.action ? null : 3000}
        onClose={dismissSnackbar}
        action={
          snackbar.action ? (
            <Button color="inherit" size="small" onClick={() => { dismissSnackbar(); snackbar.action!.onClick(); }}>
              {snackbar.action.label}
            </Button>
          ) : undefined
        }
      >
        <Alert onClose={dismissSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
