import * as FileSystem from 'expo-file-system/legacy';
import { readFileBytes, withFileScheme, writeFileBytes } from './pngIo';
import type { SavedWidget } from './types';

export function widgetDocumentsDir(): string {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error('NO_DOCUMENTS');
  return base.endsWith('/') ? base : `${base}/`;
}

export function widgetDir(): string {
  return `${widgetDocumentsDir()}widgets/`;
}

function manifestPath(): string {
  return `${widgetDir()}manifest.json`;
}

export function defaultPreviewUri(widgetId: string): string {
  return withFileScheme(`${widgetDir()}${widgetId}.png`);
}

/** Fill missing preview paths for entries saved before previewUri existed. */
export function hydrateWidget(raw: SavedWidget): SavedWidget {
  const base = raw.previewUri?.trim() ? raw : { ...raw, previewUri: defaultPreviewUri(raw.id) };
  return {
    ...base,
    family: base.family ?? 'medium',
    kind: base.kind ?? 'full',
  };
}

export async function widgetPreviewExists(uri: string): Promise<boolean> {
  if (!uri?.trim()) return false;
  try {
    const info = await FileSystem.getInfoAsync(withFileScheme(uri));
    return info.exists;
  } catch {
    return false;
  }
}

/** Copy rendered widget PNG into permanent app storage. */
export async function persistWidgetPreview(tmpUri: string, widgetId: string): Promise<string> {
  const src = withFileScheme(tmpUri.trim());
  const dir = widgetDir();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destPath = `${dir}${widgetId}.png`;
  const dest = withFileScheme(destPath);

  if (await widgetPreviewExists(dest)) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  try {
    await FileSystem.copyAsync({ from: src, to: dest });
  } catch {
    const bytes = await readFileBytes(src);
    await writeFileBytes(destPath, bytes);
  }

  if (!(await widgetPreviewExists(dest))) throw new Error('PREVIEW_WRITE_FAILED');
  return dest;
}

export async function deleteWidgetPreview(uri: string): Promise<void> {
  if (!uri?.trim()) return;
  try {
    const info = await FileSystem.getInfoAsync(withFileScheme(uri));
    if (info.exists) await FileSystem.deleteAsync(withFileScheme(uri), { idempotent: true });
  } catch {
    /* ignore */
  }
}

/** Written for the iOS Widget Extension to read the same designs as the app. */
export async function writeWidgetManifest(widgets: SavedWidget[], activeWidgetId: string | null): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(widgetDir(), { intermediates: true });
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      activeWidgetId,
      widgets: widgets.map(w => ({
        id: w.id,
        templateId: w.templateId,
        previewUri: w.previewUri,
        caption: w.caption?.text ?? null,
        createdAt: w.createdAt,
      })),
    };
    await FileSystem.writeAsStringAsync(manifestPath(), JSON.stringify(payload));
  } catch {
    /* manifest is best-effort */
  }
}
