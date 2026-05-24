import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { PlacementZone } from '../../_lib/widgets/types';

type Props = {
  zones: PlacementZone[];
  canvasW: number;
  canvasH: number;
  visible?: boolean;
};

/** Subtle hint where stickers can be placed (editor only). */
export function ZoneOverlay({ zones, canvasW, canvasH, visible = true }: Props) {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {zones.map((z, i) => (
        <View
          key={i}
          style={[
            st.zone,
            {
              left: z.x * canvasW,
              top: z.y * canvasH,
              width: z.w * canvasW,
              height: z.h * canvasH,
            },
          ]}
        />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  zone: {
    borderWidth: 1,
    borderColor: 'rgba(245,213,71,0.35)',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(245,213,71,0.06)',
  },
});
