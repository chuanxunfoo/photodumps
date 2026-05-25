import type { RefObject } from 'react';
import { InteractionManager, Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

function normalizeTmpUri(uri: string): string {
  const t = uri.trim();
  if (t.startsWith('file://')) return t;
  if (t.startsWith('/')) return `file://${t}`;
  return t;
}

/** Capture widget canvas — transparent PNG for cutout widgets (no white matte). */
export async function captureWidgetPng(
  exportRef: RefObject<View | null>,
  transparent = false,
): Promise<string> {
  if (!exportRef.current) throw new Error('NO_VIEW');

  await new Promise<void>(resolve => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  await new Promise(r => setTimeout(r, 220));

  const opts = {
    format: 'png' as const,
    quality: 1,
    result: 'tmpfile' as const,
    snapshotContentContainer: false,
    ...(transparent && Platform.OS === 'ios' ? { backgroundColor: 'transparent' } : {}),
  };

  try {
    const uri = await captureRef(exportRef, opts);
    if (!uri) throw new Error('CAPTURE_EMPTY');
    return normalizeTmpUri(uri);
  } catch {
    await new Promise(r => setTimeout(r, 300));
    const uri = await captureRef(exportRef, opts);
    if (!uri) throw new Error('CAPTURE_EMPTY');
    return normalizeTmpUri(uri);
  }
}
