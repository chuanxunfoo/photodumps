import React from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { chalkLayers, frameOuterStyle } from '../../_lib/stickerStudio/frameStyles';
import type { FrameId } from '../../_lib/stickerStudio/types';

type Props = {
  uri: string;
  frameId: FrameId;
  width: number;
  height?: number;
  aspect?: number;
  showScanBox?: boolean;
};

export function FramedCutout({
  uri,
  frameId,
  width,
  height,
  aspect = 1,
  showScanBox = false,
}: Props) {
  const h = height ?? Math.round(width / aspect);
  const outer = frameOuterStyle(frameId);
  const layers = chalkLayers(frameId);

  return (
    <View style={[styles.wrap, { width, height: h }]}>
      {showScanBox && (
        <View style={styles.scanBox} pointerEvents="none">
          <View style={[styles.scanCorner, styles.tl]} />
          <View style={[styles.scanCorner, styles.tr]} />
          <View style={[styles.scanCorner, styles.bl]} />
          <View style={[styles.scanCorner, styles.br]} />
        </View>
      )}
      <View style={[styles.outer, outer, { maxWidth: width, maxHeight: h, position: 'relative' }]}>
        {layers.map((layer, i) => (
          <View key={i} style={[layer as ViewStyle, { width: '100%', height: '100%' }]} />
        ))}
        <View style={[styles.checker, { width: width * 0.78, height: h * 0.78 }]}>
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  outer: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  checker: {
    backgroundColor: '#3a3a44',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  scanBox: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 213, 79, 0.85)',
    borderRadius: 8,
    margin: 12,
  },
  scanCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#FFD54F',
  },
  tl: { top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3 },
});
