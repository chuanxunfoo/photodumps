import { ExtensionStorage } from '@bacons/apple-targets';
import * as ImageManipulator from 'expo-image-manipulator';
import { Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { WIDGET_APP_GROUP, WIDGET_STORAGE_KEYS } from './constants';
import type { SavedWidget } from './types';

function withFileScheme(path: string): string {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

function sharedContainerUri(): string | null {
  try {
    const base = Paths.appleSharedContainers[WIDGET_APP_GROUP];
    return base?.uri ?? null;
  } catch {
    return null;
  }
}

async function copyPreviewToAppGroup(widgetId: string, localUri: string): Promise<boolean> {
  const containerUri = sharedContainerUri();
  if (!containerUri) return false;

  const previewsDir = `${containerUri.replace(/\/$/, '')}/previews`;
  const destPath = `${previewsDir}/${widgetId}.png`;

  try {
    await LegacyFS.makeDirectoryAsync(previewsDir, { intermediates: true });
    await LegacyFS.copyAsync({ from: withFileScheme(localUri), to: destPath });
    const info = await LegacyFS.getInfoAsync(destPath);
    return info.exists;
  } catch {
    return false;
  }
}

async function storeActivePreviewBase64(localUri: string, storage: ExtensionStorage): Promise<void> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      withFileScheme(localUri),
      [{ resize: { width: 480 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.PNG, base64: true },
    );
    if (result.base64) {
      storage.set(WIDGET_STORAGE_KEYS.activePreviewB64, result.base64);
    }
  } catch {
    storage.remove(WIDGET_STORAGE_KEYS.activePreviewB64);
  }
}

/** Push all saved designs + previews into the App Group for the home screen widget picker. */
export async function syncWidgetsToHomeScreen(
  widgets: SavedWidget[],
  activeWidgetId: string | null,
): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const active = (activeWidgetId ? widgets.find(w => w.id === activeWidgetId) : null) ?? widgets[0];
    const storage = new ExtensionStorage(WIDGET_APP_GROUP);

    for (const w of widgets) {
      await copyPreviewToAppGroup(w.id, w.previewUri);
    }

    storage.set(
      WIDGET_STORAGE_KEYS.manifest,
      JSON.stringify(
        widgets.map(w => ({
          id: w.id,
          templateId: w.templateId,
          family: w.family,
          kind: w.kind,
          caption: w.caption?.text ?? null,
          createdAt: w.createdAt,
        })),
      ),
    );

    if (active) {
      storage.set(WIDGET_STORAGE_KEYS.activeId, active.id);
      storage.set(WIDGET_STORAGE_KEYS.activeCaption, active.caption?.text ?? '');
      storage.set(WIDGET_STORAGE_KEYS.activeKind, active.kind);
      const copied = await copyPreviewToAppGroup(active.id, active.previewUri);
      if (!copied) await storeActivePreviewBase64(active.previewUri, storage);
      else storage.remove(WIDGET_STORAGE_KEYS.activePreviewB64);
    } else {
      storage.remove(WIDGET_STORAGE_KEYS.activeId);
      storage.remove(WIDGET_STORAGE_KEYS.activeCaption);
      storage.remove(WIDGET_STORAGE_KEYS.activeKind);
      storage.remove(WIDGET_STORAGE_KEYS.activePreviewB64);
    }

    ExtensionStorage.reloadWidget('PhotodumpsStickerWidget');
  } catch {
    /* ExtensionStorage missing in Expo Go / old builds */
  }
}
