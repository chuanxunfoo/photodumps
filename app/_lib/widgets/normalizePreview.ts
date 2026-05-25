import * as ImageManipulator from 'expo-image-manipulator';
import { WIDGET_FAMILIES, type WidgetFamily } from './widgetSizes';

function withFileScheme(path: string): string {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

/** Resize saved widget PNG to exact iOS export pixels for the chosen family. */
export async function normalizeWidgetPreview(tmpUri: string, family: WidgetFamily): Promise<string> {
  const { exportW, exportH } = WIDGET_FAMILIES[family];
  const result = await ImageManipulator.manipulateAsync(
    withFileScheme(tmpUri),
    [{ resize: { width: exportW, height: exportH } }],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG },
  );
  return withFileScheme(result.uri);
}
