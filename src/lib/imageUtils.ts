import * as FileSystem from 'expo-file-system/legacy';
import { generateId } from './id';

export async function uriToBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

const PERSISTED_IMAGES_DIR = `${FileSystem.documentDirectory}drape-images/`;

// ImagePicker/camera results live in the OS's cache/temp directory, which
// can be cleared at any time. Anything we persist long-term in a Zustand
// store (garment photos, the reference body photo) needs its own copy in
// the app's document directory, or the stored URI eventually points at
// nothing and thumbnails silently go blank.
export async function persistPickedImage(uri: string, prefix: string): Promise<string> {
  const dirInfo = await FileSystem.getInfoAsync(PERSISTED_IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PERSISTED_IMAGES_DIR, { intermediates: true });
  }
  const extensionMatch = uri.match(/\.(\w+)(\?.*)?$/);
  const extension = extensionMatch ? extensionMatch[1] : 'jpg';
  const destination = `${PERSISTED_IMAGES_DIR}${prefix}-${generateId()}.${extension}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

// Best-effort cleanup — only removes files we ourselves persisted (under
// PERSISTED_IMAGES_DIR), and never throws, since a missing/already-deleted
// file shouldn't block whatever the caller is doing (e.g. deleting a garment).
export async function deletePersistedImage(uri: string | null | undefined): Promise<void> {
  if (!uri || !uri.startsWith(PERSISTED_IMAGES_DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore — nothing useful to do if this fails
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip the "data:...;base64," prefix if present
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}
