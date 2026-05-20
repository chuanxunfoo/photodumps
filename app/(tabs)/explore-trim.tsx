import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronDown, Pause, Play, Sparkles, Upload,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MinimalBackButton } from '../components/MinimalBackButton';
import { useExploreAwareBack } from '../_lib/exploreBack';
import {
  compressVideoFile,
  deleteVideoProcessingFile,
  isVideoProcessingAvailable,
  trimVideoFile,
} from '../_lib/videoProcessingGate';
import { resolveTypeface, useTheme } from './ThemeContext';

const { width: W } = Dimensions.get('window');
const TRACK_H = 64;
const HANDLE_W = 18;
const HANDLE_HIT_SLOP = HANDLE_W + 14;
const PLAYHEAD_HIT_SLOP = 22;
const MIN_CLIP_MS = 400;
const RULER_TICKS = 5;

function alertNativeVideoProcessingUnavailable() {
  Alert.alert(
    'Video processing unavailable',
    'Trimming, exporting, and compressing all use the native VideoProcessing module (expo-video-processing). Expo Go does not ship that module. Use a development build or a production build of this app — for example: npx expo run:ios or npx expo run:android.',
  );
}

const NATIVE_VIDEO_EXPORT_FALLBACK =
  'Could not export. Trimming and exporting need the native VideoProcessing module (expo-video-processing). Use a development or production build of this app — not Expo Go.';
const NATIVE_VIDEO_COMPRESS_FALLBACK =
  'Could not compress. Compression uses the same native module (expo-video-processing). Use a development or production build — not Expo Go.';

type QualityId = 'smart' | '144' | '360' | '720' | '1080' | '4k';

function stripFileScheme(uri: string) {
  if (uri.startsWith('file://')) return uri.slice('file://'.length);
  return uri;
}

function qualityToCompression(quality: QualityId, durationSec: number) {
  const long = durationSec > 120;
  const h =
    quality === '144' ? 144
    : quality === '360' ? 360
    : quality === '720' ? 720
    : quality === '1080' ? 1080
    : quality === '4k' ? 2160
    : 720;
  const bitrate =
    quality === '144' ? '400k'
    : quality === '360' ? '900k'
    : quality === '720' ? (long ? '1.4M' : '2M')
    : quality === '1080' ? (long ? '2.5M' : '4M')
    : quality === '4k' ? '8M'
    : (long ? '1.4M' : '2M');
  const crf =
    quality === '144' ? 30
    : quality === '360' ? 27
    : quality === 'smart' || quality === '720' ? 23
    : quality === '1080' ? 21
    : 20;
  return { resolution: { height: h }, bitrate, crf, audioBitrate: quality === '144' ? '64k' : '128k' as const };
}

function fmtTc(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Prefer a device-local file URI (helps iCloud-only assets after download). */
async function resolvePickedVideoUri(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const fallback = asset.uri ?? '';
  const assetId = asset.assetId;
  if (!assetId) return fallback;
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted' && status !== 'limited') return fallback;
    const info = await MediaLibrary.getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: true });
    if (info.localUri) return info.localUri;
    if (info.uri) return info.uri;
  } catch {
    /* use picker URI */
  }
  return fallback;
}

const Q_LABELS: Record<QualityId, string> = {
  smart: 'Smart',
  '144': '144p',
  '360': '360p',
  '720': '720p',
  '1080': '1080p',
  '4k': '4K',
};

export default function ExploreTrimScreen() {
  const goBack = useExploreAwareBack();
  const { theme } = useTheme();
  const fonts = resolveTypeface(theme);
  const videoRef = useRef<Video>(null);

  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [fsPath, setFsPath] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(1);
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(1);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [quality, setQuality] = useState<QualityId>('smart');
  const [busy, setBusy] = useState(false);
  const [trackW, setTrackW] = useState(Math.max(200, W - 32));
  const [qualityOpen, setQualityOpen] = useState(false);

  const durationRef = useRef(1);
  const startRef = useRef(0);
  const endRef = useRef(1);
  const trackRef = useRef(trackW);
  const playheadRaf = useRef<number | null>(null);
  const flushRaf = useRef<number | null>(null);
  const activeTrim = useRef<'left' | 'right' | 'playhead' | null>(null);
  const trimSeekRaf = useRef<number | null>(null);
  /** Synced whenever playhead time changes (state + schedule) for hit-testing in PanResponder. */
  const playheadSyncRef = useRef(0);
  const isScrubbingRef = useRef(false);
  const durationFromPlayerRef = useRef(false);

  useEffect(() => { durationRef.current = durationMs; }, [durationMs]);
  useEffect(() => { startRef.current = startMs; }, [startMs]);
  useEffect(() => { endRef.current = endMs; }, [endMs]);
  useEffect(() => { trackRef.current = trackW; }, [trackW]);
  useEffect(() => { playheadSyncRef.current = playheadMs; }, [playheadMs]);

  useEffect(() => {
    durationFromPlayerRef.current = false;
  }, [pickedUri, fsPath]);

  const scheduleFlushTrim = () => {
    if (flushRaf.current != null) return;
    flushRaf.current = requestAnimationFrame(() => {
      flushRaf.current = null;
      setStartMs(startRef.current);
      setEndMs(endRef.current);
    });
  };

  const flushTrimNow = () => {
    if (flushRaf.current != null) {
      cancelAnimationFrame(flushRaf.current);
      flushRaf.current = null;
    }
    setStartMs(startRef.current);
    setEndMs(endRef.current);
  };

  const schedulePlayhead = (ms: number) => {
    playheadSyncRef.current = ms;
    if (playheadRaf.current != null) return;
    playheadRaf.current = requestAnimationFrame(() => {
      playheadRaf.current = null;
      setPlayheadMs(playheadSyncRef.current);
    });
  };

  const applyDurationFromMillis = useCallback((durationMillis: number) => {
    if (!Number.isFinite(durationMillis) || durationMillis < MIN_CLIP_MS) return;
    const d = Math.round(durationMillis);
    durationFromPlayerRef.current = true;
    durationRef.current = d;
    startRef.current = 0;
    endRef.current = d;
    playheadSyncRef.current = Math.min(playheadSyncRef.current, d);
    setDurationMs(d);
    setStartMs(0);
    setEndMs(d);
    setPlayheadMs((ph) => Math.min(ph, d));
  }, []);

  const pickVideo = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Import and trim run in the iOS or Android app.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const ok = perm.status === 'granted' || perm.status === 'limited';
      if (!ok) {
        Alert.alert('Permission needed', 'Allow photo library access to pick a video.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 1,
        videoMaxDuration: 0,
        ...(Platform.OS === 'android' ? { defaultTab: 'videos' as const } : {}),
        ...(Platform.OS === 'ios'
          ? { preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic }
          : {}),
      });

      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const u = await resolvePickedVideoUri(a);
      if (!u) {
        Alert.alert('Import failed', 'No file URI was returned for this video.');
        return;
      }

      setPickedUri(u);

      const base = FileSystem.cacheDirectory;
      const dest = base ? `${base}trim_source_${Date.now()}.mp4` : null;

      let outPath: string | null = null;
      if (u.startsWith('file://') && dest) {
        try {
          await FileSystem.copyAsync({ from: u, to: dest });
          outPath = dest;
        } catch {
          outPath = u;
        }
      } else if (u.startsWith('file://')) {
        outPath = u;
      } else if (dest) {
        try {
          await FileSystem.copyAsync({ from: u, to: dest });
          outPath = dest;
        } catch (e: any) {
          const msg = typeof e?.message === 'string' ? e.message : 'Could not copy video to app storage.';
          const icloud =
            /3164/i.test(msg) ||
            /networkAccessRequired/i.test(msg) ||
            /PHPhotosErrorDomain/i.test(msg);
          Alert.alert(
            'Import copy failed',
            icloud
              ? 'This video is not fully downloaded from iCloud. Open it in Photos and wait for the download to finish, then try again (Wi‑Fi helps).'
              : `${msg}\n\nPreview may still work; export needs a file the device can read.`,
          );
          outPath = u;
        }
      } else {
        outPath = u;
      }

      setFsPath(outPath);

      // Picker reports seconds; timeline is corrected from the player once `durationMillis` is known.
      const raw = typeof a.duration === 'number' && a.duration > 0 ? a.duration : 0;
      const guessMs = raw > 0 ? Math.max(MIN_CLIP_MS, Math.round(raw * 1000)) : 60_000;
      durationFromPlayerRef.current = false;
      durationRef.current = guessMs;
      startRef.current = 0;
      endRef.current = guessMs;
      playheadSyncRef.current = 0;
      setDurationMs(guessMs);
      setStartMs(0);
      setEndMs(guessMs);
      setPlayheadMs(0);
      setPlaying(true);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : String(e);
      const icloud =
        /3164/i.test(msg) ||
        /networkAccessRequired/i.test(msg) ||
        /PHPhotosErrorDomain/i.test(msg);
      Alert.alert(
        'Could not import video',
        icloud
          ? 'This clip is only in iCloud right now. Open the video in Photos and wait until it finishes downloading, then try again. On cellular, allow Photos to use network data in Settings → Photos.'
          : (msg || 'Unknown error while opening the library.'),
      );
    }
  }, []);

  const loopPlayback = useCallback(
    async (status: import('expo-av').AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      const dur = status.durationMillis;
      if (!durationFromPlayerRef.current && dur != null && dur >= MIN_CLIP_MS) {
        applyDurationFromMillis(dur);
      }
      if (isScrubbingRef.current) return;
      const pos = status.positionMillis ?? 0;
      schedulePlayhead(pos);
      if (pos >= endRef.current - 50) {
        try {
          await videoRef.current?.setPositionAsync(startRef.current);
          await videoRef.current?.playAsync();
        } catch { /* ignore */ }
      }
    },
    [applyDurationFromMillis],
  );

  const trimPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const tw = Math.max(1, trackRef.current);
        const d = Math.max(1, durationRef.current);
        const st = startRef.current;
        const en = endRef.current;
        const lx = (st / d) * tw;
        const rx = (en / d) * tw;
        const phx = (playheadSyncRef.current / d) * tw;
        const distL = Math.abs(x - lx);
        const distR = Math.abs(x - rx);
        const distPh = Math.abs(x - phx);
        if (distL <= HANDLE_HIT_SLOP || distR <= HANDLE_HIT_SLOP) {
          activeTrim.current = distL <= distR ? 'left' : 'right';
        } else if (distPh <= PLAYHEAD_HIT_SLOP) {
          activeTrim.current = 'playhead';
        } else {
          activeTrim.current = distL <= distR ? 'left' : 'right';
        }
        if (activeTrim.current === 'playhead') {
          isScrubbingRef.current = true;
          void videoRef.current?.pauseAsync().catch(() => { /* ignore */ });
          setPlaying(false);
        }
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const tw = Math.max(1, trackRef.current);
        const d = Math.max(1, durationRef.current);
        const ms = Math.max(0, Math.min(d, (x / tw) * d));
        const side = activeTrim.current;
        if (side === 'playhead') {
          playheadSyncRef.current = ms;
          schedulePlayhead(ms);
          if (trimSeekRaf.current != null) cancelAnimationFrame(trimSeekRaf.current);
          trimSeekRaf.current = requestAnimationFrame(() => {
            trimSeekRaf.current = null;
            void videoRef.current?.setPositionAsync(playheadSyncRef.current).catch(() => { /* ignore */ });
          });
          return;
        }
        if (side === 'left') {
          const en = endRef.current;
          startRef.current = Math.max(0, Math.min(ms, en - MIN_CLIP_MS));
        } else if (side === 'right') {
          const st = startRef.current;
          endRef.current = Math.min(d, Math.max(ms, st + MIN_CLIP_MS));
        }
        if (side === 'left' || side === 'right') {
          const seekMs = side === 'left' ? startRef.current : endRef.current;
          schedulePlayhead(seekMs);
          if (trimSeekRaf.current != null) cancelAnimationFrame(trimSeekRaf.current);
          trimSeekRaf.current = requestAnimationFrame(() => {
            trimSeekRaf.current = null;
            const t = activeTrim.current === 'left' ? startRef.current
              : activeTrim.current === 'right' ? endRef.current
              : null;
            if (t != null) {
              void videoRef.current?.setPositionAsync(t).catch(() => { /* ignore */ });
            }
          });
        }
        scheduleFlushTrim();
      },
      onPanResponderRelease: () => {
        if (trimSeekRaf.current != null) {
          cancelAnimationFrame(trimSeekRaf.current);
          trimSeekRaf.current = null;
        }
        const side = activeTrim.current;
        flushTrimNow();
        if (side === 'playhead') {
          const t = playheadSyncRef.current;
          schedulePlayhead(t);
          void videoRef.current?.setPositionAsync(t).catch(() => { /* ignore */ });
          isScrubbingRef.current = false;
          activeTrim.current = null;
          return;
        }
        if (side === 'left' || side === 'right') {
          const t = side === 'left' ? startRef.current : endRef.current;
          schedulePlayhead(t);
          void videoRef.current?.setPositionAsync(t).catch(() => { /* ignore */ });
        }
        activeTrim.current = null;
      },
      onPanResponderTerminate: () => {
        if (trimSeekRaf.current != null) {
          cancelAnimationFrame(trimSeekRaf.current);
          trimSeekRaf.current = null;
        }
        const side = activeTrim.current;
        flushTrimNow();
        if (side === 'playhead') {
          const t = playheadSyncRef.current;
          schedulePlayhead(t);
          void videoRef.current?.setPositionAsync(t).catch(() => { /* ignore */ });
          isScrubbingRef.current = false;
          activeTrim.current = null;
          return;
        }
        if (side === 'left' || side === 'right') {
          const t = side === 'left' ? startRef.current : endRef.current;
          schedulePlayhead(t);
          void videoRef.current?.setPositionAsync(t).catch(() => { /* ignore */ });
        }
        activeTrim.current = null;
      },
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackW(e.nativeEvent.layout.width);
  };

  const msToPx = (ms: number) => (ms / Math.max(1, durationMs)) * trackW;
  const clipLen = Math.max(0, endMs - startMs);

  const togglePlay = async () => {
    try {
      if (playing) {
        await videoRef.current?.pauseAsync();
        setPlaying(false);
      } else {
        await videoRef.current?.playAsync();
        setPlaying(true);
      }
    } catch { /* ignore */ }
  };

  const exportVideo = async () => {
    if (!fsPath && !pickedUri) {
      Alert.alert('Import a video', 'Tap “Import video” and choose a clip from your gallery.');
      return;
    }
    if (!isVideoProcessingAvailable()) {
      alertNativeVideoProcessingUnavailable();
      return;
    }
    const inputPath = fsPath || pickedUri;
    setBusy(true);
    try {
      const input = stripFileScheme(inputPath);
      const trimmed = await trimVideoFile(input, startMs, endMs);
      const comp = qualityToCompression(quality, durationMs / 1000);
      await compressVideoFile({
        inputPath: stripFileScheme(trimmed),
        ...comp,
        saveToPhoto: true,
        removeAfterSavedToPhoto: true,
      });
      await deleteVideoProcessingFile(stripFileScheme(trimmed));
      Alert.alert('Saved', 'Compressed clip saved to your gallery.');
    } catch (e: any) {
      Alert.alert(
        'Export failed',
        typeof e?.message === 'string' ? e.message : NATIVE_VIDEO_EXPORT_FALLBACK,
      );
    } finally {
      setBusy(false);
    }
  };

  const smartCompressFullLength = async () => {
    if (!fsPath && !pickedUri) {
      Alert.alert('Import a video', 'Pick a clip first.');
      return;
    }
    if (!isVideoProcessingAvailable()) {
      alertNativeVideoProcessingUnavailable();
      return;
    }
    const inputPath = fsPath || pickedUri;
    setBusy(true);
    try {
      const input = stripFileScheme(inputPath);
      const comp = qualityToCompression(quality, durationMs / 1000);
      await compressVideoFile({
        inputPath: input,
        ...comp,
        saveToPhoto: true,
        removeAfterSavedToPhoto: true,
      });
      Alert.alert('Saved', 'Smaller full-length copy saved to your gallery. Trim handles were not applied.');
    } catch (e: any) {
      Alert.alert(
        'Compress failed',
        typeof e?.message === 'string' ? e.message : NATIVE_VIDEO_COMPRESS_FALLBACK,
      );
    } finally {
      setBusy(false);
    }
  };

  const rulerLabels = useMemo(() => {
    const out: { t: string; x: number }[] = [];
    for (let i = 0; i <= RULER_TICKS; i++) {
      const frac = i / RULER_TICKS;
      out.push({ t: fmtTc(durationMs * frac), x: frac });
    }
    return out;
  }, [durationMs]);

  const qualities: QualityId[] = ['smart', '144', '360', '720', '1080', '4k'];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#121218', '#050508']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topBar}>
          <MinimalBackButton onPress={goBack} color="#fff" size={26} />
          <View style={styles.topBarCenter}>
            <Text style={[styles.topBarTitle, { fontFamily: fonts.titleFont }]} numberOfLines={1}>
              TRIM & COMPRESS
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.qualityPill} onPress={() => setQualityOpen(true)}>
              <Text style={styles.qualityPillTxt}>{Q_LABELS[quality]}</Text>
              <ChevronDown size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportTop, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => void exportVideo()}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text style={styles.exportTopTxt}>{busy ? '…' : 'Export'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.screenSub}>
          Drag the white line to scrub. Timeline length comes from the player once the file loads — picker times are often wrong.
        </Text>

        {!pickedUri ? (
          <TouchableOpacity style={styles.importHero} onPress={() => void pickVideo()} activeOpacity={0.9}>
            <LinearGradient colors={['#2a2a32', '#1a1a20']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Upload size={40} color="#fff" />
            <Text style={styles.importTitle}>IMPORT VIDEO</Text>
            <Text style={styles.importSub}>Tap here to pick from your gallery. Nothing is uploaded — all processing stays on-device.</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.previewShell}>
              <View style={styles.previewBorder}>
                <Video
                  ref={videoRef}
                  style={styles.video}
                  source={{ uri: (fsPath || pickedUri) ?? '' }}
                  resizeMode={ResizeMode.CONTAIN}
                  isMuted
                  shouldPlay={playing}
                  isLooping={false}
                  useNativeControls={false}
                  onPlaybackStatusUpdate={loopPlayback}
                  onLoad={async () => {
                    try {
                      const st = await videoRef.current?.getStatusAsync();
                      if (st?.isLoaded && st.durationMillis != null && st.durationMillis >= MIN_CLIP_MS && !durationFromPlayerRef.current) {
                        applyDurationFromMillis(st.durationMillis);
                      }
                      const start = startRef.current;
                      await videoRef.current?.setPositionAsync(start);
                      if (playing) await videoRef.current?.playAsync();
                    } catch { /* ignore */ }
                  }}
                />
              </View>
            </View>

            <View style={styles.transport}>
              <Text style={styles.transportTime}>
                {fmtTc(playheadMs)} / {fmtTc(durationMs)}
              </Text>
              <Pressable style={styles.playBtn} onPress={() => void togglePlay()}>
                {playing ? <Pause size={22} color="#111" /> : <Play size={22} color="#111" style={{ marginLeft: 3 }} />}
              </Pressable>
              <Text style={styles.clipLen}>{(clipLen / 1000).toFixed(1)}s clip</Text>
            </View>

            <TouchableOpacity style={styles.replaceBtn} onPress={() => void pickVideo()}>
              <Text style={styles.replaceTxt}>Replace video</Text>
            </TouchableOpacity>

            <View style={styles.timelineBlock}>
              <View style={styles.rulerRow}>
                {rulerLabels.map((r, i) => (
                  <Text key={i} style={[styles.rulerTick, { left: `${r.x * 100}%` }]}>{r.t}</Text>
                ))}
              </View>

              <View style={styles.trackOuter} onLayout={onTrackLayout} {...trimPan.panHandlers}>
                <View style={styles.trackFilm} pointerEvents="none">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <View key={i} style={[styles.filmCell, { opacity: 0.35 + (i % 3) * 0.08 }]} />
                  ))}
                </View>
                <View
                  pointerEvents="none"
                  style={[
                    styles.trimBox,
                    {
                      left: msToPx(startMs),
                      width: Math.max(8, msToPx(endMs) - msToPx(startMs)),
                    },
                  ]}
                />
                <View pointerEvents="none" style={[styles.handle, { left: msToPx(startMs) - HANDLE_W / 2 }]} />
                <View pointerEvents="none" style={[styles.handle, { left: msToPx(endMs) - HANDLE_W / 2 }]} />
                <View
                  pointerEvents="none"
                  style={[styles.playheadLine, { left: msToPx(playheadMs) }]}
                />
              </View>

              <View style={styles.timeDetail}>
                <Text style={styles.timeDetailTxt}>IN {fmtTc(startMs)}</Text>
                <Text style={styles.timeDetailTxt}>OUT {fmtTc(endMs)}</Text>
                <Text style={styles.timeDetailAccent}>Selected {(clipLen / 1000).toFixed(2)}s</Text>
              </View>

              <View style={styles.compressRow}>
                <TouchableOpacity
                  style={[styles.compressFullBtn, busy && { opacity: 0.55 }]}
                  disabled={busy}
                  onPress={() => void smartCompressFullLength()}
                  activeOpacity={0.85}
                >
                  <Sparkles size={16} color="#7dd3fc" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.compressFullTitle}>Smart compress (full video)</Text>
                    <Text style={styles.compressFullSub}>Skip trimming — same length, smaller file with your quality preset.</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={{ flex: 1 }} />

        <View style={styles.bottomDock}>
          <Text style={styles.smartHint}>
            <Sparkles size={12} color="#7dd3fc" /> Smart = 720p balance for storage. Pick a higher tier only when you need it.
          </Text>
          <Text style={styles.legal}>Trim, export & compress need a dev or release build — not Expo Go · {Platform.OS}</Text>
        </View>
      </SafeAreaView>

      <Modal visible={qualityOpen} transparent animationType="fade" onRequestClose={() => setQualityOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setQualityOpen(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Export quality</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {qualities.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.qRow, quality === q && styles.qRowOn]}
                  onPress={() => { setQuality(q); setQualityOpen(false); }}
                >
                  <Text style={[styles.qRowTxt, quality === q && styles.qRowTxtOn]}>{Q_LABELS[q]}</Text>
                  {q === 'smart' && <Text style={styles.qRowHint}>Recommended</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4, gap: 6 },
  topBarCenter: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 4 },
  topBarTitle: { color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: '900', letterSpacing: 2.2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  qualityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  qualityPillTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  exportTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#FF0055',
  },
  exportTopTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  screenSub: { color: 'rgba(255,255,255,0.45)', fontSize: 11, textAlign: 'center', marginTop: 6, paddingHorizontal: 28, fontWeight: '600' },
  importHero: {
    marginHorizontal: 20,
    marginTop: 20,
    minHeight: 220,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  importTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  importSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
  previewShell: { alignItems: 'center', marginTop: 12 },
  previewBorder: {
    width: Math.min(W - 32, 360),
    aspectRatio: 9 / 16,
    maxHeight: W * 0.52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3355',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { flex: 1 },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
    paddingHorizontal: 20,
  },
  transportTime: { color: '#fff', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  playBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  clipLen: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  replaceBtn: { alignSelf: 'center', marginTop: 10, paddingVertical: 8, paddingHorizontal: 16 },
  replaceTxt: { color: '#7dd3fc', fontSize: 13, fontWeight: '800' },
  timelineBlock: { marginTop: 16, paddingHorizontal: 16 },
  rulerRow: { height: 18, position: 'relative', marginBottom: 6 },
  rulerTick: {
    position: 'absolute',
    transform: [{ translateX: -16 }],
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  trackOuter: {
    height: TRACK_H + 8,
    borderRadius: 8,
    backgroundColor: '#1c1c22',
    overflow: 'hidden',
    position: 'relative',
  },
  trackFilm: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 2, padding: 4 },
  filmCell: { flex: 1, backgroundColor: '#444', borderRadius: 2 },
  trimBox: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_W,
    top: 6,
    height: TRACK_H - 4,
    borderRadius: 4,
    backgroundColor: '#fff',
    zIndex: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  playheadLine: {
    position: 'absolute',
    top: 2,
    width: 3,
    height: TRACK_H + 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 10,
    marginLeft: -1.5,
  },
  timeDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  timeDetailTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timeDetailAccent: { color: '#7dd3fc', fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
  compressRow: { marginTop: 16, paddingHorizontal: 0 },
  compressFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(125,211,252,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.25)',
  },
  compressFullTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  compressFullSub: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4, fontWeight: '600', lineHeight: 15 },
  bottomDock: { paddingHorizontal: 18, paddingBottom: 28, paddingTop: 8 },
  smartHint: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 10, textAlign: 'center', fontWeight: '600' },
  legal: { color: 'rgba(255,255,255,0.28)', fontSize: 10, textAlign: 'center', marginTop: 4 },
  modalSheet: {
    backgroundColor: '#1e1e24',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 36,
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  qRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  qRowOn: { backgroundColor: 'rgba(255,0,85,0.12)' },
  qRowTxt: { color: '#ddd', fontSize: 16, fontWeight: '800' },
  qRowTxtOn: { color: '#fff' },
  qRowHint: { color: '#7dd3fc', fontSize: 11, marginTop: 4, fontWeight: '700' },
});
