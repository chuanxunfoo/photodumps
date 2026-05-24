import { X } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { captionTextStyle } from '../../_lib/widgets/captionPresets';
import type { WidgetCaption } from '../../_lib/widgets/types';

type Props = {
  caption: WidgetCaption;
  canvasW: number;
  canvasH: number;
  hideChrome?: boolean;
  onChange: (patch: Partial<WidgetCaption>) => void;
  onSelect?: () => void;
  onRemove?: () => void;
  selected?: boolean;
};

export function DraggableCaption({
  caption,
  canvasW,
  canvasH,
  hideChrome = false,
  onChange,
  onSelect,
  onRemove,
  selected = false,
}: Props) {
  const fontSize = caption.fontSize ?? 15;
  const boxW = canvasW * 0.82;
  const boxH = Math.max(fontSize * 1.5, 28);

  const cx = useSharedValue(caption.nx * canvasW);
  const cy = useSharedValue(caption.ny * canvasH);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    cx.value = caption.nx * canvasW;
    cy.value = caption.ny * canvasH;
  }, [caption.nx, caption.ny, canvasW, canvasH, cx, cy]);

  const commit = useCallback(() => {
    onChange({
      nx: Math.max(0.1, Math.min(0.9, cx.value / canvasW)),
      ny: Math.max(0.08, Math.min(0.92, cy.value / canvasH)),
    });
  }, [canvasH, canvasW, cx, cy, onChange]);

  const notifySelect = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      runOnJS(notifySelect)();
      startX.value = cx.value;
      startY.value = cy.value;
    })
    .onUpdate(e => {
      const padX = boxW / 2;
      const padY = boxH / 2;
      cx.value = Math.max(padX, Math.min(canvasW - padX, startX.value + e.translationX));
      cy.value = Math.max(padY, Math.min(canvasH - padY, startY.value + e.translationY));
    })
    .onEnd(() => {
      runOnJS(commit)();
    });

  const textStyle = captionTextStyle(caption.fontId, caption.colorId, fontSize);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cx.value - boxW / 2 },
      { translateY: cy.value - boxH / 2 },
    ],
  }));

  const body = (
    <Reanimated.View
      style={[
        st.wrap,
        { width: boxW, minHeight: boxH },
        animStyle,
        !hideChrome && selected && st.selected,
      ]}
      pointerEvents={hideChrome ? 'none' : 'auto'}
    >
      <Text style={textStyle}>{caption.text}</Text>
      {!hideChrome && selected && onRemove && (
        <TouchableOpacity onPress={onRemove} style={st.del} hitSlop={10} activeOpacity={0.9}>
          <X size={11} color="#FFF" strokeWidth={3} />
        </TouchableOpacity>
      )}
    </Reanimated.View>
  );

  if (hideChrome) return body;

  return <GestureDetector gesture={pan}>{body}</GestureDetector>;
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 24,
  },
  selected: {
    borderWidth: 1,
    borderColor: 'rgba(255,0,85,0.55)',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  del: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF0055',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
});
