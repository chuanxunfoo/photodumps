import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CameraRigId } from './types';

export type SavedDigiShot = {
  id: string;
  uri: string;
  rigId: CameraRigId;
  createdAt: number;
  wbPreset?: string;
  evBias?: number;
};

const KEY = '@photodumps_digicam_v1';
const MAX = 120;

export async function loadDigiShots(): Promise<SavedDigiShot[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDigiShot[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveDigiShot(
  entry: Omit<SavedDigiShot, 'id' | 'createdAt'>,
): Promise<SavedDigiShot> {
  const list = await loadDigiShots();
  const shot: SavedDigiShot = {
    ...entry,
    id: `dc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([shot, ...list].slice(0, MAX)));
  return shot;
}

export async function deleteDigiShot(id: string): Promise<void> {
  const list = await loadDigiShots();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter(s => s.id !== id)));
}
