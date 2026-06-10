import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const GAP = 14;
const STROKE = 2.5;
const RADIUS = 18;

type Props = {
  contentW: number;
  contentH: number;
};

/** Dashed ring with visible gap around cutout — works on iOS + Android (SVG, not borderStyle). */
export function CutoutSelectionRing({ contentW, contentH }: Props) {
  const ringW = contentW + GAP * 2;
  const ringH = contentH + GAP * 2;

  return (
    <View style={[styles.wrap, { width: ringW, height: ringH }]} pointerEvents="none">
      <Svg width={ringW} height={ringH}>
        <Rect
          x={STROKE}
          y={STROKE}
          width={ringW - STROKE * 2}
          height={ringH - STROKE * 2}
          rx={RADIUS}
          ry={RADIUS}
          fill="none"
          stroke="rgba(245,213,71,0.92)"
          strokeWidth={STROKE}
          strokeDasharray="10 7"
        />
      </Svg>
    </View>
  );
}

export const CUTOUT_RING_GAP = GAP;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
