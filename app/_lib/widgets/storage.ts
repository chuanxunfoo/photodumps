import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteWidgetPreview,
  hydrateWidget,
  persistWidgetPreview,
  widgetPreviewExists,
  writeWidgetManifest,
} from './widgetFiles';
import { normalizeWidgetPreview } from './normalizePreview';
import { syncWidgetsToHomeScreen } from './widgetHomeSync';
import type { SavedWidget } from './types';

const LIST_KEY = '@photodumps_widgets_v1';
const ACTIVE_KEY = '@photodumps_active_widget_v1';

function newWidgetId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readWidgetsRaw(): Promise<SavedWidget[]> {
  try {
    const raw = await AsyncStorage.getItem(LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedWidget[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(hydrateWidget).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function filterExisting(widgets: SavedWidget[]): Promise<SavedWidget[]> {
  const checks = await Promise.all(widgets.map(w => widgetPreviewExists(w.previewUri)));
  return widgets.filter((_, i) => checks[i]);
}

async function persistList(widgets: SavedWidget[]): Promise<void> {
  await AsyncStorage.setItem(LIST_KEY, JSON.stringify(widgets));
}

async function syncAll(widgets: SavedWidget[], activeWidgetId: string | null): Promise<void> {
  try {
    await writeWidgetManifest(widgets, activeWidgetId);
  } catch {
    /* in-app manifest is optional */
  }
  try {
    await syncWidgetsToHomeScreen(widgets, activeWidgetId);
  } catch {
    /* home screen widget sync requires App Group + native build */
  }
}

export async function getActiveWidgetId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export async function setActiveWidgetId(id: string | null): Promise<void> {
  if (id) await AsyncStorage.setItem(ACTIVE_KEY, id);
  else await AsyncStorage.removeItem(ACTIVE_KEY);
  const list = await loadWidgets();
  await syncAll(list, id);
}

export async function loadWidgets(): Promise<SavedWidget[]> {
  const sorted = await readWidgetsRaw();
  const existing = await filterExisting(sorted);
  if (existing.length !== sorted.length) {
    await persistList(existing);
    const active = await getActiveWidgetId();
    if (active && !existing.some(w => w.id === active)) {
      await AsyncStorage.setItem(ACTIVE_KEY, existing[0]?.id ?? '');
      if (!existing[0]) await AsyncStorage.removeItem(ACTIVE_KEY);
    }
  }
  const active = await getActiveWidgetId();
  await syncAll(existing, active);
  return existing;
}

export async function saveWidget(
  entry: Omit<SavedWidget, 'id' | 'createdAt' | 'updatedAt' | 'previewUri'>,
  previewTmpUri: string,
): Promise<SavedWidget> {
  const id = newWidgetId();
  const normalized = await normalizeWidgetPreview(previewTmpUri, entry.family);
  const previewUri = await persistWidgetPreview(normalized, id);
  const widget: SavedWidget = {
    ...entry,
    id,
    previewUri,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const list = await readWidgetsRaw();
  const next = [widget, ...list.filter(w => w.id !== id)].slice(0, 24);
  await persistList(next);
  await AsyncStorage.setItem(ACTIVE_KEY, widget.id);
  await syncAll(next, widget.id);
  return widget;
}

export async function getWidgetById(id: string): Promise<SavedWidget | null> {
  const list = await readWidgetsRaw();
  const w = list.find(x => x.id === id);
  if (!w) return null;
  const exists = await widgetPreviewExists(w.previewUri);
  return exists ? w : null;
}

export async function updateWidget(
  id: string,
  entry: Omit<SavedWidget, 'id' | 'createdAt' | 'updatedAt' | 'previewUri'>,
  previewTmpUri: string,
): Promise<SavedWidget> {
  const list = await readWidgetsRaw();
  const prev = list.find(w => w.id === id);
  if (!prev) throw new Error('NOT_FOUND');

  if (prev.previewUri) await deleteWidgetPreview(prev.previewUri);
  const normalized = await normalizeWidgetPreview(previewTmpUri, entry.family);
  const previewUri = await persistWidgetPreview(normalized, id);
  const widget: SavedWidget = {
    ...entry,
    id,
    previewUri,
    createdAt: prev.createdAt,
    updatedAt: Date.now(),
  };
  const next = list.map(w => (w.id === id ? widget : w));
  await persistList(next);
  const active = await getActiveWidgetId();
  await syncAll(next, active);
  return widget;
}

export async function deleteWidget(id: string): Promise<void> {
  const list = await readWidgetsRaw();
  const target = list.find(w => w.id === id);
  if (target) await deleteWidgetPreview(target.previewUri);
  const next = list.filter(w => w.id !== id);
  await persistList(next);
  const active = await getActiveWidgetId();
  const nextActive = active === id ? (next[0]?.id ?? null) : active;
  if (nextActive) await AsyncStorage.setItem(ACTIVE_KEY, nextActive);
  else await AsyncStorage.removeItem(ACTIVE_KEY);
  await syncAll(next, nextActive);
}
