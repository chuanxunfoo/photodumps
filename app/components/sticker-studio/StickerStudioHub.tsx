import { Image as ImageIcon, Layers, Plus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../AppHeader';
import type { SavedSticker } from '../../_lib/stickerStudio/types';
import { StickerPhysicsJar } from './StickerPhysicsJar';
import {
  filterStickerLibrary,
  stickerFilterCounts,
  visibleStickerFilters,
  type StickerHubFilterId,
} from './stickerHubFilters';

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
  headerSubtitle: string;
  theme: ThemeSlice;
  onBack: () => void;
  onNew: () => void;
  onGallery: () => void;
  onCollage: () => void;
  onStickerPress: (s: SavedSticker) => void;
};

const SAGE = '#8FAF7E';

export function StickerStudioHub({
  library,
  titleFont,
  headerSubtitle,
  theme,
  onBack,
  onNew,
  onGallery,
  onCollage,
  onStickerPress,
}: Props) {
  const [filter, setFilter] = useState<StickerHubFilterId>('all');

  const filtered = useMemo(() => filterStickerLibrary(library, filter), [library, filter]);

  const filters = useMemo(() => visibleStickerFilters(library), [library]);
  const counts = useMemo(() => stickerFilterCounts(library), [library]);

  useEffect(() => {
    if (!filters.some(f => f.id === filter)) setFilter('all');
  }, [filters, filter]);

  return (
    <View style={[st.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={st.flex} edges={['top']}>
        <AppHeader variant="detail" onBack={onBack} subtitle={headerSubtitle} />

        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <Text style={[st.pageTitle, { color: theme.text, fontFamily: titleFont }]}>Your stickers</Text>

          <StickerPhysicsJar stickers={filtered} theme={theme} onStickerPress={onStickerPress} />

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.filterRow}
            style={st.filterScroll}
          >
            {filters.map(f => {
              const on = filter === f.id;
              const n = counts[f.id];
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.88}
                  onPress={() => setFilter(f.id)}
                  style={[
                    st.chip,
                    {
                      backgroundColor: on ? SAGE : theme.bg2,
                      borderColor: on ? SAGE : theme.border,
                    },
                  ]}
                >
                  <Text style={[st.chipTxt, { color: on ? '#1a1a1a' : theme.textSub }]}>
                    {f.label}
                    {n > 0 ? ` · ${n}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[st.statsRow, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <View style={st.statCell}>
              <Text style={[st.statLbl, { color: theme.textMuted }]}>Total</Text>
              <Text style={[st.statVal, { color: SAGE }]}>{library.length}</Text>
            </View>
            <View style={[st.statDiv, { backgroundColor: theme.border }]} />
            <View style={st.statCell}>
              <Text style={[st.statLbl, { color: theme.textMuted }]}>Showing</Text>
              <Text style={[st.statVal, { color: theme.text }]}>{filtered.length}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onNew}
            style={[st.primary, { backgroundColor: theme.accent }]}
          >
            <Plus size={20} color="#fff" strokeWidth={2.2} />
            <Text style={st.primaryTxt}>New sticker</Text>
          </TouchableOpacity>

          <View style={st.actionRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onGallery}
              style={[st.actionBtn, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
            >
              <ImageIcon size={18} color={theme.text} strokeWidth={2} />
              <Text style={[st.actionTxt, { color: theme.textSub }]}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onCollage}
              style={[st.actionBtn, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
            >
              <Layers size={18} color={theme.text} strokeWidth={2} />
              <Text style={[st.actionTxt, { color: theme.textSub }]}>Collage</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 36 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 12,
    marginTop: 4,
  },
  filterScroll: { marginBottom: 14, flexGrow: 0 },
  filterRow: { gap: 8, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipTxt: { fontSize: 13, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  statDiv: { width: 1, marginVertical: 10 },
  statLbl: { fontSize: 11, fontWeight: '600' },
  statVal: { fontSize: 22, fontWeight: '800' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 8,
  },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionTxt: { fontSize: 13, fontWeight: '600' },
});
