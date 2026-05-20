/**
 * Metro stub when EXPO_PUBLIC_NATIVE_CUTOUT is not set (Expo Go / `expo start`).
 * Prevents NitroModules from loading in Expo Go.
 */

export type BackgroundRemovalErrorCode =
  | 'INVALID_PATH'
  | 'FILE_NOT_FOUND'
  | 'DECODE_FAILED'
  | 'ML_PROCESSING_FAILED'
  | 'SAVE_FAILED'
  | 'INVALID_OPTIONS'
  | 'UNKNOWN';

export class BackgroundRemovalError extends Error {
  readonly code: BackgroundRemovalErrorCode = 'ML_PROCESSING_FAILED';

  constructor(message = 'Native cutout is not available in Expo Go.') {
    super(message);
    this.name = 'BackgroundRemovalError';
  }

  toUserMessage(): string {
    return 'On-device cutout needs a dev build (npx expo run:android) or cloud API key in .env.';
  }
}

export async function removeBgImage(): Promise<string> {
  throw new BackgroundRemovalError();
}

export async function compressImage(uri: string): Promise<string> {
  return uri;
}

export async function generateThumbhash(): Promise<string> {
  return '';
}

export function clearCache(): void {}
export function getCacheSize(): number {
  return 0;
}
