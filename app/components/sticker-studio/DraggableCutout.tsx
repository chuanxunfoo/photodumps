import React, { useEffect } from 'react';
import { Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import type { PlacedCutout } from '../../_lib/stickerStudio/types';

type Props = {
  item: PlacedCutout;
  boundW: number;
  boundH: number;
  baseSize?: number;
  onRemove: () => void;
  onChange: (key: string, patch: Partial<PlacedCutout>) => void;
  selected?: boolean;
  onSelect?: () => void;
  /** Hide delete button (e.g. while exporting collage screenshot). */
  hideChrome?: boolean;
};

/** Saved stickers are already rendered PNGs — show as-is (no second trace / checkerboard). */
export function DraggableCutout({
  item,
  boundW,
  boundH,
  baseSize = 140,
  onRemove,
  onChange,
  selected,
  onSelect,
  hideChrome = false,
}: Props) {
  const tx = useSharedValue(item.x);
  const ty = useSharedValue(item.y);
  const sc = useSharedValue(item.scale);
  const rot = useSharedValue(item.rotation);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startSc = useSharedValue(1);
  const startRot = useSharedValue(0);

  useEffect(() => {
    tx.value = item.x;
    ty.value = item.y;
    sc.value = item.scale;
    rot.value = item.rotation;
  }, [item.key, item.x, item.y, item.scale, item.rotation, rot, sc, tx, ty]);

  const commit = () => {
    onChange(item.key, {
      x: tx.value,
      y: ty.value,
      scale: sc.value,
      rotation: rot.value,
    });
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      runOnJS(onSelect)?.();
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate(e => {
      const pad = baseSize * sc.value * 0.5;
      tx.value = Math.max(-pad, Math.min(boundW - pad, startX.value + e.translationX));
      ty.value = Math.max(-pad, Math.min(boundH - pad, startY.value + e.translationY));
    })
    .onEnd(() => runOnJS(commit)());

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startSc.value = sc.value;
    })
    .onUpdate(e => {
      sc.value = Math.max(0.25, Math.min(3.2, startSc.value * e.scale));
    })
    .onEnd(() => runOnJS(commit)());

  const rotate = Gesture.Rotation()
    .onBegin(() => {
      startRot.value = rot.value;
    })
    .onUpdate(e => {
      rot.value = startRot.value + e.rotation;
    })
    .onEnd(() => runOnJS(commit)());

  const composed = Gesture.Simultaneous(pan, pinch, rotate);

  const aStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    zIndex: selected ? 20 : 10,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: sc.value },
      { rotate: `${rot.value}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Reanimated.View style={aStyle}>
        <Image
          source={{ uri: item.uri }}
          style={{ width: baseSize, height: baseSize, backgroundColor: 'transparent' }}
          resizeMode="contain"
        />
        {!hideChrome && selected && (
          <TouchableOpacity onPress={onRemove} style={styles.del} hitSlop={10}>
            <X size={11} color="#FFF" strokeWidth={3} />
          </TouchableOpacity>
        )}
      </Reanimated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  del: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF0055',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
});
