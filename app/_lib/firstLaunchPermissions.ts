import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { markPermissionsSetupComplete, PERMISSIONS_SETUP_KEY } from './appLaunchFlow';
import { waitUntilNativeIdle } from './launchStability';

async function getMediaLibrary() {
  await waitUntilNativeIdle();
  return import('expo-media-library');
}

async function getNotifications() {
  return import('./notificationsNative');
}

export type PhotoAccessStatus = 'granted' | 'limited' | 'denied' | 'undetermined';

/** Serializes every MediaLibrary TurboModule call — concurrent access crashes Hermes on iOS. */
let mediaLibraryMutex: Promise<unknown> = Promise.resolve();

export function withMediaLibraryMutex<T>(fn: () => Promise<T>): Promise<T> {
  const run = mediaLibraryMutex.then(fn, fn);
  mediaLibraryMutex = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** No-op — auto permission flows removed; kept for call-site compatibility. */
export function whenPermissionsFlowSettled(): Promise<void> {
  return Promise.resolve();
}

/** @deprecated Auto prompts on launch are disabled — use requestPhotoAccessFromUser. */
export async function promptFirstLaunchPermissionsIfNeeded(): Promise<void> {
  const done = await AsyncStorage.getItem(PERMISSIONS_SETUP_KEY);
  if (done === '1') return;
}

/** Read photo permission without showing a system dialog. */
export async function getPhotoAccessStatus(): Promise<PhotoAccessStatus> {
  if (Platform.OS === 'web') return 'granted';
  return withMediaLibraryMutex(async () => {
    try {
      const MediaLibrary = await getMediaLibrary();
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') return 'granted';
      if (status === 'limited') return 'limited';
      if (status === 'denied') return 'denied';
      return 'undetermined';
    } catch (e) {
      console.warn('[permissions] getPhotoAccessStatus failed', e);
      return 'undetermined';
    }
  });
}

/**
 * Single entry point for photo + notification permission prompts.
 * Call only from an explicit user tap (never on launch / focus).
 */
export async function requestPhotoAccessFromUser(): Promise<PhotoAccessStatus> {
  if (Platform.OS === 'web') {
    await markPermissionsSetupComplete();
    return 'granted';
  }

  return withMediaLibraryMutex(async () => {
    try {
      const MediaLibrary = await getMediaLibrary();
      const { requestPermissionsAsync } = await getNotifications();

      const existing = await MediaLibrary.getPermissionsAsync();
      if (existing.status === 'granted' || existing.status === 'limited') {
        await markPermissionsSetupComplete();
        try {
          await requestPermissionsAsync();
        } catch {
          /* notifications are optional */
        }
        return existing.status === 'limited' ? 'limited' : 'granted';
      }

      const result = await MediaLibrary.requestPermissionsAsync();
      await markPermissionsSetupComplete();

      try {
        await requestPermissionsAsync();
      } catch {
        /* notifications are optional */
      }

      if (result.status === 'limited') return 'limited';
      return result.granted ? 'granted' : 'denied';
    } catch (e) {
      console.warn('[permissions] requestPhotoAccessFromUser failed', e);
      await markPermissionsSetupComplete();
      return 'denied';
    }
  });
}
