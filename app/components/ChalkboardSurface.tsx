import React, { useMemo } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { chalkboardForTheme } from '../_lib/chalkboardTheme';
import type { ThemeId } from '../(tabs)/ThemeContext';

type Props = {
  themeId: ThemeId;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  bordered?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
};

/** Procedural grain dots — cheap chalkboard texture without image assets. */
const GRAIN_DOTS = Array.from({ length: 140 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%` as `${number}%`,
  top: `${(i * 23 + 11) % 100}%` as `${number}%`,
  size: 1 + (i % 3),
  opacity: 0.04 + (i % 5) * 0.018,
}));

const CHALK_STROKES = [12, 28, 44, 61, 78, 88];

export function ChalkboardSurface({ themeId, style, children, bordered = true, onLayout }: Props) {
  const palette = useMemo(() => chalkboardForTheme(themeId), [themeId]);

  return (
    <View
      style={[
        st.root,
        {
          backgroundColor: palette.base,
          borderColor: bordered ? palette.frame : 'transparent',
          borderWidth: bordered ? 2.5 : 0,
        },
        style,
      ]}
      onLayout={onLayout}
    >
      {CHALK_STROKES.map((top, i) => (
        <View
          key={`stroke-${i}`}
          pointerEvents="none"
          style={[
            st.stroke,
            {
              top: `${top}%`,
              backgroundColor: palette.chalkDust,
              opacity: 0.35 + (i % 3) * 0.1,
            },
          ]}
        />
      ))}
      {GRAIN_DOTS.map((d) => (
        <View
          key={d.id}
          pointerEvents="none"
          style={[
            st.dot,
            {
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size,
              borderRadius: d.size,
              backgroundColor: palette.grain,
              opacity: d.opacity,
            },
          ]}
        />
      ))}
      <View style={st.innerFrame} pointerEvents="none" />
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    overflow: 'hidden',
    borderRadius: 16,
    position: 'relative',
  },
  innerFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    margin: 3,
  },
  stroke: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  dot: {
    position: 'absolute',
  },
});
