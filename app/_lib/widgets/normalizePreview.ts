import * as ImageManipulator from 'expo-image-manipulator';
import { fixWidgetPreviewAlpha } from './fixPreviewAlpha';
import { prepareWidgetPreview } from './prepareWidgetPreview';
import { withFileScheme } from './pngIo';
import { widgetPreviewExists } from './widgetFiles';
import { WIDGET_FAMILIES, type WidgetFamily } from './widgetSizes';

export async function normalizeWidgetPreview(tmpUri: string, family: WidgetFamily): Promise<string> {
  const { exportW, exportH } = WIDGET_FAMILIES[family];
  const src = withFileScheme(tmpUri);

  try {
    const out = await prepareWidgetPreview(src, exportW, exportH);
    const polished = await fixWidgetPreviewAlpha(out);
    if (await widgetPreviewExists(polished)) return withFileScheme(polished);
  } catch (e) {
    if (__DEV__) console.warn('prepareWidgetPreview failed:', e);
  }

  const alphaFixed = await fixWidgetPreviewAlpha(src);
  const maxSide = Math.max(exportW, exportH);
  const result = await ImageManipulator.manipulateAsync(
    alphaFixed,
    [{ resize: { width: maxSide } }],
    { format: ImageManipulator.SaveFormat.PNG, compress: 1 },
  );
  return fixWidgetPreviewAlpha(withFileScheme(result.uri));
}
