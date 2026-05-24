import { BlurView } from 'expo-blur';
import { Home, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { SavedSticker } from '../../_lib/stickerStudio/types';

const { height: SH } = Dimensions.get('window');

type ThemeSlice = {
  bg: string;
  bg2: string;
  bg3: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  border: string;
  radiusMd: number;
};

type Props = {
  visible: boolean;
  library: SavedSticker[];
  theme: ThemeSlice;
  onClose: () => void;
  onStickerPress: (s: SavedSticker) => void;
};

export function StickerCollectionSheet({ visible, library, theme, onClose, onStickerPress }: Props) {
  const slide = useRef(new Animated.Value(SH)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : SH,
      friction: 11,
      tension: 68,
      useNativeDriver: true,
    }).start();
  }, [slide, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <Animated.View
            style={[
              st.sheet,
              { backgroundColor: theme.bg, transform: [{ translateY: slide }] },
            ]}
          >
            {Platform.OS === 'web' ? (
              <View style={[st.sheetGlass, { backgroundColor: 'rgba(14,14,22,0.96)' }]} />
            ) : (
              <BlurView intensity={80} tint="dark" style={st.sheetGlass} />
            )}
            <View style={st.handle} />
            <View style={st.header}>
              <View style={st.headerLeft}>
                <View style={[st.homeBadge, { backgroundColor: theme.accent }]}>
                  <Home size={18} color="#fff" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={[st.title, { color: theme.text }]}>Sticker home</Text>
                  <Text style={[st.sub, { color: theme.textSub }]}>
                    {library.length} {library.length === 1 ? 'sticker' : 'stickers'} saved
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={[st.closeBtn, { borderColor: theme.border }]} hitSlop={12}>
                <X size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
              {library.length === 0 ? (
                <View style={[st.empty, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
                  <Home size={36} color={theme.textMuted} strokeWidth={1.5} />
                  <Text style={[st.emptyTitle, { color: theme.text }]}>Your home is empty</Text>
                  <Text style={[st.emptySub, { color: theme.textSub }]}>
                    Scan something — it will fly into your home when ready.
                  </Text>
                </View>
              ) : (
                <View style={st.grid}>
                  {library.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.88}
                      style={[st.cell, { borderColor: theme.border, backgroundColor: theme.bg2, borderRadius: theme.radiusMd }]}
                      onPress={() => onStickerPress(s)}
                    >
                      <Image source={{ uri: s.uri }} style={st.cellImg} resizeMode="contain" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: SH * 0.82,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sheetGlass: { ...StyleSheet.absoluteFillObject },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  homeBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 36 },
  empty: {
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '47.5%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cellImg: { width: '100%', height: '100%' },
});
