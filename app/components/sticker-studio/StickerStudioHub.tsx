import { Image as ImageIcon, Layers, Plus, Sticker } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../AppHeader';
import type { SavedSticker } from '../../_lib/stickerStudio/types';

type ThemeSlice = {
  bg: string;
  bg2: string;
  bg3: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  border: string;
  borderW: number;
  radiusMd: number;
};

type Props = {
  library: SavedSticker[];
  titleFont?: string;
  theme: ThemeSlice;
  onBack: () => void;
  onNew: () => void;
  onGallery: () => void;
  onCollage: () => void;
  onStickerPress: (s: SavedSticker) => void;
};

export function StickerStudioHub({
  library,
  titleFont,
  theme,
  onBack,
  onNew,
  onGallery,
  onCollage,
  onStickerPress,
}: Props) {
  return (
    <View style={[st.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={st.flex} edges={['top']}>
        <AppHeader variant="detail" onBack={onBack} subtitle="Stickers & collage" />
        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={st.intro}>
            <Text style={[st.title, { color: theme.text, fontFamily: titleFont }]}>Sticker studio</Text>
            <Text style={[st.sub, { color: theme.textSub }]}>
              Pick a style, scan any object with the camera, or use a photo from your gallery.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onNew}
            style={[st.primary, { backgroundColor: theme.accent }]}
          >
            <Plus size={22} color="#fff" strokeWidth={2.5} />
            <Text style={st.primaryTxt}>New sticker (camera)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onGallery}
            style={[st.rowBtn, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
          >
            <ImageIcon size={20} color={theme.text} />
            <Text style={[st.rowBtnTxt, { color: theme.text }]}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onCollage}
            style={[st.rowBtn, { borderColor: theme.border, backgroundColor: theme.bg2, marginBottom: 24 }]}
          >
            <Layers size={20} color={theme.text} />
            <Text style={[st.rowBtnTxt, { color: theme.text }]}>Collage</Text>
          </TouchableOpacity>

          <Text style={[st.sectionLbl, { color: theme.textMuted }]}>Your stickers</Text>
          {library.length === 0 ? (
            <View style={[st.empty, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
              <Sticker size={32} color={theme.textMuted} strokeWidth={1.6} />
              <Text style={[st.emptyTitle, { color: theme.text }]}>No stickers yet</Text>
              <Text style={[st.emptySub, { color: theme.textSub }]}>Use camera or gallery to add one.</Text>
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
                  <View style={[st.cellInner, { backgroundColor: theme.bg3 }]} />
                  <Image source={{ uri: s.uri }} style={st.cellImg} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  intro: { marginTop: 4, marginBottom: 20, gap: 6 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  rowBtnTxt: { fontSize: 16, fontWeight: '700' },
  sectionLbl: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  empty: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '47.5%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cellInner: { ...StyleSheet.absoluteFillObject },
  cellImg: { width: '100%', height: '100%' },
});
