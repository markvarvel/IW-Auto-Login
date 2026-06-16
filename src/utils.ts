import * as XLSX from 'xlsx';

// ==================== FILE HANDLE STORAGE (IndexedDB) ====================
// Persists the user's FileSystemFileHandle across popup restarts
// so we can auto-reload the xlsx without re-prompting.

const HANDLE_DB = 'IW-AClick-FileHandle';
const HANDLE_STORE = 'fileHandle';
const RECENT_KEY = 'recentFiles';
const ACTIVE_KEY = 'activeFile';

/** A recent file entry storing the name and a persistent file handle. */
export interface RecentFile {
  name: string;
  handle: FileSystemFileHandle;
  lastUsed: number;
}

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB, 2);
    request.onupgradeneeded = () => {
      // v1 had a single 'fileHandle' key; v2 adds 'recentFiles' and 'activeFile'
      request.result.createObjectStore(HANDLE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Load the full list of recent files from IndexedDB. */
export async function loadRecentFiles(): Promise<RecentFile[]> {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readonly');
    const request = tx.objectStore(HANDLE_STORE).get(RECENT_KEY);
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

/** Save the recent files list to IndexedDB. */
async function saveRecentFiles(files: RecentFile[]): Promise<void> {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    tx.objectStore(HANDLE_STORE).put(files, RECENT_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Load the active (currently selected) file handle. */
export async function loadActiveFile(): Promise<RecentFile | null> {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readonly');
    const request = tx.objectStore(HANDLE_STORE).get(ACTIVE_KEY);
    request.onsuccess = () => { db.close(); resolve(request.result || null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

/** Save the active file handle. */
async function saveActiveFile(file: RecentFile): Promise<void> {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    tx.objectStore(HANDLE_STORE).put(file, ACTIVE_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Add a file to the recent list (or update if same name exists). Moves it to the top. */
export async function addRecentFile(handle: FileSystemFileHandle, name: string): Promise<void> {
  const recent = await loadRecentFiles();
  const filtered = recent.filter((f) => f.name !== name);
  const entry: RecentFile = { name, handle, lastUsed: Date.now() };
  const updated = [entry, ...filtered].slice(0, 10); // keep max 10
  await saveRecentFiles(updated);
  await saveActiveFile(entry);
}

/** Remove a file from the recent list by name. Also clears the active file if it matches. */
export async function removeRecentFile(name: string): Promise<void> {
  const recent = await loadRecentFiles();
  await saveRecentFiles(recent.filter((f) => f.name !== name));
  // Clear the active file in IndexedDB if we just removed it
  const active = await loadActiveFile();
  if (active && active.name === name) {
    const db = await openHandleDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite');
      tx.objectStore(HANDLE_STORE).delete(ACTIVE_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }
}

/** Read an xlsx file from a stored FileSystemFileHandle. Returns null if permission denied or file missing. */
export async function readFromHandle(handle: FileSystemFileHandle): Promise<LoginData[] | null> {
  try {
    // Try reading directly first — permission may already be granted from a previous session
    let permission = await handle.queryPermission({ mode: 'read' } as PermissionOptions);
    if (permission !== 'granted') {
      // Only request permission if not already granted (avoids prompt outside user gesture)
      permission = await handle.requestPermission({ mode: 'read' } as PermissionOptions);
    }
    if (permission !== 'granted') return null;
    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();
    return parseXlsxBuffer(buffer);
  } catch {
    return null;
  }
}

const getBrowserAPI = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  }
  throw new Error("No browser API found.");
};

export const browserAPI = getBrowserAPI();

export interface LoginData {
  "User Name": string;
  "Player Name"?: string;
  "Email"?: string;
  "Password": string;
  "Old Pass"?: string;
  "Tab"?: string;
  "Position"?: number;
  "Color"?: string;
}

/** All required column headers in the xlsx template. */
export const REQUIRED_COLUMNS: (keyof LoginData)[] = [
  'User Name', 'Password',
];

/** Optional columns that may or may not be present. */
export const OPTIONAL_COLUMNS: (keyof LoginData)[] = ['Player Name', 'Email', 'Old Pass', 'Tab', 'Position', 'Color'];

/** Result of schema validation against the expected xlsx columns. */
export interface SchemaValidation {
  missingColumns: string[];
  extraColumns: string[];
  isValid: boolean;
}

/**
 * Validate parsed login data against the expected column schema.
 * Returns which columns are missing or extra relative to the template.
 */
export function validateLoginData(data: LoginData[]): SchemaValidation {
  if (data.length === 0) return { missingColumns: [], extraColumns: [], isValid: true };
  const actualColumns = Object.keys(data[0]) as string[];
  const actualSet = new Set(actualColumns);

  const missingColumns = REQUIRED_COLUMNS.filter((col) => !actualSet.has(col));
  const allExpected = new Set<string>([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
  const extraColumns = actualColumns.filter((col) => !allExpected.has(col));

  return {
    missingColumns,
    extraColumns,
    isValid: missingColumns.length === 0,
  };
}

/** Color indicator: green < 1h, orange < 1d, red > 1d */
export const getTimestampColor = (timestamp: string): string => {
  const loaded = new Date(timestamp);
  if (isNaN(loaded.getTime())) return 'text.secondary';
  const diffH = (Date.now() - loaded.getTime()) / (1000 * 60 * 60);
  if (diffH < 1) return '#4caf50'; // green
  if (diffH < 24) return '#ff9800'; // orange
  return '#f44336'; // red
};

/** Parse an ArrayBuffer containing xlsx data into LoginData[] */
export const parseXlsxBuffer = (buffer: ArrayBuffer): LoginData[] => {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

export interface ProgressState {
  current: number;
  total: number;
  active: boolean;
}



/** Returns true if the timestamp is within the last 5 minutes */
export const isRecentlyLoaded = (timestamp: string): boolean => {
  const loaded = new Date(timestamp);
  if (isNaN(loaded.getTime())) return false;
  return (Date.now() - loaded.getTime()) < 5 * 60 * 1000;
};
