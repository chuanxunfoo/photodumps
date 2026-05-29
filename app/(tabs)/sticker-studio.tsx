/**
 * Sticker Studio — AI-style cutouts, cute frames, collage compositor (Pro).
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { cropPhotoAroundViewportPoint, normalizePhotoForCollage } from '../_lib/photoFile';
import {
  CutoutError,
  cutoutErrorMessage,
  cutoutFromPreparedFile,
  hasRemoveBgApiKey,
  prepareLiveScanPhoto,
  preparePhotoUri,
} from '../_lib/stickerStudio/cutoutEngine';
import type { CutoutPipeline } from '../_lib/stickerStudio/cutoutProgress';
import { isExpoGo, nativeCutoutBundled } from '../_lib/stickerStudio/runtime';
import { LiveStickerCamera } from '../components/sticker-studio/LiveStickerCamera';
import { StickerCollectionSheet } from '../components/sticker-studio/StickerCollectionSheet';
import { StickerPreviewModal } from '../components/sticker-studio/StickerPreviewModal';
import { StickerSaveCelebration } from '../components/sticker-studio/StickerSaveCelebration';
import { StickerStudioHub } from '../components/sticker-studio/StickerStudioHub';
import { WasmCutoutEngine, type WasmCutoutJob } from '../components/sticker-studio/WasmCutoutEngine';
import { loadCutouts, saveCutout } from '../_lib/stickerStudio/cutoutStorage';
import { restoreStickerLibraryIfNeeded } from '../_lib/stickerStudio/stickerBackup';
import type { SavedCutout } from '../_lib/stickerStudio/cutoutStorage';
import { deleteSticker, loadStickers, saveSticker } from '../_lib/stickerStudio/storage';
import type { CutoutResult, PlacedCutout, SavedSticker, TraceSettings } from '../_lib/stickerStudio/types';
import { DEFAULT_TRACE } from '../_lib/stickerStudio/types';
import { AppHeader } from '../components/AppHeader';
import { DraggableCutout } from '../components/sticker-studio/DraggableCutout';
import {
  Download,
  Image as ImageIcon,
  Plus,
  Trash2,
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
import { getExploreCopy } from '../_lib/localeContent';
import { getLocaleUi } from '../_lib/localeUi';
import {
  canCreateSticker,
  recordStickerCreated,
} from '../_lib/hobbyFeatureAccess';
import { resolveTypeface, useTheme } from './ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_W = SCREEN_W - 28;
const CANVAS_H = Math.round(Math.min(SCREEN_H * 0.52, CANVAS_W * 1.28));
type Phase = 'hub' | 'live' | 'camera' | 'processing' | 'frame' | 'collage-loading' | 'collage';

const yieldToUi = () =>
  new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export default function StickerStudioScreen() {
  const goBack = useExploreAwareBack();
  const { theme, language, isPro, isAdmin, openSubscription, user } = useTheme();
  const isPaid = isPro || isAdmin;

  const paywallStickerIfNeeded = async (): Promise<boolean> => {
    if (isPaid) return false;
    const uid = user?.uid;
    if (!uid) {
      openSubscription();
      return true;
    }
    if (await canCreateSticker(uid)) return false;
    openSubscription();
    return true;
  };
  const ex = getExploreCopy(language);
  const u = getLocaleUi(language);
  const fonts = resolveTypeface(theme);

  const [phase, setPhase] = useState<Phase>('hub');
  const [library, setLibrary] = useState<SavedSticker[]>([]);
  const [cutouts, setCutouts] = useState<SavedCutout[]>([]);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [cutout, setCutout] = useState<CutoutResult | null>(null);
  const [trace, setTrace] = useState<TraceSettings>(DEFAULT_TRACE);
  const [cutoutMethod, setCutoutMethod] = useState<string>('');
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedCutout[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [captureClean, setCaptureClean] = useState(false);
  const [processPct, setProcessPct] = useState(0);
  const [processStage, setProcessStage] = useState('');
  const [cutoutPipeline, setCutoutPipeline] = useState<CutoutPipeline>('prepare');
  const [wasmCutoutUri, setWasmCutoutUri] = useState<string | null>(null);
  const [wasmModelsReady, setWasmModelsReady] = useState(false);
  const [previewSticker, setPreviewSticker] = useState<SavedSticker | null>(null);
  const [showSaveCelebration, setShowSaveCelebration] = useState(false);
  const [absorbUri, setAbsorbUri] = useState<string | null>(null);
  const [showCollection, setShowCollection] = useState(false);
  const [liveStillUri, setLiveStillUri] = useState<string | null>(null);
  const [liveScanning, setLiveScanning] = useState(false);
  const [liveScanError, setLiveScanError] = useState<string | null>(null);

  const previewRef = useRef<View>(null);
  const liveScanLock = useRef(false);
  const liveScanGen = useRef(0);
  const cutoutRef = useRef<CutoutResult | null>(null);
  const wasmBusyRef = useRef(false);
  cutoutRef.current = cutout;
  const collageRef = useRef<View>(null);
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCamPerm] = useCameraPermissions();

  const refreshLibrary = useCallback(async () => {
    await restoreStickerLibraryIfNeeded();
    setLibrary(await loadStickers());
    setCutouts(await loadCutouts());
  }, []);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    if (phase === 'frame' || phase === 'collage') void refreshLibrary();
  }, [phase, refreshLibrary]);

  useEffect(() => {
    if (phase === 'frame' && cutout) setPhase('live');
  }, [phase, cutout]);

  const beginProcessing = useCallback((stage = 'Starting…') => {
    setPhase('processing');
    setCutout(null);
    setProcessPct(4);
    setProcessStage(stage);
    setCutoutPipeline('prepare');
    setWasmCutoutUri(null);
  }, []);

  const finishCutout = async (
    outUri: string,
    method: 'native' | 'removebg' | 'wasm',
    stayOnLive = false,
  ) => {
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(outUri, (w, h) => resolve({ width: w, height: h }), reject);
    });
    setCutout({ uri: outUri, width, height, method });
    setWasmCutoutUri(null);
    setLiveScanning(false);
    await saveCutout({ uri: outUri, width, height });
    await refreshLibrary();
    if (phase !== 'live') setPhase('live');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const startWasmCutout = (fileUri: string) => {
    setCutoutPipeline('wasm');
    setProcessPct(wasmModelsReady ? 16 : 8);
    setProcessStage(
      wasmModelsReady ? 'Tracing subject on device…' : 'Loading on-device AI (Wi‑Fi — first time only)',
    );
    setWasmCutoutUri(fileUri);
  };

  const wasmExpoGo = isExpoGo() && !nativeCutoutBundled();

  const wasmJob: WasmCutoutJob | null =
    wasmCutoutUri && (phase === 'processing' || phase === 'live')
      ? {
          uri: wasmCutoutUri,
          onProgress: (p, stage) => {
            setCutoutPipeline('wasm');
            if (phase === 'live') {
              setProcessStage(stage);
            } else {
              setProcessPct(p);
              setProcessStage(stage);
            }
          },
          onComplete: outUri => {
            wasmBusyRef.current = false;
            void finishCutout(outUri, 'wasm', phase === 'live');
            if (phase === 'live') setLiveScanError(null);
          },
          onError: msg => {
            wasmBusyRef.current = false;
            setWasmCutoutUri(null);
            setLiveScanning(false);
            if (phase === 'live') {
              setLiveScanError(msg || 'Cutout failed — tap the object on screen to retry.');
            } else {
              Alert.alert('Could not cut out subject', msg, [{ text: 'OK', style: 'cancel' }]);
              setPhase('hub');
            }
          },
        }
      : null;

  const wasmEngineEl = (
    <WasmCutoutEngine
      enabled={wasmExpoGo}
      onReady={() => setWasmModelsReady(true)}
      job={wasmJob}
    />
  );

  const runCutout = async (uri: string, stayOnLive = false): Promise<boolean> => {
    if (await paywallStickerIfNeeded()) return false;
    const onProg = (pct: number, stage: string) => {
      if (stayOnLive) setProcessStage(stage);
      else {
        setProcessPct(pct);
        setProcessStage(stage);
      }
    };

    let fileUri: string;
    try {
      if (!stayOnLive) setProcessPct(8);
      fileUri = stayOnLive ? await prepareLiveScanPhoto(uri) : await preparePhotoUri(uri);
      setSourceUri(fileUri);
    } catch {
      if (stayOnLive) {
        setLiveScanning(false);
        setLiveScanError('Could not read the photo. Try another image from your gallery.');
        return false;
      }
      Alert.alert(
        'Could not read photo',
        'Try picking the image from Gallery, or take another photo with good lighting.',
      );
      setPhase('hub');
      return false;
    }

    setCutoutPipeline(
      nativeCutoutBundled() ? 'native' : hasRemoveBgApiKey() ? 'cloud' : 'wasm',
    );

    try {
      const result = await cutoutFromPreparedFile(fileUri, onProg, {
        cloudSize: stayOnLive ? 'small' : 'auto',
        nativeMaxDimension: stayOnLive ? 1024 : 1024,
      });
      const method = result.method === 'imported' ? 'wasm' : result.method;
      await finishCutout(result.uri, method, stayOnLive);
      if (stayOnLive) setLiveScanError(null);
      return true;
    } catch (e) {
      if (e instanceof CutoutError && e.message === 'EXPO_GO_WASM') {
        wasmBusyRef.current = true;
        setWasmCutoutUri(fileUri);
        if (!stayOnLive) {
          startWasmCutout(fileUri);
        } else {
          setProcessStage('Loading on-device AI…');
        }
        return false;
      }
      if (stayOnLive) {
        setLiveScanning(false);
        setLiveScanError(
          e instanceof CutoutError ? cutoutErrorMessage(e) : 'Could not detect the object — tap to retry.',
        );
        return false;
      }
      Alert.alert('Could not cut out subject', cutoutErrorMessage(e), [{ text: 'OK', style: 'cancel' }]);
      setPhase('hub');
      setWasmCutoutUri(null);
      return false;
    }
  };

  const enterLive = useCallback(async (galleryUri?: string) => {
    setCutout(null);
    setAbsorbUri(null);
    setLiveScanError(null);
    setLiveStillUri(galleryUri ?? null);

    if (!galleryUri) {
      const perm = await requestCamPerm();
      if (!perm?.granted) {
        Alert.alert('Camera needed', 'Allow camera to scan objects for stickers.');
        return;
      }
    }

    if (galleryUri) {
      liveScanGen.current += 1;
      setLiveScanning(true);
      setProcessStage('');
    }
    setPhase('live');
  }, [requestCamPerm]);

  const pickFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted' && status !== 'limited') {
        Alert.alert('Permission needed', 'Allow photo library access to pick a sticker image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.55,
        allowsEditing: false,
        copyToCacheDirectory: true,
      });
      const uri = res.assets?.[0]?.uri;
      if (res.canceled || !uri) return;

      await enterLive(uri);
    } catch {
      Alert.alert('Could not open gallery', 'Try again or use the camera.');
      if (phase !== 'live') setPhase('hub');
    }
  }, [enterLive, phase]);

  const runLiveScan = useCallback(async (focus?: { x: number; y: number }) => {
    if (liveScanLock.current && !focus) return;
    if (liveScanLock.current && focus) liveScanGen.current += 1;
    const gen = ++liveScanGen.current;
    liveScanLock.current = true;
    setLiveScanning(true);
    setLiveScanError(null);
    setCutout(null);
    setWasmCutoutUri(null);
    wasmBusyRef.current = false;
    setProcessStage('');
    try {
      let uri: string | undefined;
      if (liveStillUri) {
        uri = liveStillUri;
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: focus ? 0.72 : 0.62,
          skipProcessing: true,
          shutterSound: false,
        });
        uri = photo?.uri;
      }
      if (!uri || gen !== liveScanGen.current) return;
      if (focus) {
        uri = await cropPhotoAroundViewportPoint(uri, focus, {
          width: SCREEN_W,
          height: SCREEN_H,
        }, 0.72);
      }
      if (gen !== liveScanGen.current) return;
      const ok = await runCutout(uri, true);
      if (gen === liveScanGen.current && !ok && !cutoutRef.current) {
        setLiveScanError(
          focus
            ? 'Still tricky — tap the object again or use better light.'
            : 'Tap the object on screen, or tap the refresh button to scan again.',
        );
      }
    } catch {
      if (gen === liveScanGen.current) {
        setLiveScanning(false);
        setLiveScanError('Scan failed — tap the object to try again.');
      }
    } finally {
      if (gen === liveScanGen.current) liveScanLock.current = false;
    }
  }, [liveStillUri]);

  useEffect(() => {
    if (phase !== 'live') return;
    const t0 = setTimeout(() => {
      if (!cutoutRef.current && !liveScanLock.current && !wasmBusyRef.current) {
        void runLiveScan();
      }
    }, liveStillUri ? 60 : 160);
    return () => clearTimeout(t0);
  }, [phase, liveStillUri, runLiveScan]);

  /** Pre-made transparent PNG only — camera/gallery always run AI cutout. */
  const importCutoutPng = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    await enterLive(res.assets[0].uri);
  };

  const captureAndCutout = async () => {
    if (!cameraRef.current) return;
    beginProcessing('Saving photo…');
    await yieldToUi();
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.78, skipProcessing: false });
    if (photo?.uri) await runCutout(photo.uri);
    else setPhase('camera');
  };

  const onSaveSticker = async () => {
    if (!cutout || !previewRef.current) return;
    if (await paywallStickerIfNeeded()) return;
    setSaving(true);
    try {
      const uri = await captureRef(previewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await saveSticker({ uri, trace, sourceUri: sourceUri ?? undefined });
      if (!isPaid && user?.uid) await recordStickerCreated(user.uid);
      await refreshLibrary();
      setAbsorbUri(uri);
      setTimeout(() => setAbsorbUri(null), 900);
      setCutout(null);
      setLiveScanError(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSaveCelebration(true);
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
      quality: 0.65,
      allowsEditing: false,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    setPhase('collage-loading');
    setProcessPct(8);
    setProcessStage('Preparing background…');
    await yieldToUi();
    try {
      const bg = await normalizePhotoForCollage(res.assets[0].uri);
      setBgUri(bg);
      setPlaced([]);
      setSelectedKey(null);
      await refreshLibrary();
      setPhase('collage');
    } catch {
      Alert.alert('Could not open photo', 'Try another image from your gallery.');
      setPhase('hub');
    }
  };

  const addPlacedFromLibrary = (s: SavedSticker) => {
    const key = `p_${Date.now()}`;
    setPlaced(prev => [
      ...prev,
      {
        key,
        stickerId: s.id,
        uri: s.uri,
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
    setCaptureClean(true);
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to save your collage.');
        setCaptureClean(false);
        setExporting(false);
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
      setCaptureClean(false);
      setExporting(false);
    }
  };

  const openNewCutout = () => {
    void enterLive();
  };

  const exitLive = () => {
    liveScanGen.current += 1;
    setLiveStillUri(null);
    setCutout(null);
    setWasmCutoutUri(null);
    setLiveScanning(false);
    setLiveScanError(null);
    setPhase('hub');
  };

  let screen: React.ReactNode;

  // ─── LIVE STICKER (style → scan → auto cutout) ───────────────────────────
  if (phase === 'live') {
    screen = (
      <LiveStickerCamera
        cameraRef={cameraRef}
        stillUri={liveStillUri}
        showCamera={Boolean(camPerm?.granted)}
        trace={trace}
        onTraceChange={setTrace}
        cutout={cutout}
        previewRef={previewRef}
        scanning={liveScanning}
        scanError={liveScanError}
        saving={saving}
        theme={theme}
        stickerCount={library.length}
        onBack={exitLive}
        onGallery={() => void pickFromGallery()}
        onScan={() => void runLiveScan()}
        onTapFocus={point => void runLiveScan(point)}
        onOpenCollection={() => setShowCollection(true)}
        onSaveSticker={() => void onSaveSticker()}
        absorbUri={absorbUri}
      />
    );
  } else if (phase === 'camera') {
    if (!camPerm?.granted) {
      screen = (
        <SafeAreaView style={[st.root, { backgroundColor: theme.bg }]}>
          <AppHeader variant="detail" onBack={() => setPhase('hub')} subtitle={ex.stickerStudio} />
          <View style={st.center}>
            <Text style={[st.muted, { color: theme.textSub }]}>Camera access is needed to snap cutouts.</Text>
            <TouchableOpacity style={st.primaryBtn} onPress={() => void requestCamPerm()}>
              <Text style={st.primaryBtnTxt}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    } else {
    screen = (
      <View style={st.root}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <SafeAreaView style={st.camOverlay} edges={['top', 'bottom']}>
          <TouchableOpacity style={st.camBack} onPress={() => setPhase('hub')}>
            <Text style={st.camBackTxt}>← Back</Text>
          </TouchableOpacity>
          <View style={st.camCenter}>
            <View style={st.scanFrame} pointerEvents="none" />
            <Text style={st.camHint}>One cute subject in the frame ✨</Text>
          </View>
          <View style={st.camBottom}>
            <TouchableOpacity style={st.camGallery} onPress={() => void pickFromGallery()}>
              <ImageIcon size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={st.shutter} onPress={() => void captureAndCutout()}>
              <LinearGradient colors={['#FF6B9D', '#BF5AF2']} style={st.shutterGrad}>
                <View style={st.shutterInner} />
              </LinearGradient>
            </TouchableOpacity>
            <View style={st.camGallery} />
          </View>
        </SafeAreaView>
      </View>
    );
    }
  } else if (phase === 'processing' || phase === 'collage-loading') {
  // ─── PROCESSING / COLLAGE LOADING ─────────────────────────────────────────
    screen = (
      <View style={[st.root, { backgroundColor: '#0d0d14' }]}>
        <SafeAreaView style={st.flex} edges={['top', 'bottom']}>
          <View style={st.minLoadWrap}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        </SafeAreaView>
      </View>
    );
  } else if (phase === 'collage' && bgUri) {
  // ─── COLLAGE ──────────────────────────────────────────────────────────────
    screen = (
      <GestureHandlerRootView style={[st.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={st.flex} edges={['top']}>
          <AppHeader variant="detail" onBack={() => setPhase('hub')} subtitle={u.collageSubtitle} />
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
                    hideChrome={captureClean}
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
              <TouchableOpacity
                key={s.id}
                onPress={() => addPlacedFromLibrary(s)}
                onLongPress={() => setPreviewSticker(s)}
                style={[st.stripItem, { borderColor: theme.border }]}
              >
                <View style={st.thumbChecker} />
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
  } else {
    screen = (
      <StickerStudioHub
        library={library}
        titleFont={fonts.titleFont}
        headerSubtitle={ex.stickerStudio}
        theme={theme}
        onBack={goBack}
        onNew={openNewCutout}
        onGallery={() => void pickFromGallery()}
        onCollage={() => void startCollage()}
        onStickerPress={setPreviewSticker}
      />
    );
  }

  return (
    <>
      {wasmEngineEl}
      {screen}
      <StickerSaveCelebration
        visible={showSaveCelebration}
        onDone={() => {
          setShowSaveCelebration(false);
          exitLive();
        }}
        onAnother={() => {
          setShowSaveCelebration(false);
          openNewCutout();
        }}
      />
      <StickerCollectionSheet
        visible={showCollection}
        library={library}
        theme={theme}
        onClose={() => setShowCollection(false)}
        onStickerPress={s => {
          setShowCollection(false);
          setPreviewSticker(s);
        }}
      />
      <StickerPreviewModal
        visible={previewSticker != null}
        sticker={previewSticker}
        onClose={() => setPreviewSticker(null)}
        titleFont={fonts.titleFont}
        onDelete={id => void deleteSticker(id).then(refreshLibrary)}
        onUseInCollage={s => {
          setPreviewSticker(null);
          if (phase === 'collage' && bgUri) addPlacedFromLibrary(s);
          else void startCollage();
        }}
      />
    </>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  muted: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  processWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 32 },
  processCard: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  processIconRing: {
    padding: 3,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
  },
  processIconGrad: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processTitleLg: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 0.3 },
  processStage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    paddingHorizontal: 8,
    fontWeight: '600',
  },
  processPctBig: { fontSize: 36, fontWeight: '900', color: '#FFD54F', marginTop: 22, letterSpacing: -1 },
  progressTrackLg: { width: '100%', height: 10, borderRadius: 5, marginTop: 14, overflow: 'hidden' },
  progressFillLg: { height: '100%', borderRadius: 5 },
  processSpinner: { marginTop: 20 },
  primaryBtn: { marginTop: 16, backgroundColor: '#FF0055', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  primaryBtnTxt: { color: '#fff', fontWeight: '800' },
  hubScroll: { paddingBottom: 48 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeTxt: { color: '#FFD54F', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 0.6, textAlign: 'center' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },
  heroWarmup: { fontSize: 11, color: '#00E5FF', fontWeight: '700', textAlign: 'center', marginTop: 4 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroPillTxt: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700' },
  hubSectionLbl: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginLeft: 20,
    marginTop: 22,
    marginBottom: 10,
  },
  hubActions: { flexDirection: 'row', paddingHorizontal: 14, gap: 12 },
  hubCardWrap: { flex: 1 },
  hubCard: {
    borderRadius: 20,
    padding: 18,
    minHeight: 132,
    justifyContent: 'flex-end',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  hubCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hubCardTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  hubCardSub: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '600', lineHeight: 15 },
  libHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginTop: 26 },
  libIconGrad: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  libTitle: { fontSize: 18, fontWeight: '900', flex: 1 },
  libCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  libCount: { fontSize: 13, fontWeight: '900' },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  empty: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  minLoadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  minLoadTitle: { fontSize: 17, fontWeight: '800' },
  minLoadStage: { fontSize: 13, textAlign: 'center' },
  thumbChecker: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#252530',
    opacity: 0.85,
  },
  gridCell: {
    width: (SCREEN_W - 44) / 2,
    height: (SCREEN_W - 44) / 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#1e1e26',
  },
  gridImg: { width: '100%', height: '100%' },
  gridDel: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  frameScroll: { paddingHorizontal: 20, paddingBottom: 24 },
  cutoutSection: { width: '100%', marginTop: 8, gap: 10, paddingHorizontal: 4 },
  cutoutEmpty: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  cutoutStrip: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  cutoutThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutoutThumb: { width: '92%', height: '92%' },
  cutoutDel: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,0,85,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameFooter: { borderTopWidth: 1, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 20 },
  previewHub: { marginTop: 4, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  methodHint: { fontSize: 10, textAlign: 'center', paddingHorizontal: 24, marginBottom: 12, lineHeight: 14 },
  makeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, width: '100%' },
  makeBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
  camOverlay: { flex: 1, padding: 16 },
  camCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  camBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingBottom: 8 },
  camBack: { alignSelf: 'flex-start', padding: 8 },
  camBackTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  scanFrame: {
    width: SCREEN_W * 0.72,
    height: SCREEN_W * 0.72,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,182,220,0.95)',
    borderRadius: 24,
  },
  camHint: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontSize: 14, fontWeight: '700', paddingHorizontal: 24 },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  shutterGrad: {
    flex: 1,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  camGallery: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
