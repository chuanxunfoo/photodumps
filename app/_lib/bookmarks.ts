import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@swipeclean_bookmarks_v1';

export type BookmarkEntry = {
  id: string;
  uri: string;
  width: number;
  height: number;
  mediaType: 'photo' | 'video';
  creationTime: number;
  dateStr: string;
  sizeMB: number;
};

export async function getBookmarks(): Promise<BookmarkEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is BookmarkEntry =>
        x && typeof x === 'object' && typeof (x as BookmarkEntry).id === 'string' && typeof (x as BookmarkEntry).uri === 'string',
    );
  } catch {
    return [];
  }
}

export async function addBookmark(entry: BookmarkEntry): Promise<void> {
  const list = await getBookmarks();
  if (list.some((b) => b.id === entry.id)) return;
  const next = [entry, ...list].slice(0, 500);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function removeBookmark(id: string): Promise<void> {
  const list = await getBookmarks();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((b) => b.id !== id)));
}
