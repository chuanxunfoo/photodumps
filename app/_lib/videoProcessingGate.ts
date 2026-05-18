import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Avoid importing `expo-video-processing` directly: its entry file calls
 * `TurboModuleRegistry.getEnforcing('VideoProcessing')` and crashes when the
 * native module is not linked (e.g. Expo Go). Use this gate + native calls instead.
 */
function getVideoProcessingNative(): {
  trim?: (path: string, options: Record<string, unknown>) => Promise<string>;
  compress?: (options: Record<string, unknown>) => Promise<unknown>;
  deleteFile?: (path: string) => Promise<boolean>;
} | null {
  try {
    const t = (TurboModuleRegistry as { get?: (name: string) => unknown }).get?.('VideoProcessing');
    if (t && typeof t === 'object') return t as ReturnType<typeof getVideoProcessingNative>;
  } catch {
    /* ignore */
  }
  const nm = (NativeModules as { VideoProcessing?: object }).VideoProcessing;
  return (nm && typeof nm === 'object' ? nm : null) as ReturnType<typeof getVideoProcessingNative>;
}

export function isVideoProcessingAvailable(): boolean {
  const n = getVideoProcessingNative();
  return !!(n && typeof n.trim === 'function' && typeof n.compress === 'function');
}

const TRIM_DEFAULTS = {
  saveToPhoto: false,
  type: 'video',
  outputExt: 'mp4',
  removeAfterSavedToPhoto: false,
  removeAfterFailedToSavePhoto: false,
  enableRotation: false,
  rotationAngle: 0,
};

export async function trimVideoFile(absolutePath: string, startTimeMs: number, endTimeMs: number): Promise<string> {
  const vp = getVideoProcessingNative();
  if (!vp?.trim) {
    throw new Error('VideoProcessing native module is not linked. Use a dev or production build that includes expo-video-processing.');
  }
  return vp.trim(absolutePath, {
    ...TRIM_DEFAULTS,
    startTime: Math.round(startTimeMs),
    endTime: Math.round(endTimeMs),
  });
}

export async function compressVideoFile(options: Record<string, unknown>): Promise<unknown> {
  const vp = getVideoProcessingNative();
  if (!vp?.compress) {
    throw new Error('VideoProcessing native module is not linked.');
  }
  return vp.compress(options);
}

export async function deleteVideoProcessingFile(absolutePath: string): Promise<void> {
  const vp = getVideoProcessingNative();
  if (vp?.deleteFile) {
    try {
      await vp.deleteFile(absolutePath);
    } catch {
      /* ignore */
    }
  }
}
