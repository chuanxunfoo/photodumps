import { Maximize2, Minimize2, X } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { captionStyleFromWidget } from '../../_lib/widgets/captionPresets';
import type { WidgetCaption } from '../../_lib/widgets/types';

const MIN_SIZE = 9;
const MAX_SIZE = 36;

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
  const boxW = canvasW * 0.86;
  const boxH = Math.max(fontSize * 1.6, 32);

  const cx = useSharedValue(caption.nx * canvasW);
  const cy = useSharedValue(caption.ny * canvasH);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startSize = useSharedValue(fontSize);
  const liveSize = useSharedValue(fontSize);

  useEffect(() => {
    cx.value = caption.nx * canvasW;
    cy.value = caption.ny * canvasH;
    liveSize.value = caption.fontSize ?? 15;
  }, [caption.nx, caption.ny, caption.fontSize, canvasW, canvasH, cx, cy, liveSize]);

  const commitPos = useCallback(() => {
    onChange({
      nx: Math.max(0.08, Math.min(0.92, cx.value / canvasW)),
      ny: Math.max(0.06, Math.min(0.94, cy.value / canvasH)),
    });
  }, [canvasH, canvasW, cx, cy, onChange]);

  const commitSize = useCallback(
    (size: number) => {
      onChange({ fontSize: Math.round(size) });
    },
    [onChange],
  );

  const notifySelect = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

  const bumpSize = useCallback(
    (delta: number) => {
      const next = Math.max(MIN_SIZE, Math.min(MAX_SIZE, (caption.fontSize ?? 15) + delta));
      onChange({ fontSize: next });
    },
    [caption.fontSize, onChange],
  );

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
      runOnJS(commitPos)();
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      runOnJS(notifySelect)();
      startSize.value = liveSize.value;
    })
    .onUpdate(e => {
      liveSize.value = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startSize.value * e.scale));
    })
    .onEnd(() => {
      runOnJS(commitSize)(liveSize.value);
    });

  const gesture = Gesture.Simultaneous(pan, pinch);
  const textStyle = captionStyleFromWidget(caption);

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
      <Text style={[textStyle, { fontSize }]}>{caption.text}</Text>
      {!hideChrome && selected && (
        <>
          {onRemove && (
            <TouchableOpacity onPress={onRemove} style={st.del} hitSlop={10} activeOpacity={0.9}>
              <X size={11} color="#FFF" strokeWidth={3} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => bumpSize(2)}
            style={st.resizeBtn}
            hitSlop={8}
            activeOpacity={0.85}
          >
            <Maximize2 size={10} color="#7a6f8a" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => bumpSize(-2)}
            style={st.resizeBtnMin}
            hitSlop={8}
            activeOpacity={0.85}
          >
            <Minimize2 size={10} color="#7a6f8a" strokeWidth={2.5} />
          </TouchableOpacity>
        </>
      )}
    </Reanimated.View>
  );

  if (hideChrome) return body;
  return <GestureDetector gesture={gesture}>{body}</GestureDetector>;
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 24,
  },
  selected: {
    borderWidth: 1,
    borderColor: 'rgba(199, 146, 198, 0.65)',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  del: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e8899a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  resizeBtn: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resizeBtnMin: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
