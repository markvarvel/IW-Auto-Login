/**
 * Global type declarations for APIs not fully covered by @types/chrome.
 */

// File System Access API — queryPermission / requestPermission on FileSystemFileHandle
interface FileSystemFileHandle {
  queryPermission(descriptor: { mode: string }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: string }): Promise<PermissionState>;
}

// Window.showOpenFilePicker — File System Access API
interface Window {
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}

interface OpenFilePickerOptions {
  types?: FilePickerAcceptType[];
  multiple?: boolean;
}

interface FilePickerAcceptType {
  description?: string;
  accept?: Record<string, string[]>;
}
