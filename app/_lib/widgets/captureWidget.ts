import type { RefObject } from 'react';
import { InteractionManager, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

function normalizeTmpUri(uri: string): string {
  const t = uri.trim();
  if (t.startsWith('file://')) return t;
  if (t.startsWith('/')) return `file://${t}`;
  return t;
}

/** Capture the widget canvas to a temp PNG (retries once if the first pass fails). */
export async function captureWidgetPng(exportRef: RefObject<View | null>): Promise<string> {
  if (!exportRef.current) throw new Error('NO_VIEW');

  await new Promise<void>(resolve => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  await new Promise(r => setTimeout(r, 180));

  const opts = {
    format: 'png' as const,
    quality: 1,
    result: 'tmpfile' as const,
    snapshotContentContainer: false,
  };

  try {
    const uri = await captureRef(exportRef, opts);
    if (!uri) throw new Error('CAPTURE_EMPTY');
    return normalizeTmpUri(uri);
  } catch {
    await new Promise(r => setTimeout(r, 280));
    const uri = await captureRef(exportRef, opts);
    if (!uri) throw new Error('CAPTURE_EMPTY');
    return normalizeTmpUri(uri);
  }
}
