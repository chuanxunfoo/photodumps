/** iOS WidgetKit family sizes in points (iPhone 15 class). */
export type WidgetFamily = 'small' | 'medium' | 'large';

export type WidgetFamilySpec = {
  id: WidgetFamily;
  label: string;
  /** width / height */
  aspectRatio: number;
  /** Export pixel size (@3x) for bundled template PNGs. */
  exportW: number;
  exportH: number;
};

export const WIDGET_FAMILIES: Record<WidgetFamily, WidgetFamilySpec> = {
  small: {
    id: 'small',
    label: 'Small',
    aspectRatio: 1,
    exportW: 510,
    exportH: 510,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    aspectRatio: 360 / 169,
    exportW: 1080,
    exportH: 507,
  },
  large: {
    id: 'large',
    label: 'Large',
    aspectRatio: 360 / 376,
    exportW: 1080,
    exportH: 1128,
  },
};

export function familyAspect(family: WidgetFamily): number {
  return WIDGET_FAMILIES[family].aspectRatio;
}
