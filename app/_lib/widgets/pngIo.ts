import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

export function withFileScheme(path: string): string {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

export function stripFileScheme(path: string): string {
  return path.replace(/^file:\/\//, '');
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Read file bytes without loading a multi‑MB base64 string when possible. */
export async function readFileBytes(uri: string): Promise<Uint8Array> {
  const fileUri = withFileScheme(uri);
  try {
    const file = new File(fileUri);
    if (file.exists) return await file.bytes();
  } catch {
    /* fall through */
  }
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(base64);
}

/** Write raw bytes (e.g. PNG) without building a giant base64 string in JS. */
export async function writeFileBytes(uri: string, bytes: Uint8Array): Promise<string> {
  const fileUri = withFileScheme(uri);
  const plain = stripFileScheme(fileUri);
  const parent = plain.slice(0, plain.lastIndexOf('/'));
  if (parent) {
    try {
      await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
    } catch {
      /* parent may already exist */
    }
  }

  try {
    const file = new File(fileUri);
    file.write(bytes);
    return fileUri;
  } catch {
    /* legacy fallback — chunked to avoid OOM on huge strings */
    const chunk = 0x4000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      for (let j = 0; j < slice.length; j++) binary += String.fromCharCode(slice[j]!);
    }
    await FileSystem.writeAsStringAsync(fileUri, btoa(binary), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  }
}
