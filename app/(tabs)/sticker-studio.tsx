/**
 * Sticker Studio — AI-style cutouts, cute frames, collage compositor (Pro).
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { CutoutError, cutoutMethodLabel, extractSubject } from '../_lib/stickerStudio/cutoutEngine';
import { FRAME_OPTIONS } from '../_lib/stickerStudio/frameStyles';
import { deleteSticker, loadStickers, saveSticker } from '../_lib/stickerStudio/storage';
import type { CutoutResult, FrameId, PlacedCutout, SavedSticker } from '../_lib/stickerStudio/types';
import { AppHeader } from '../components/AppHeader';
import { DraggableCutout } from '../components/sticker-studio/DraggableCutout';
import { FramedCutout } from '../components/sticker-studio/FramedCutout';
import {
  Camera,
  Download,
  Image as ImageIcon,
  Layers,
  Plus,
  Scan,
  Sparkles,
  Sticker,
  Trash2,
  Wand2,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { resolveTypeface, useTheme } from './ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_W = SCREEN_W - 28;
const CANVAS_H = Math.round(Math.min(SCREEN_H * 0.52, CANVAS_W * 1.28));
const PREVIEW_SIZE = Math.min(SCREEN_W - 48, 320);

type Phase = 'hub' | 'camera' | 'processing' | 'frame' | 'collage';

export default function StickerStudioScreen() {
  const goBack = useExploreAwareBack();
  const { theme } = useTheme();
  const fonts = resolveTypeface(theme);

  const [phase, setPhase] = useState<Phase>('hub');
  const [library, setLibrary] = useState<SavedSticker[]>([]);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [cutout, setCutout] = useState<CutoutResult | null>(null);
  const [frameId, setFrameId] = useState<FrameId>('solid-white');
  const [cutoutMethod, setCutoutMethod] = useState<string>('');
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedCutout[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processPct, setProcessPct] = useState(0);
  const [processStage, setProcessStage] = useState('');

  const previewRef = useRef<View>(null);
  const collageRef = useRef<View>(null);
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCamPerm] = useCameraPermissions();

  const refreshLibrary = useCallback(async () => {
    setLibrary(await loadStickers());
  }, []);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.92,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets[0]) return;
    await runCutout(res.assets[0].uri);
  };

  const runCutout = async (uri: string) => {
    setSourceUri(uri);
    setPhase('processing');
    setCutout(null);
    setProcessPct(0);
    setProcessStage('Starting');
    try {
      const result = await extractSubject(uri, (pct, stage) => {
        setProcessPct(pct);
        setProcessStage(stage);
      });
      setCutout(result);
      setCutoutMethod(cutoutMethodLabel(result.method));
      setPhase('frame');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg =
        e instanceof CutoutError
          ? e.message
          : 'Use one clear subject (food, drink, person, object) with contrast against the background.';
      Alert.alert('Could not cut out subject', msg);
      setPhase('hub');
    }
  };

  const captureAndCutout = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
    if (photo?.uri) await runCutout(photo.uri);
  };

  const onMakeSticker = async () => {
    if (!cutout || !previewRef.current) return;
    setSaving(true);
    try {
      const uri = await captureRef(previewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await saveSticker({ uri, frameId, sourceUri: sourceUri ?? undefined });
      await refreshLibrary();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sticker saved', 'Add it to a collage or make another cutout.', [
        { text: 'Collage', onPress: () => startCollage() },
        { text: 'Done', style: 'cancel', onPress: () => setPhase('hub') },
      ]);
    } catch {
      Alert.alert('Save failed', 'Could not save this sticker. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const startCollage = async () => {
    if (library.length === 0) {
      Alert.alert('No stickers yet', 'Create a cutout sticker first.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets[0]) return;
    setBgUri(res.assets[0].uri);
    setPlaced([]);
    setSelectedKey(null);
    setPhase('collage');
  };

  const addPlacedFromLibrary = (s: SavedSticker) => {
    const key = `p_${Date.now()}`;
    setPlaced(prev => [
      ...prev,
      {
        key,
        stickerId: s.id,
        uri: s.uri,
        frameId: s.frameId,
        x: CANVAS_W / 2 - 70 + (prev.length % 3) * 24,
        y: CANVAS_H / 2 - 70 + (prev.length % 2) * 30,
        scale: 1,
        rotation: ((prev.length % 5) - 2) * 0.08,
      },
    ]);
    setSelectedKey(key);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const exportCollage = async () => {
    if (!collageRef.current || !bgUri) return;
    setExporting(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to save your collage.');
        return;
      }
      const uri = await captureRef(collageRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Collage saved to your gallery.');
    } catch {
      Alert.alert('Export failed', 'Could not save the collage.');
    } finally {
      setExporting(false);
    }
  };

  const openNewCutout = () => {
    Alert.alert('New cutout', 'Snap or import a photo — we find the main subject for you.', [
      { text: 'Camera', onPress: () => setPhase('camera') },
      { text: 'Gallery', onPress: () => void pickFromGallery() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ─── CAMERA ───────────────────────────────────────────────────────────────
  if (phase === 'camera') {
    if (!camPerm?.granted) {
      return (
        <SafeAreaView style={[st.root, { backgroundColor: theme.bg }]}>
          <AppHeader variant="detail" onBack={() => setPhase('hub')} subtitle="Sticker studio" />
          <View style={st.center}>
            <Text style={[st.muted, { color: theme.textSub }]}>Camera access is needed to snap cutouts.</Text>
            <TouchableOpacity style={st.primaryBtn} onPress={() => void requestCamPerm()}>
              <Text style={st.primaryBtnTxt}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={st.root}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <SafeAreaView style={st.camOverlay}>
          <TouchableOpacity style={st.camBack} onPress={() => setPhase('hub')}>
            <Text style={st.camBackTxt}>← Back</Text>
          </TouchableOpacity>
          <View style={st.scanFrame} pointerEvents="none" />
          <Text style={st.camHint}>
            Fill the box with one item — food, drink, person or object. Plain background = sharper cutout.
          </Text>
          <TouchableOpacity style={st.shutter} onPress={() => void captureAndCutout()}>
            <View style={st.shutterInner} />
          </TouchableOpacity>
          <TouchableOpacity style={st.camGallery} onPress={() => void pickFromGallery()}>
            <ImageIcon size={22} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ─── PROCESSING ───────────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <SafeAreaView style={[st.root, { backgroundColor: theme.bg }]}>
        <View style={st.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[st.processTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>
            Cutting out your subject…
          </Text>
          <Text style={[st.muted, { color: theme.textSub }]}>
            {processStage || 'AI traces food, drinks, people & objects — not the whole frame'}
          </Text>
          <View style={[st.progressTrack, { backgroundColor: theme.bg3 }]}>
            <View style={[st.progressFill, { width: `${Math.min(100, processPct)}%`, backgroundColor: theme.accent }]} />
          </View>
          <Text style={[st.progressPct, { color: theme.textMuted }]}>{processPct}%</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── FRAME PICKER ─────────────────────────────────────────────────────────
  if (phase === 'frame' && cutout) {
    return (
      <SafeAreaView style={[st.root, { backgroundColor: theme.bg }]}>
        <AppHeader variant="detail" onBack={() => setPhase('hub')} subtitle="Choose a frame" />
        <View style={st.frameBody}>
          <View ref={previewRef} collapsable={false} style={st.previewHub}>
            <FramedCutout
              uri={cutout.uri}
              frameId={frameId}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              showScanBox={frameId === 'dashed-gold'}
            />
          </View>
          <Text style={[st.methodTag, { color: theme.textMuted }]}>{cutoutMethod}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.frameRow}>
            {FRAME_OPTIONS.map(opt => {
              const selected = frameId === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => {
                    setFrameId(opt.id);
                    void Haptics.selectionAsync();
                  }}
                  style={[st.frameChip, selected && st.frameChipOn, { borderColor: selected ? '#FFD54F' : theme.border }]}
                >
                  <View style={[st.framePreview, { backgroundColor: opt.previewColor === 'transparent' ? theme.bg3 : opt.previewColor }]}>
                    <Sticker size={20} color={theme.isDark ? '#fff' : '#333'} strokeWidth={2} />
                  </View>
                  <Text style={[st.frameChipLbl, { color: selected ? theme.accent : theme.textSub }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity activeOpacity={0.9} onPress={() => void onMakeSticker()} disabled={saving}>
            <LinearGradient colors={['#FF0055', '#BF5AF2']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={st.makeBtn}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Wand2 size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={st.makeBtnTxt}>MAKE STICKER</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── COLLAGE ──────────────────────────────────────────────────────────────
  if (phase === 'collage' && bgUri) {
    return (
      <GestureHandlerRootView style={[st.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={st.flex} edges={['top']}>
          <AppHeader variant="detail" onBack={() => setPhase('hub')} subtitle="Collage" />
          <View style={st.collageToolbar}>
            <TouchableOpacity style={[st.toolChip, { borderColor: theme.border }]} onPress={() => void exportCollage()} disabled={exporting}>
              {exporting ? <ActivityIndicator size="small" color={theme.accent} /> : <Download size={16} color={theme.accent} />}
              <Text style={[st.toolChipTxt, { color: theme.text }]}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.toolChip, { borderColor: theme.border }]}
              onPress={() => setPlaced(prev => prev.filter(p => p.key !== selectedKey))}
              disabled={!selectedKey}
            >
              <Trash2 size={16} color={selectedKey ? '#FF0055' : theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={st.canvasWrap}>
            <View ref={collageRef} collapsable={false} style={[st.canvas, { width: CANVAS_W, height: CANVAS_H }]}>
              <ImageBackground source={{ uri: bgUri }} style={st.canvasBg} imageStyle={st.canvasBgImg}>
                {placed.map(p => (
                  <DraggableCutout
                    key={p.key}
                    item={p}
                    boundW={CANVAS_W}
                    boundH={CANVAS_H}
                    selected={selectedKey === p.key}
                    onSelect={() => setSelectedKey(p.key)}
                    onRemove={() => {
                      setPlaced(prev => prev.filter(x => x.key !== p.key));
                      if (selectedKey === p.key) setSelectedKey(null);
                    }}
                    onChange={(key, patch) => {
                      setPlaced(prev => prev.map(x => (x.key === key ? { ...x, ...patch } : x)));
                    }}
                  />
                ))}
              </ImageBackground>
            </View>
            <Text style={[st.canvasHint, { color: theme.textMuted }]}>Pinch · drag · rotate stickers · tap strip below to add more</Text>
          </View>

          <Text style={[st.stripLabel, { color: theme.textMuted }]}>YOUR STICKERS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.strip}>
            {library.map(s => (
              <TouchableOpacity key={s.id} onPress={() => addPlacedFromLibrary(s)} style={[st.stripItem, { borderColor: theme.border }]}>
                <Image source={{ uri: s.uri }} style={st.stripThumb} resizeMode="contain" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[st.stripAdd, { borderColor: theme.border }]} onPress={openNewCutout}>
              <Plus size={22} color={theme.accent} />
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // ─── HUB ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[st.root, { backgroundColor: theme.bg }]}>
      <AppHeader variant="detail" onBack={goBack} subtitle="Cutouts & collage" />
      <ScrollView contentContainerStyle={st.hubScroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1a0a2e', '#2d1b4e', '#0f172a']} style={st.hero}>
          <Sparkles size={28} color="#FFD54F" />
          <Text style={[st.heroTitle, { fontFamily: fonts.titleFont }]}>Sticker studio</Text>
          <Text style={st.heroSub}>Snap anything · AI finds the hero · cute frames · scrapbook collages</Text>
        </LinearGradient>

        <View style={st.hubActions}>
          <TouchableOpacity activeOpacity={0.9} onPress={openNewCutout} style={st.hubCardWrap}>
            <LinearGradient colors={['#2244e8', '#00E5FF']} style={st.hubCard}>
              <Camera size={26} color="#fff" strokeWidth={2.2} />
              <Text style={st.hubCardTitle}>New cutout</Text>
              <Text style={st.hubCardSub}>Camera or gallery</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => void startCollage()} style={st.hubCardWrap}>
            <LinearGradient colors={['#FF4500', '#FF0055']} style={st.hubCard}>
              <Layers size={26} color="#fff" strokeWidth={2.2} />
              <Text style={st.hubCardTitle}>Collage</Text>
              <Text style={st.hubCardSub}>Background + stickers</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={st.libHead}>
          <Scan size={16} color={theme.accent} />
          <Text style={[st.libTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>Your stickers</Text>
          <Text style={[st.libCount, { color: theme.textMuted }]}>{library.length}</Text>
        </View>

        {library.length === 0 ? (
          <Text style={[st.empty, { color: theme.textSub }]}>No stickers yet — create your first cutout above.</Text>
        ) : (
          <View style={st.grid}>
            {library.map(s => (
              <View key={s.id} style={[st.gridCell, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
                <Image source={{ uri: s.uri }} style={st.gridImg} resizeMode="contain" />
                <TouchableOpacity
                  style={st.gridDel}
                  onPress={() => {
                    Alert.alert('Delete sticker?', undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => void deleteSticker(s.id).then(refreshLibrary),
                      },
                    ]);
                  }}
                >
                  <Trash2 size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  muted: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  processTitle: { fontSize: 20, fontWeight: '800', marginTop: 16 },
  progressTrack: { width: '80%', height: 6, borderRadius: 3, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  primaryBtn: { marginTop: 16, backgroundColor: '#FF0055', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  primaryBtnTxt: { color: '#fff', fontWeight: '800' },
  hubScroll: { paddingBottom: 40 },
  hero: { margin: 16, borderRadius: 20, padding: 22, alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },
  hubActions: { flexDirection: 'row', paddingHorizontal: 12, gap: 10 },
  hubCardWrap: { flex: 1 },
  hubCard: { borderRadius: 18, padding: 18, minHeight: 120, justifyContent: 'flex-end', gap: 4 },
  hubCardTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  hubCardSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  libHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 22 },
  libTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  libCount: { fontSize: 12, fontWeight: '700' },
  empty: { paddingHorizontal: 20, marginTop: 12, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  gridCell: { width: (SCREEN_W - 44) / 2, height: (SCREEN_W - 44) / 2, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  gridImg: { width: '100%', height: '100%' },
  gridDel: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  frameBody: { flex: 1, alignItems: 'center', paddingBottom: 24 },
  previewHub: { marginTop: 8, padding: 16, alignItems: 'center', justifyContent: 'center' },
  methodTag: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  frameRow: { paddingHorizontal: 14, gap: 10, paddingBottom: 16 },
  frameChip: { alignItems: 'center', borderWidth: 2, borderRadius: 14, padding: 8, width: 72 },
  frameChipOn: { backgroundColor: 'rgba(255,213,79,0.12)' },
  framePreview: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  frameChipLbl: { fontSize: 9, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 },
  makeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 20, marginTop: 8, paddingVertical: 16, borderRadius: 16, width: SCREEN_W - 40 },
  makeBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  collageToolbar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  toolChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  toolChipTxt: { fontSize: 12, fontWeight: '800' },
  canvasWrap: { alignItems: 'center', paddingHorizontal: 14 },
  canvas: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  canvasBg: { flex: 1 },
  canvasBgImg: { resizeMode: 'cover' },
  canvasHint: { fontSize: 11, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },
  stripLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginLeft: 18, marginTop: 14, marginBottom: 8 },
  strip: { paddingHorizontal: 14, gap: 10, paddingBottom: 20 },
  stripItem: { width: 72, height: 72, borderRadius: 14, borderWidth: 1, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
  stripThumb: { width: '100%', height: '100%' },
  stripAdd: { width: 72, height: 72, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  camOverlay: { flex: 1, justifyContent: 'space-between', padding: 16 },
  camBack: { alignSelf: 'flex-start', padding: 8 },
  camBackTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  scanFrame: {
    alignSelf: 'center',
    width: SCREEN_W * 0.72,
    height: SCREEN_W * 0.72,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,213,79,0.9)',
    borderRadius: 12,
    marginTop: SCREEN_H * 0.08,
  },
  camHint: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 13, fontWeight: '600', paddingHorizontal: 24 },
  shutter: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  camGallery: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
