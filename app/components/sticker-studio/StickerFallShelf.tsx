import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Sticker } from 'lucide-react-native';
import type { SavedSticker } from '../../_lib/stickerStudio/types';
import { layoutStickersOnShelf } from './stickerHubFilters';

const SHELF_H = 248;
const STICKER_SZ = 68;

type ThemeSlice = {
  bg2: string;
  bg3: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
};

type Props = {
  stickers: SavedSticker[];
  theme: ThemeSlice;
  onStickerPress: (s: SavedSticker) => void;
};

function FallingSticker({
  item,
  delayMs,
  onPress,
}: {
  item: ReturnType<typeof layoutStickersOnShelf>[0];
  delayMs: number;
  onPress: () => void;
}) {
  const x = useSharedValue(item.initX);
  const y = useSharedValue(item.initY);
  const rot = useSharedValue(item.rotation);
  const scale = useSharedValue(0.82);

  useEffect(() => {
    x.value = item.initX;
    y.value = item.initY;
    rot.value = item.rotation;
    scale.value = 0.82;
    const spring = { damping: 14, stiffness: 110, mass: 0.85 };
    scale.value = withDelay(delayMs, withSpring(1, spring));
    x.value = withDelay(delayMs, withSpring(item.targetX, spring));
    y.value = withDelay(delayMs, withSpring(item.targetY, { damping: 13, stiffness: 95, mass: 0.9 }));
    rot.value = withDelay(delayMs, withSpring(item.rotation * 0.35, spring));
  }, [delayMs, item.initX, item.initY, item.rotation, item.targetX, item.targetY, rot, scale, x, y]);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: item.size,
    height: item.size,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Reanimated.View style={animStyle}>
      <Pressable onPress={onPress} style={st.stickerPress}>
        <Image source={{ uri: item.sticker.uri }} style={st.stickerImg} resizeMode="contain" />
      </Pressable>
    </Reanimated.View>
  );
}

export function StickerFallShelf({ stickers, theme, onStickerPress }: Props) {
  const [width, setWidth] = useState(0);

  const layout = useMemo(
    () => layoutStickersOnShelf(stickers, width, SHELF_H, STICKER_SZ),
    [stickers, width],
  );

  const layoutKey = useMemo(
    () => stickers.map(s => s.id).join('|') + `:${width}`,
    [stickers, width],
  );

  return (
    <View
      style={[st.shelf, { backgroundColor: theme.bg2, borderColor: theme.border }]}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={[st.shelfFloor, { backgroundColor: theme.bg3 }]} />
      {stickers.length === 0 ? (
        <View style={st.empty}>
          <Sticker size={28} color={theme.textMuted} strokeWidth={1.5} />
          <Text style={[st.emptyTxt, { color: theme.textSub }]}>Stickers land here</Text>
          <Text style={[st.emptySub, { color: theme.textMuted }]}>Create one with the camera below</Text>
        </View>
      ) : width > 0 ? (
        <View style={st.stage} key={layoutKey}>
          {layout.map((item, i) => (
            <FallingSticker
              key={item.sticker.id}
              item={item}
              delayMs={i * 55}
              onPress={() => onStickerPress(item.sticker)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  shelf: {
    height: SHELF_H,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  shelfFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    opacity: 0.65,
  },
  stage: {
    flex: 1,
    position: 'relative',
  },
  stickerPress: {
    width: STICKER_SZ,
    height: STICKER_SZ,
  },
  stickerImg: {
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 20,
  },
  emptyTxt: { fontSize: 14, fontWeight: '700' },
  emptySub: { fontSize: 12, fontWeight: '500' },
});
