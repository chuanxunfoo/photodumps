import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Plus, Sparkles, Wand2 } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MinimalBackButton } from '../MinimalBackButton';
import { STICKER_CATEGORIES } from '../../_lib/stickerStudio/stickerCategory';
import type { CutoutResult, StickerCategory, TraceSettings } from '../../_lib/stickerStudio/types';
import { FramedCutout } from './FramedCutout';
import { StickerStepBar } from './StickerStepBar';
import { TraceControls } from './TraceControls';
import { STUDIO } from './stickerStudioUi';

const SW = Dimensions.get('window').width;
const PREVIEW = Math.min(SW - 48, 300);

type ThemeSlice = {
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  border: string;
  bg2: string;
  bg3: string;
  isDark: boolean;
};

type Props = {
  cutout: CutoutResult;
  trace: TraceSettings;
  onTraceChange: (t: TraceSettings) => void;
  onBack: () => void;
  category: StickerCategory;
  onCategoryChange: (c: StickerCategory) => void;
  onSave: () => void;
  onNew: () => void;
  saving: boolean;
  previewRef: React.RefObject<View | null>;
  theme: ThemeSlice;
  titleFont?: string;
};

export function StickerEditorScreen({
  cutout,
  trace,
  onTraceChange,
  onBack,
  category,
  onCategoryChange,
  onSave,
  onNew,
  saving,
  previewRef,
  theme,
  titleFont,
}: Props) {
  return (
    <View style={st.root}>
      <LinearGradient colors={[...STUDIO.bg]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={st.flex} edges={['top', 'bottom']}>
        <View style={st.topBar}>
          <MinimalBackButton onPress={onBack} color="#fff" size={26} />
          <Text style={[st.topTitle, titleFont ? { fontFamily: titleFont } : undefined]}>Style sticker</Text>
          <View style={{ width: 40 }} />
        </View>

        <StickerStepBar activeIndex={2} />

        <ScrollView
          style={st.flex}
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={st.previewShell}>
            <LinearGradient colors={[...STUDIO.card]} style={st.previewGrad}>
              <View style={st.previewGlow} />
              <FramedCutout
                uri={cutout.uri}
                trace={trace}
                width={PREVIEW}
                height={PREVIEW}
                exportRef={previewRef}
              />
            </LinearGradient>
            <Text style={st.previewHint}>Pinch-friendly preview · transparent when saved</Text>
          </View>

          <View style={st.panel}>
            <View style={st.panelHead}>
              <Sparkles size={14} color="#FFD54F" />
              <Text style={st.panelTitle}>Trace & vibe</Text>
            </View>
            <TraceControls trace={trace} onChange={onTraceChange} theme={theme} />
            <Text style={st.catLbl}>Collector tag</Text>
            <View style={st.catRow}>
              {STICKER_CATEGORIES.map(c => {
                const on = category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.88}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onCategoryChange(c.id);
                    }}
                    style={[st.catChip, on && st.catChipOn]}
                  >
                    <Text style={st.catEmoji}>{c.emoji}</Text>
                    <Text style={[st.catTxt, on && st.catTxtOn]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={st.footer}>
          <TouchableOpacity
            style={st.ghostBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNew();
            }}
          >
            <Plus size={18} color="#FF8EC7" />
            <Text style={st.ghostTxt}>Another</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={st.saveWrap}
            disabled={saving}
            onPress={() => void onSave()}
          >
            <LinearGradient colors={['#FF0055', '#BF5AF2']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={st.saveBtn}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Wand2 size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={st.saveTxt}>Save sticker</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  scroll: { paddingBottom: 16 },
  previewShell: { alignItems: 'center', paddingTop: 8, paddingHorizontal: 16 },
  previewGrad: {
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: PREVIEW + 40,
    minHeight: PREVIEW + 40,
  },
  previewGlow: {
    position: 'absolute',
    width: PREVIEW * 0.7,
    height: PREVIEW * 0.7,
    borderRadius: PREVIEW,
    backgroundColor: 'rgba(255,142,199,0.35)',
    top: '12%',
  },
  previewHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 10,
    fontWeight: '600',
  },
  panel: {
    marginTop: 16,
    marginHorizontal: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
    paddingBottom: 8,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  panelTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  catLbl: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 8,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  catChipOn: {
    borderColor: 'rgba(255,213,71,0.55)',
    backgroundColor: 'rgba(255,213,71,0.14)',
  },
  catEmoji: { fontSize: 14 },
  catTxt: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '700' },
  catTxtOn: { color: '#FFE566' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,142,199,0.35)',
  },
  ghostTxt: { color: '#FF8EC7', fontWeight: '800', fontSize: 14 },
  saveWrap: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveTxt: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});
