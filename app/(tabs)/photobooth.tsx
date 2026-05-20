/**
 * photobooth.tsx — photodumps Digi Cam (single photo)
 *
 * One-shot digital camera experience: body chrome, LCD preview, per-body “recipe” looks.
 * Saving rasterizes a flat LCD bitmap (filters + stickers only), trims edge bleed, then writes JPEG.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { MinimalBackButton } from '../components/MinimalBackButton';
import { DigicamDateStamp } from '../components/photobooth/DigicamDateStamp';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { saveDigiShot } from '../_lib/photobooth/storage';
import { useRouter } from 'expo-router';
import {
  Camera,
  Check,
  ChevronLeft,
  CircleDot,
  Cloud,
  Crown,
  Download,
  FlipHorizontal,
  Flame,
  Flower2,
  Gem,
  Heart,
  Hexagon,
  Image as ImageIcon,
  Moon,
  Music2,
  RotateCcw,
  Sparkles,
  Star,
  Sun,
  Timer,
  X,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Slider from '@react-native-community/slider';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  InteractionManager,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Main LCD preview — classic compact digicam 4:3 (integer px to avoid capture fringe). */
const LCD_W = Math.round(Math.min(SCREEN_W * 0.9, 368));
const LCD_H = Math.round(LCD_W * (3 / 4));

/** Crop a few pixels off snapshots to remove view-shot / JPEG edge bleed that can look like a white frame. */
async function trimSnapshotEdgeBleed(uri: string): Promise<string> {
  return new Promise(resolve => {
    Image.getSize(
      uri,
      async (width, height) => {
        const t = 3;
        if (width <= t * 2 + 16 || height <= t * 2 + 16) {
          resolve(uri);
          return;
        }
        try {
          const { uri: out } = await ImageManipulator.manipulateAsync(
            uri,
            [{ crop: { originX: t, originY: t, width: width - t * 2, height: height - t * 2 } }],
            { compress: 0.96, format: ImageManipulator.SaveFormat.JPEG },
          );
          resolve(out);
        } catch {
          resolve(uri);
        }
      },
      () => resolve(uri),
    );
  });
}

type Phase = 'camera' | 'preview';
type FilterId  = 'none' | 'dither' | 'vhs' | 'spotlight' | 'ripple' | 'bw' | 'warm';
type FrameColor = {
  id: string; label: string;
  bg: string; accent: string; textColor: string;
};

interface StickerDef {
  id: string;
  label: string;
  Icon: LucideIcon;
}

interface PlacedSticker {
  key:    string;
  def:    StickerDef;
  x:      number;
  y:      number;
  scale:  number;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const FILTERS: { id: FilterId; label: string; color: string }[] = [
  { id: 'none',      label: 'RAW',       color: '#555'    },
  { id: 'dither',    label: 'DITHER',    color: '#FF0055' },
  { id: 'vhs',       label: 'VHS',       color: '#BF5AF2' },
  { id: 'spotlight', label: 'GLOW',      color: '#FFD600' },
  { id: 'ripple',    label: 'RIPPLE',    color: '#00E5FF' },
  { id: 'bw',        label: 'B&W',       color: '#AAAAAA' },
  { id: 'warm',      label: 'WARM',      color: '#FF8C00' },
];

/** Single-photo bodies — each ships a tuned preview “recipe” (not OEM JPEG). */
type CameraRigId = 'sony' | 'canon' | 'pixel' | 'polaroid' | 'fuji' | 'nikon' | 'leica';

/** Digicam white-balance tint presets (preview). */
type WbPreset = 'auto' | 'daylight' | 'cloudy' | 'tungsten';

interface CapturedPhoto {
  uri: string;
  rigId?: CameraRigId;
  wbPreset?: WbPreset;
  evBias?: number;
  capturedAt: number;
}

const RIG_LCD_LINES: Record<CameraRigId, [string, string, string]> = {
  sony:    ['Creative Look: SH', 'DRO L3 · WB 5600K + M1', 'Cine / Portra 400'],
  canon:   ['Picture Style: Portrait', 'ALO High · WB Auto W + A2', 'Warm skin tones'],
  fuji:    ['Film Sim: Classic Neg', 'DR400 · Grain strong', 'Chrome / street'],
  nikon:   ['Picture Control: Flat', 'Act D-Lighting X-High', 'Rich journalism'],
  leica:   ['Monochrome HC', 'Highlight −1 · Shadow +1', 'EV −0.3 highlights'],
  pixel:   ['Night Sight', 'Cool WB · deep blacks', 'Neon noir'],
  polaroid: ['Instax / 600 sim', '+1 EV · soft sharp', 'Warm · grain max'],
};

const CAMERA_RIGS: {
  id: CameraRigId;
  brand: string;
  model: string;
  tagline: string;
  grad: [string, string];
  filter: FilterId;
}[] = [
  { id: 'sony', brand: 'SONY', model: 'α7 IV', tagline: 'Cine (Portra 400)', grad: ['#0c1929', '#94a3b8'], filter: 'none' },
  { id: 'canon', brand: 'Canon', model: 'EOS R6', tagline: 'Warm nostalgia', grad: ['#3f1d12', '#f97316'], filter: 'none' },
  { id: 'pixel', brand: 'Pixel', model: 'Night Sight', tagline: 'Neon noir', grad: ['#1e1b4b', '#22d3ee'], filter: 'none' },
  { id: 'polaroid', brand: 'Polaroid', model: '600', tagline: 'Instax warmth', grad: ['#e8e0d5', '#d97706'], filter: 'none' },
  { id: 'fuji', brand: 'FUJIFILM', model: 'X-T5', tagline: 'Classic Neg', grad: ['#14532d', '#a16207'], filter: 'none' },
  { id: 'nikon', brand: 'Nikon', model: 'Z9', tagline: 'Flat / punchy', grad: ['#0f172a', '#64748b'], filter: 'none' },
  { id: 'leica', brand: 'Leica', model: 'M11', tagline: 'Mono HC', grad: ['#0a0a0a', '#eab308'], filter: 'none' },
];

const RIG_FOCAL_MM: Record<CameraRigId, string> = {
  sony: '50mm',
  canon: '85mm',
  pixel: '26mm',
  polaroid: '75mm',
  fuji: '35mm',
  nikon: '70mm',
  leica: '28mm',
};

/** Parse focal length number from labels like "50mm" */
function baseMmFromRig(rig: CameraRigId): number {
  const raw = parseInt(RIG_FOCAL_MM[rig].replace(/\D/g, ''), 10);
  return Number.isFinite(raw) ? raw : 35;
}

/** Map pinch zoom (0–1) to a displayed focal length range per rig */
function mmFromZoom(rig: CameraRigId, zoom01: number): string {
  const base = baseMmFromRig(rig);
  const lo = Math.max(14, Math.round(base * 0.36));
  const hi = Math.round(base * 2.05);
  const v = Math.round(lo + zoom01 * (hi - lo));
  return `${v}mm`;
}

const FRAME_COLORS: FrameColor[] = [
  { id: 'obsidian', label: 'OBSIDIAN', bg: '#0A0A0F',   accent: '#FF0055', textColor: '#FF0055' },
  { id: 'pastel',   label: 'PASTEL',   bg: '#FFD6E8',   accent: '#FF69B4', textColor: '#C23B7A' },
  { id: 'mint',     label: 'NEON MINT',bg: '#0D2B1A',   accent: '#00FFA3', textColor: '#00FFA3' },
  { id: 'neon',     label: 'NEON',     bg: '#0D0030',   accent: '#BF5AF2', textColor: '#BF5AF2' },
  { id: 'cream',    label: 'CREAM',    bg: '#F5F0E8',   accent: '#C8A040', textColor: '#8B6914' },
  { id: 'cyber',    label: 'CYBER',    bg: '#001020',   accent: '#00E5FF', textColor: '#00E5FF' },
  { id: 'fire',     label: 'FIRE',     bg: '#1A0500',   accent: '#FF5500', textColor: '#FF8C00' },
  { id: 'sugar',    label: 'SUGAR',    bg: '#FFF0F5',   accent: '#FF2D78', textColor: '#FF2D78' },
];

const STICKERS: StickerDef[] = [
  { id: 's1',  label: 'Star', Icon: Star },
  { id: 's2',  label: 'Spark', Icon: Sparkles },
  { id: 's3',  label: 'Heart', Icon: Heart },
  { id: 's4',  label: 'Moon', Icon: Moon },
  { id: 's5',  label: 'Cloud', Icon: Cloud },
  { id: 's6',  label: 'Flame', Icon: Flame },
  { id: 's7',  label: 'Music', Icon: Music2 },
  { id: 's8',  label: 'Gem', Icon: Gem },
  { id: 's9',  label: 'Crown', Icon: Crown },
  { id: 's10', label: 'Flower', Icon: Flower2 },
  { id: 's11', label: 'Bolt', Icon: Zap },
  { id: 's12', label: 'Dot', Icon: CircleDot },
  { id: 's13', label: 'Hex', Icon: Hexagon },
];

// ─── FILTER OVERLAY COMPONENT ─────────────────────────────────────────────────

function FilterOverlay({ filter, w, h }: { filter: FilterId; w: number; h: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: false })
    ).start();
  }, []);

  if (filter === 'none' || filter === 'bw' || filter === 'warm') return null;

  if (filter === 'dither') {
    const CELLS = 18;
    const cellSize = w / CELLS;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: CELLS * CELLS }).map((_, i) => {
          const row = Math.floor(i / CELLS);
          const col = i % CELLS;
          return (row + col) % 2 === 0 ? (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: col * cellSize, top: row * cellSize,
                width: cellSize, height: cellSize,
                backgroundColor: 'rgba(255,0,85,0.16)',
              }}
            />
          ) : null;
        })}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,0,85,0.07)' }]} />
      </View>
    );
  }

  if (filter === 'vhs') {
    const lines = Math.floor(h / 4);
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: lines }).map((_, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * 4, height: 1, backgroundColor: 'rgba(0,0,0,0.22)' }} />
        ))}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,0,0,0.07)',  transform: [{ translateX: -5 }] }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,255,255,0.07)', transform: [{ translateX: 5  }] }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(180,0,255,0.05)' }]} />
        <Animated.View style={{
          position: 'absolute', left: 0, right: 0, height: 8,
          backgroundColor: 'rgba(255,255,255,0.13)',
          top: anim.interpolate({ inputRange: [0,1], outputRange: [-8, h + 8] }),
        }} />
        <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
          <Text style={{ color: '#BF5AF2', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>● REC</Text>
        </View>
      </View>
    );
  }

  /** “GLOW” rig look — soft edge darkening only (no yellow hotspot). */
  if (filter === 'spotlight') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={['rgba(0,0,0,0.38)', 'transparent', 'rgba(0,0,0,0.42)']}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  if (filter === 'ripple') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,229,255,0.07)' }]} />
        {[1,2,3,4,5].map(i => (
          <Animated.View key={i} style={{
            position: 'absolute',
            left:  w / 2 - (w * 0.09 * i), top: h / 2 - (h * 0.09 * i),
            width: w * 0.18 * i, height: h * 0.18 * i,
            borderRadius: w * 0.09 * i,
            borderWidth: 1.5,
            borderColor: `rgba(0,229,255,${0.3 - i * 0.04})`,
            opacity: anim.interpolate({
              inputRange: [0, i / 5, 1],
              outputRange: [0.7, 0.2, 0.7],
              extrapolate: 'clamp',
            }),
          }} />
        ))}
      </View>
    );
  }

  return null;
}

// ─── BW / WARM label overlays (applied at render, not pixel-level in RN) ─────

function ColorGradeOverlay({ filter, strength = 1 }: { filter: FilterId; strength?: number }) {
  if (filter === 'bw') {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0)' }]} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${0.34 * strength})`, mixBlendMode: 'saturation' as any }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(120,110,100,${0.2 * strength})` }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(40,28,55,${0.06 * strength})` }]} />
      </View>
    );
  }
  if (filter === 'warm') {
    return (
      <View style={[StyleSheet.absoluteFill]} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,120,40,${0.14 * strength})` }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,200,140,${0.1 * strength})` }]} />
      </View>
    );
  }
  return null;
}

/** Fixed grain speck pattern (cheap vs full noise texture). */
const GRAIN_COORDS: [number, number][] = Array.from({ length: 72 }, (_, i) => [
  ((i * 17) % 100) as number,
  ((i * 31 + i * i) % 100) as number,
]);

function GrainSpecks({ dense }: { dense: boolean }) {
  const n = dense ? 60 : 28;
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: dense ? 0.2 : 0.12 }]} pointerEvents="none">
      {GRAIN_COORDS.slice(0, n).map(([x, y], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: 1.2,
            height: 1.2,
            borderRadius: 1,
            backgroundColor: i % 3 === 0 ? '#fff' : '#000',
          }}
        />
      ))}
    </View>
  );
}

function WbTintOverlay({ preset }: { preset: WbPreset }) {
  if (preset === 'auto') return null;
  const map: Record<WbPreset, string> = {
    auto:       'transparent',
    daylight:   'rgba(255,248,220,0.1)',
    cloudy:     'rgba(210,230,255,0.11)',
    tungsten:   'rgba(255,190,120,0.13)',
  };
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: map[preset] }]} />;
}

/** Preview / export EV dimming (matches live camera stack). */
function EvCompensationOverlay({ evBias }: { evBias: number }) {
  if (Math.abs(evBias) <= 0.008) return null;
  const lighten = Math.min(0.5, 0.03 + Math.max(0, evBias) * 0.045);
  const darken = Math.min(0.88, 0.04 + Math.abs(Math.min(0, evBias)) * 0.058);
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: evBias > 0
            ? `rgba(255,255,255,${lighten})`
            : `rgba(0,0,0,${darken})`,
        },
      ]}
    />
  );
}

function wbPresetShort(p: WbPreset): string {
  if (p === 'auto') return 'AWB';
  if (p === 'daylight') return 'DAY';
  if (p === 'cloudy') return 'CLD';
  return 'TNG';
}

/** Green LCD-style recipe lines (compact digicam menu). */
function LcdRecipeHud({ rigId }: { rigId: CameraRigId }) {
  const lines = RIG_LCD_LINES[rigId];
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(0,22,8,0.72)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,255,120,0.25)',
        gap: 2,
      }}
    >
      {lines.map((line, i) => (
        <Text
          key={i}
          numberOfLines={1}
          style={{ color: '#7af0a8', fontSize: 7, fontWeight: '800', letterSpacing: 0.4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

/** Per-body “in-camera recipe” simulation (preview only). */
function RigLookOverlay({ rigId, w: _w, h: _h }: { rigId: CameraRigId; w: number; h: number }) {
  const z = StyleSheet.absoluteFillObject;
  switch (rigId) {
    case 'sony':
      return (
        <>
          <LinearGradient colors={['rgba(255,248,252,0.26)', 'rgba(255,255,255,0.06)', 'rgba(25,30,55,0.22)']} locations={[0, 0.45, 1]} style={z} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(255,0,140,0.045)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={z} pointerEvents="none" />
          <View style={[z, { backgroundColor: 'rgba(255,255,255,0.05)' }]} pointerEvents="none" />
          <GrainSpecks dense={false} />
        </>
      );
    case 'canon':
      return (
        <>
          <LinearGradient colors={['rgba(255,200,160,0.22)', 'rgba(255,150,90,0.12)', 'rgba(60,20,10,0.28)']} locations={[0, 0.5, 1]} style={z} pointerEvents="none" />
          <View style={[z, { backgroundColor: 'rgba(255,120,80,0.06)' }]} pointerEvents="none" />
          <GrainSpecks dense={false} />
        </>
      );
    case 'pixel':
      return (
        <>
          <LinearGradient colors={['rgba(0,50,90,0.2)', 'transparent', 'rgba(0,0,0,0.58)']} locations={[0, 0.35, 1]} style={z} pointerEvents="none" />
          <View style={[z, { backgroundColor: 'rgba(0,210,255,0.09)' }]} pointerEvents="none" />
          <View style={[z, { backgroundColor: 'rgba(20,0,60,0.12)' }]} pointerEvents="none" />
          <GrainSpecks dense={false} />
        </>
      );
    case 'polaroid':
      return (
        <>
          <LinearGradient colors={['rgba(255,252,240,0.38)', 'rgba(255,220,170,0.18)', 'rgba(100,50,20,0.18)']} style={z} pointerEvents="none" />
          <View style={[z, { backgroundColor: 'rgba(255,255,255,0.06)' }]} pointerEvents="none" />
          <GrainSpecks dense />
        </>
      );
    case 'fuji':
      return (
        <>
          <LinearGradient colors={['rgba(25,70,45,0.3)', 'rgba(160,120,50,0.14)', 'rgba(15,45,35,0.38)']} locations={[0, 0.48, 1]} style={z} pointerEvents="none" />
          <View style={[z, { backgroundColor: 'rgba(0,60,40,0.1)' }]} pointerEvents="none" />
          <GrainSpecks dense />
        </>
      );
    case 'nikon':
      return (
        <>
          <View style={[z, { backgroundColor: 'rgba(130,138,150,0.14)' }]} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.18)']} locations={[0, 1]} style={z} pointerEvents="none" />
          <View style={[z, { backgroundColor: 'rgba(200,220,255,0.06)' }]} pointerEvents="none" />
          <GrainSpecks dense={false} />
        </>
      );
    case 'leica':
      return (
        <>
          <View style={[z, { backgroundColor: 'rgba(0,0,0,0.12)', mixBlendMode: 'saturation' as any }]} pointerEvents="none" />
          <LinearGradient colors={['rgba(0,0,0,0.42)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.48)']} locations={[0, 0.5, 1]} style={z} pointerEvents="none" />
          <View style={[z, { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', margin: 10, borderRadius: 12 }]} pointerEvents="none" />
          <GrainSpecks dense={false} />
        </>
      );
    default:
      return null;
  }
}

/** Classic instant film border — used when Polaroid rig is selected */
function PolaroidFilmChrome({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ position: 'relative', backgroundColor: '#eceae4', paddingTop: 12, paddingHorizontal: 12, paddingBottom: 52, borderRadius: 7, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, style]}>
      <View style={{ borderRadius: 5, overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
        {children}
      </View>
      <Text style={{ position: 'absolute', bottom: 16, alignSelf: 'center', color: '#9a9590', fontSize: 9, fontWeight: '800', letterSpacing: 3 }}>POLAROID</Text>
    </View>
  );
}


// ─── EDIT CANVAS — placed sticker draggable item ──────────────────────────────

function DraggableSticker({
  sticker,
  onRemove,
  onMoveEnd,
  boundW,
  boundH,
}: {
  sticker: PlacedSticker;
  onRemove: () => void;
  onMoveEnd: (key: string, x: number, y: number, scale: number) => void;
  boundW: number;
  boundH: number;
}) {
  const tx = useSharedValue(sticker.x);
  const ty = useSharedValue(sticker.y);
  const sc = useSharedValue(sticker.scale);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startSc = useSharedValue(1);

  useEffect(() => {
    tx.value = sticker.x;
    ty.value = sticker.y;
    sc.value = sticker.scale;
  }, [sticker.key, sticker.x, sticker.y, sticker.scale, tx, ty, sc]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate(e => {
      const nx = Math.max(4, Math.min(Math.max(40, boundW) - 28, startX.value + e.translationX));
      const ny = Math.max(4, Math.min(Math.max(40, boundH) - 28, startY.value + e.translationY));
      tx.value = nx;
      ty.value = ny;
    })
    .onEnd(() => {
      runOnJS(onMoveEnd)(sticker.key, tx.value, ty.value, sc.value);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startSc.value = sc.value;
    })
    .onUpdate(e => {
      sc.value = Math.max(0.35, Math.min(2.4, startSc.value * e.scale));
    })
    .onEnd(() => {
      runOnJS(onMoveEnd)(sticker.key, tx.value, ty.value, sc.value);
    });

  const composed = Gesture.Simultaneous(pan, pinch);
  const Icon = sticker.def.Icon;

  const aStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Reanimated.View style={aStyle}>
        <Icon size={32} color="#FFF" strokeWidth={2.2} />
        <TouchableOpacity onPress={onRemove} style={ds.del} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}>
          <X size={10} color="#FFF" />
        </TouchableOpacity>
      </Reanimated.View>
    </GestureDetector>
  );
}
const ds = StyleSheet.create({
  del: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FF0055', justifyContent: 'center', alignItems: 'center' },
});

// ─── SAVE SCREEN ──────────────────────────────────────────────────────────────

function SaveScreen({
  photo, frame, stickers, exportRef, onRetake, onSave, saving, saved,
}: {
  photo:       CapturedPhoto | null;
  frame:       FrameColor;
  stickers:    PlacedSticker[];
  exportRef:   React.RefObject<View | null>;
  onRetake:    () => void;
  onSave:      () => void;
  saving:      boolean;
  saved:       boolean;
}) {
  const downloadScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!saving && !saved) {
      Animated.loop(Animated.sequence([
        Animated.timing(downloadScale, { toValue: 1.04, duration: 900,  useNativeDriver: true }),
        Animated.timing(downloadScale, { toValue: 1.0,  duration: 900,  useNativeDriver: true }),
      ])).start();
    } else {
      downloadScale.stopAnimation();
    }
  }, [saving, saved]);

  const pw = LCD_W;
  const ph = LCD_H;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#030303' }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={sv.title}>YOUR PHOTO</Text>
        <Text style={sv.sub}>Same orientation as capture · gallery = image only (filters + stickers)</Text>
      </View>

      <Text style={{ color: '#888', fontSize: 10, fontWeight: '700', textAlign: 'center', paddingHorizontal: 12, lineHeight: 15 }}>
        The colored frame you pick in Edit is only for this app — the file saved to your gallery is the image above (no mat / Polaroid border).
      </Text>

      <View
        ref={exportRef}
        collapsable={false}
        style={{
          width: pw,
          height: ph,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#000',
          alignSelf: 'center',
        }}
      >
        {photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            <FilterOverlay filter={photo.filter} w={pw} h={ph} />
            <ColorGradeOverlay filter={photo.filter} strength={1.08} />
            <RigLookOverlay rigId={photo.rigId ?? 'sony'} w={pw} h={ph} />
            <WbTintOverlay preset={photo.wbPreset ?? 'auto'} />
            <EvCompensationOverlay evBias={photo.evBias ?? 0} />
          </>
        ) : null}
        {stickers.map(s => {
          const Ic = s.def.Icon;
          const sz = Math.round(26 * s.scale);
          return (
            <View key={s.key} pointerEvents="none" style={{ position: 'absolute', left: s.x, top: s.y, zIndex: 30 }}>
              <Ic size={sz} color="#FFF" strokeWidth={2.2} />
            </View>
          );
        })}
      </View>

      {saved ? (
        <View style={sv.savedBadge}>
          <Check size={40} color="#00FFA3" strokeWidth={2.5} />
          <Text style={sv.savedText}>SAVED TO GALLERY</Text>
          <Text style={{ color: '#555', fontSize: 11, letterSpacing: 1 }}>Check your camera roll</Text>
        </View>
      ) : (
        <Animated.View style={{ transform: [{ scale: downloadScale }], width: '100%' }}>
          <TouchableOpacity onPress={onSave} disabled={saving} activeOpacity={0.88} style={{ width: '100%' }}>
            <LinearGradient
              colors={saving ? ['#222', '#111'] : ['#FF0055', '#FF5500']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={sv.saveBtn}
            >
              {saving ? (
                <ActivityIndicator color="#555" size="small" />
              ) : (
                <>
                  <Download size={20} color="#FFF" />
                  <Text style={sv.saveBtnText}>SAVE TO GALLERY</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity onPress={onRetake} style={sv.retakeBtn}>
        <RotateCcw size={16} color="#888" />
        <Text style={sv.retakeBtnText}>NEW SHOT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const sv = StyleSheet.create({
  title:           { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  sub:             { color: '#444', fontSize: 9, fontWeight: '700', letterSpacing: 3 },
  strip:           { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden', paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  stripHeader:     { alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, marginBottom: 2 },
  stripHeaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  photoCell:       { borderRadius: 8, overflow: 'hidden', position: 'relative' },
  stripFooter:     { borderTopWidth: 1, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  stripDate:       { fontSize: 8, fontWeight: '700', letterSpacing: 1, opacity: 0.7 },
  stripBrand:      { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  savedBadge:      { alignItems: 'center', gap: 8, paddingVertical: 20 },
  savedText:       { color: '#00FFA3', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  saveBtn:         { borderRadius: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  saveBtnText:     { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  retakeBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#2A2A2A' },
  retakeBtnText:   { color: '#666', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function PhotoBoothScreen() {
  const goBack = useExploreAwareBack();
  const router = useRouter();
  const { theme } = useTheme();

  // ── Permissions ──
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({ writeOnly: true });

  const cameraRef = useRef<CameraView>(null);
  const saveExportRef = useRef<View>(null);

  // ── Phase state ──
  const [phase, setPhase] = useState<Phase>('camera');

  // ── Camera state ──
  const [facing,       setFacing]       = useState<'front' | 'back'>('front');
  const [selectedRig,  setSelectedRig]  = useState<CameraRigId>('sony');
  const [activeFilter, setActiveFilter] = useState<FilterId>(CAMERA_RIGS[0].filter);

  const [timerSec, setTimerSec] = useState<0 | 3 | 10>(0);
  /** −12 … +2 EV-style compensation (preview overlay; baked into export). */
  const [evBias, setEvBias] = useState(0);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  /** Brief torch burst before capture when flash is ON (AE pre-warm); off during actual shutter so LED flash can fire. */
  const [torchBurst, setTorchBurst] = useState(false);
  /** Alias so any `torchOn` reference (stale bundle / merge) resolves to the burst torch flag. */
  const torchOn = torchBurst;
  /** Camera zoom 0–1 (pinch); drives CameraView + focal length readout */
  const [zoom, setZoom] = useState(0);
  const zoomRef = useRef(0);
  const pinchAnchorZoom = useRef(0);

  /** Single capture in memory */
  const [shot, setShot] = useState<CapturedPhoto | null>(null);
  const [countdown,      setCountdown]      = useState<number | null>(null);
  const [isCapturing,    setIsCapturing]    = useState(false);

  /** White balance tint (digicam-style). */
  const [wbPreset, setWbPreset] = useState<WbPreset>('auto');
  /** Fake ISO readout (tap to cycle). */
  const [isoIdx, setIsoIdx] = useState(1);

  // ── Edit state ──
  const [editFilter,   setEditFilter]   = useState<FilterId>('none');
  const [frameColor,   setFrameColor]   = useState<FrameColor>(FRAME_COLORS[0]);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [editPanelTab, setEditPanelTab] = useState<'filter' | 'frame' | 'sticker'>('filter');
  const [editPreviewBox, setEditPreviewBox] = useState({ w: LCD_W, h: LCD_H });

  // ── Save state ──
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // ── Animations ──
  const flashAnim     = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;

  // ─── Permission side-effects ───────────────────────────────────────────────
  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!mediaPermission?.granted)  requestMediaPermission();
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (phase === 'preview' && !shot) setPhase('camera');
  }, [phase, shot]);

  const applyRig = useCallback((id: CameraRigId) => {
    setSelectedRig(id);
    setZoom(0);
    const rig = CAMERA_RIGS.find(r => r.id === id);
    if (rig) {
      setActiveFilter(rig.filter);
    }
  }, []);

  const cycleWb = useCallback(() => {
    setWbPreset(prev => (prev === 'auto' ? 'daylight' : prev === 'daylight' ? 'cloudy' : prev === 'cloudy' ? 'tungsten' : 'auto'));
  }, []);

  const cycleIso = useCallback(() => {
    setIsoIdx(i => (i + 1) % 5);
  }, []);

  const cycleTimer = useCallback(() => {
    setTimerSec(prev => (prev === 0 ? 3 : prev === 3 ? 10 : 0));
  }, []);

  const cycleFlash = useCallback(() => {
    setFlashMode(prev => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
  }, []);

  const pickFromGallery = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Gallery import is not supported on web.');
      return;
    }
    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libPerm.granted) {
      Alert.alert('Photos', 'Allow access to import pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    const shotIn: CapturedPhoto = { uri, rigId: selectedRig, wbPreset, evBias, capturedAt: Date.now() };
    setShot(shotIn);
    setPhase('preview');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedRig, wbPreset, evBias]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          pinchAnchorZoom.current = zoomRef.current;
        })
        .onUpdate(e => {
          const next = Math.min(1, Math.max(0, pinchAnchorZoom.current + (e.scale - 1) * 0.45));
          runOnJS(setZoom)(next);
        }),
    [],
  );

  const vfGestures = pinchGesture;

  const handleStickerMoveEnd = useCallback((key: string, x: number, y: number, scale: number) => {
    setPlacedStickers(prev => prev.map(s => (s.key === key ? { ...s, x, y, scale } : s)));
  }, []);

  const addSticker = useCallback((def: StickerDef) => {
    const w = Math.max(80, editPreviewBox.w);
    const h = Math.max(100, editPreviewBox.h);
    const s: PlacedSticker = {
      key: `${def.id}-${Date.now()}`,
      def,
      x: 14 + Math.random() * Math.max(8, w - 50),
      y: 44 + Math.random() * Math.max(8, h - 100),
      scale: 1,
    };
    setPlacedStickers(prev => [...prev, s]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [editPreviewBox.w, editPreviewBox.h]);

  // ─── Flash ────────────────────────────────────────────────────────────────
  const triggerFlash = () => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 350, useNativeDriver: false }).start();
  };

  const captureAlignedPhoto = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam) return null;
    const isBack = facing === 'back';
    /** Torch pre-warms exposure in dark scenes; turn off before shutter so hardware flash can fire. */
    const torchPrewarm = isBack && flashMode === 'on';

    if (torchPrewarm) {
      setTorchBurst(true);
      await new Promise<void>(r => setTimeout(r, 480));
      setTorchBurst(false);
      await new Promise<void>(r => setTimeout(r, 140));
    }

    try {
      const photo = await cam.takePictureAsync({
        quality: 1,
        base64: false,
        skipProcessing: false,
      });
      if (!photo?.uri) return null;
      return photo.uri;
    } finally {
      setTorchBurst(false);
    }
  }, [facing, flashMode]);

  // ─── Timer helpers: armed delay + optional quick 3-2-1 when timer ≠ OFF.
  const runArmedDelaySec = async (sec: 0 | 3 | 10) => {
    if (sec <= 0) return;
    for (let remain = sec; remain > 0; remain--) {
      setCountdown(remain);
      countdownAnim.setValue(1.35);
      Animated.spring(countdownAnim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await new Promise<void>(r => setTimeout(r, 1000));
    }
    setCountdown(null);
  };

  const runQuick321Once = async () => {
    for (let step = 3; step >= 1; step--) {
      setCountdown(step);
      countdownAnim.setValue(1.35);
      Animated.spring(countdownAnim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await new Promise<void>(r => setTimeout(r, 620));
    }
    setCountdown(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise<void>(r => setTimeout(r, 280));
    setCountdown(null);
  };

  const handleSingleCapture = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    const delaySec = timerSec;
    const wbAtShutter = wbPreset;
    const evAtShutter = evBias;

    try {
      if (delaySec > 0) {
        await runArmedDelaySec(delaySec);
        await runQuick321Once();
      }

      triggerFlash();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const uri = await captureAlignedPhoto();
      if (uri) {
        setShot({
          uri,
          rigId: selectedRig,
          wbPreset: wbAtShutter,
          evBias: evAtShutter,
          capturedAt: Date.now(),
        });
        setTimeout(() => setPhase('preview'), 380);
      }
    } catch (e) {
      console.warn('Single capture error:', e);
    } finally {
      setIsCapturing(false);
      setCountdown(null);
    }
  }, [isCapturing, activeFilter, timerSec, selectedRig, wbPreset, evBias, captureAlignedPhoto]);

  const saveUriToLibrary = async (uri: string) => {
    try {
      await MediaLibrary.createAssetAsync(uri);
      return;
    } catch {
      await MediaLibrary.saveToLibraryAsync(uri);
    }
  };

  // ─── Save to gallery (rasterize preview: looks, frame, stickers) ───────────
  const handleSave = useCallback(async () => {
    if (!shot?.uri) return;

    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Saving to the gallery is not supported on web.');
      return;
    }

    let perm = mediaPermission;
    if (!perm?.granted) {
      perm = await requestMediaPermission();
      if (!perm.granted) {
        Alert.alert(
          'Photos permission',
          'Allow photodumps to save your photo to the library.',
        );
        return;
      }
    }

    setSaving(true);
    try {
      await new Promise<void>(resolve => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      await new Promise<void>(r => setTimeout(r, 120));

      const node = saveExportRef.current;
      if (!node) {
        throw new Error('Preview not ready');
      }

      const tmpUri = await captureRef(node, {
        format: 'jpg',
        quality: 1,
        result: 'tmpfile',
      });
      const trimmed = await trimSnapshotEdgeBleed(tmpUri);
      await saveUriToLibrary(trimmed);
      if (shot.rigId) {
        await saveDigiShot({
          uri: trimmed,
          rigId: shot.rigId,
          wbPreset: shot.wbPreset,
          evBias: shot.evBias,
        });
      }
      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Save error:', e);
      Alert.alert('Could not save', msg || 'Check Photos permission in system settings and try again.');
    } finally {
      setSaving(false);
    }
  }, [shot, mediaPermission, requestMediaPermission]);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setShot(null);
    setSaved(false);
    setSaving(false);
    setPhase('camera');
    setZoom(0);
  };

  // ─── Permission gates ─────────────────────────────────────────────────────
  if (!cameraPermission) {
    return (
      <View style={[ms.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accent || '#FF0055'} />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={[ms.root, ms.permCenter]}>
        <Camera size={56} color="#444" strokeWidth={1.5} style={{ marginBottom: 16 }} />
        <Text style={ms.permTitle}>Camera Access Needed</Text>
        <Text style={ms.permSub}>
          Digi Cam needs camera permission to capture your photo.
          Please tap below to grant access.
        </Text>
        <TouchableOpacity
          onPress={requestCameraPermission}
          style={[ms.permBtn, { backgroundColor: theme.accent || '#FF0055' }]}
        >
          <Text style={ms.permBtnText}>GRANT CAMERA ACCESS</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goBack} style={{ marginTop: 16 }}>
          <Text style={{ color: '#555', fontSize: 13 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── PREVIEW / SAVE ───────────────────────────────────────────────────────
  if (phase === 'preview' && shot) {
    const rig = shot.rigId ?? selectedRig;
    const pw = LCD_W;
    const ph = LCD_H;
    return (
      <View style={ms.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={ms.nav}>
            <TouchableOpacity style={ms.backBtn} onPress={() => setPhase('camera')}>
              <ChevronLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={ms.navTitle}>PREVIEW</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 16, gap: 16 }}>
            <View
              ref={saveExportRef}
              collapsable={false}
              style={{ width: pw, height: ph, overflow: 'hidden', backgroundColor: '#000', borderRadius: 10 }}
            >
              <Image source={{ uri: shot.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              <RigLookOverlay rigId={rig} w={pw} h={ph} />
              <WbTintOverlay preset={shot.wbPreset ?? 'auto'} />
              <EvCompensationOverlay evBias={shot.evBias ?? 0} />
              <DigicamDateStamp rigId={rig} capturedAt={shot.capturedAt} />
            </View>
            {saved ? (
              <View style={sv.savedBadge}>
                <Check size={36} color="#00FFA3" />
                <Text style={sv.savedText}>SAVED</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => void handleSave()} disabled={saving} style={{ width: '100%' }}>
                <LinearGradient colors={saving ? ['#333', '#222'] : ['#FF0055', '#FF5500']} style={sv.saveBtn}>
                  {saving ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Download size={20} color="#FFF" />
                      <Text style={sv.saveBtnText}>SAVE TO GALLERY</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleReset} style={sv.retakeBtn}>
              <RotateCcw size={16} color="#888" />
              <Text style={sv.retakeBtnText}>NEW SHOT</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ─── CAMERA PHASE ─────────────────────────────────────────────────────────
  const activeRigMeta = CAMERA_RIGS.find(r => r.id === selectedRig)!;
  const vfInnerW = LCD_W;
  const vfInnerH = LCD_H;
  const previewThumbUri = shot?.uri;
  const canGoEdit = !!shot;
  const isoReadout = [200, 400, 800, 1600, 3200][isoIdx] ?? 400;

  const liveCameraStack = (
    <View style={{ flex: 1, position: 'relative' }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={facing === 'back' ? flashMode : 'off'}
        enableTorch={torchOn}
        zoom={zoom}
        isPinchToZoomEnabled={false}
      />

      <RigLookOverlay rigId={selectedRig} w={vfInnerW} h={vfInnerH} />
      <WbTintOverlay preset={wbPreset} />
      <EvCompensationOverlay evBias={evBias} />
      <DigicamDateStamp rigId={selectedRig} />

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF', opacity: flashAnim }]}
      />

      {countdown !== null && (
        <View style={ms.countdownWrap}>
          <Animated.Text style={[ms.countdownText, { transform: [{ scale: countdownAnim }] }]}>
            {countdown === 0 ? 'SNAP' : String(countdown)}
          </Animated.Text>
        </View>
      )}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={ms.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

          {/* NAV */}
          <View style={ms.nav}>
            <MinimalBackButton onPress={goBack} color="#FFF" size={24} />
            <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
              <Text style={ms.navTitle}>DIGI CAM</Text>
              <Text style={ms.navFormatHint}>{activeRigMeta.brand} {activeRigMeta.model}</Text>
            </View>
            <TouchableOpacity
              style={ms.backBtn}
              onPress={() => router.push('/photobooth-gallery')}
              accessibilityLabel="Digi cam roll"
            >
              <ImageIcon size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={ms.compactCamScroll}
            contentContainerStyle={ms.compactCamContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ms.rigStripContent}
              style={ms.rigStripScroll}
            >
              {CAMERA_RIGS.map(rig => {
                const sel = selectedRig === rig.id;
                return (
                  <TouchableOpacity key={rig.id} onPress={() => applyRig(rig.id)} activeOpacity={0.9}>
                    <LinearGradient
                      colors={rig.grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[ms.rigCard, sel && ms.rigCardActive]}
                    >
                      <Text style={ms.rigBrand}>{rig.brand}</Text>
                      <Text style={ms.rigModel}>{rig.model}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={ms.lcdSection}>
              <LinearGradient
                colors={['#d4d4d4', '#737373', '#404040', '#a3a3a3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ms.digitalBodyChrome}
              >
                <View style={[ms.digitalBody, { flexDirection: 'column', gap: 10 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <View style={ms.digicamTopPlate}>
                        <Text style={ms.digicamTopPlateL}>REC</Text>
                        <Text style={ms.digicamTopPlateC}>{activeRigMeta.brand} {activeRigMeta.model}</Text>
                        <Text style={ms.digicamTopPlateR}>HQ</Text>
                      </View>
                      <GestureDetector gesture={vfGestures}>
                        <View style={[ms.digitalSensor, { borderColor: activeRigMeta.grad[1] }]}>
                          <View style={[ms.digitalSensorInner, { transform: [{ scale: 0.82 + zoom * 0.22 }] }]}>
                            {liveCameraStack}
                          </View>
                        </View>
                      </GestureDetector>
                    </View>
                    <View style={ms.gripRail} pointerEvents="none">
                      <View style={ms.gripGroove} />
                      <View style={ms.gripGroove} />
                      <View style={ms.gripGroove} />
                      <View style={ms.gripGroove} />
                    </View>
                  </View>
                  <View style={ms.lcdMetaPanel}>
                    <View style={ms.lcdMetaRow}>
                      <Text style={ms.lcdMetaFocal}>{mmFromZoom(selectedRig, zoom)}</Text>
                      <Text style={ms.lcdMetaEvLine}>
                        EV {evBias >= 0 ? '+' : ''}{evBias.toFixed(Math.abs(evBias) < 0.15 ? 2 : 1)} · ISO {isoReadout} · WB {wbPresetShort(wbPreset)}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={ms.settingsInner}>
                <View style={ms.toolbeltRow}>
                  <TouchableOpacity style={ms.controlBtn} onPress={cycleWb} activeOpacity={0.85}>
                    <Text style={ms.controlLabel}>WB</Text>
                    <Text style={ms.controlValue}>{wbPresetShort(wbPreset)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={ms.controlBtn} onPress={cycleIso} activeOpacity={0.85}>
                    <Text style={ms.controlLabel}>ISO</Text>
                    <Text style={ms.controlValue}>{isoReadout}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={ms.controlBtn} onPress={cycleFlash} activeOpacity={0.85}>
                    <Zap size={18} color={flashMode === 'off' ? '#666' : '#FFD600'} />
                    <Text style={ms.controlLabel}>FLASH</Text>
                    <Text style={ms.controlValue}>{flashMode.toUpperCase()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={ms.controlBtn} onPress={cycleTimer} activeOpacity={0.85}>
                    <Timer size={18} color="#FFF" />
                    <Text style={ms.controlLabel}>TIMER</Text>
                    <Text style={ms.controlValue}>{timerSec === 0 ? 'OFF' : `${timerSec}s`}</Text>
                  </TouchableOpacity>
                </View>
                <View style={ms.settingsDivider} />
                <View style={ms.evRowFull}>
                  <View style={ms.evHeader}>
                    <Sun size={16} color="#FFD600" />
                    <Text style={ms.controlLabel}>EXPOSURE (EV)</Text>
                    <Text style={ms.evReadout}>
                      {evBias >= 0 ? '+' : ''}{evBias.toFixed(2)}
                    </Text>
                  </View>
                  <Slider
                    style={ms.evSlider}
                    minimumValue={-12}
                    maximumValue={2}
                    step={0.05}
                    value={evBias}
                    onValueChange={setEvBias}
                    minimumTrackTintColor="#FFD600"
                    maximumTrackTintColor="#333"
                    thumbTintColor="#FFF"
                  />
                </View>
            </View>

            <View style={ms.shutterRow}>
                <View style={ms.shutterDock}>
                  <TouchableOpacity style={ms.dockThumb} onPress={pickFromGallery} activeOpacity={0.85} accessibilityLabel="Import from gallery">
                    {previewThumbUri ? (
                      <Image source={{ uri: previewThumbUri }} style={ms.dockThumbImg} resizeMode="cover" />
                    ) : (
                      <View style={ms.dockThumbEmpty}>
                        <ImageIcon size={20} color="#888" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[ms.shutter, isCapturing && { opacity: 0.5 }]}
                    onPress={() => { void handleSingleCapture(); }}
                    disabled={isCapturing}
                    activeOpacity={0.82}
                  >
                    {isCapturing
                      ? <ActivityIndicator color="#FF0055" size="small" />
                      : <View style={ms.shutterInner} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={ms.flipDockBtn}
                    onPress={() => setFacing(f => (f === 'front' ? 'back' : 'front'))}
                    activeOpacity={0.85}
                  >
                    <FlipHorizontal size={22} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {canGoEdit ? (
                  <TouchableOpacity
                    onPress={() => setPhase('preview')}
                    style={ms.editLinkRow}
                    activeOpacity={0.85}
                  >
                    <Sparkles size={16} color="#FF0055" />
                    <Text style={ms.editLinkTxt}>Review last shot</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
          </ScrollView>

        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

// ─── MAIN STYLES ──────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#030303' },

  // Permission screen
  permCenter:    { justifyContent: 'center', alignItems: 'center', padding: 32 },
  permTitle:     { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  permSub:       { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  permBtn:       { paddingHorizontal: 32, paddingVertical: 15, borderRadius: 18 },
  permBtnText:   { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },

  // Nav
  nav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  flipBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  navTitle:      { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  navFormatHint: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  nextBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FF0055' },
  nextBtnText:   { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  filterPill:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  filterPillText:{ fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  rigPill:       { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, maxWidth: SCREEN_W * 0.5 },
  rigPillText:   { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

  compactCamScroll: { flex: 1 },
  compactCamContent: {
    paddingHorizontal: 12,
    paddingBottom: 28,
    gap: 12,
  },
  cameraPageScroll:        { flex: 1 },
  cameraPageScrollContent: { paddingTop: 6, paddingBottom: 32 },
  sectionCard:             { marginHorizontal: 12, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: '#0c0c0c', borderWidth: 1, borderColor: '#242424' },
  sectionKicker:           { color: '#FF0055', fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
  sectionTitle:            { color: '#FAFAFA', fontSize: 15, fontWeight: '900', marginTop: 4 },
  sectionHint:             { color: '#888', fontSize: 12, marginTop: 6, marginBottom: 12, lineHeight: 18 },
  sectionActiveLine:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a' },
  sectionActiveLabel:      { color: '#555', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  sectionActiveValue:      { flex: 1, fontSize: 13, fontWeight: '900' },
  rigStripScroll:          { minHeight: 118 },
  rigStripContent:         { flexGrow: 1, alignItems: 'center', gap: 10, paddingVertical: 6, paddingRight: 4 },
  settingsInner:           { borderRadius: 14, backgroundColor: '#080808', borderWidth: 1, borderColor: '#1a1a1a', padding: 12, gap: 10 },
  settingsDivider:         { height: 1, backgroundColor: '#222', marginVertical: 2 },
  lcdSection:              { alignItems: 'center', paddingTop: 4 },

  rigCard:       { width: 108, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  rigCardActive: { borderColor: '#FFF', shadowColor: '#FFF', shadowOpacity: 0.35, shadowRadius: 10 },
  rigBrand:      { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  rigModel:      { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '800', marginTop: 2 },
  rigTag:        { color: 'rgba(255,255,255,0.65)', fontSize: 7, fontWeight: '700', marginTop: 4 },

  toolbeltRow:   { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'stretch', gap: 6 },

  controlsRow:   { flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#151515', borderBottomWidth: 1, borderBottomColor: '#151515', gap: 8 },
  evRowFull:       { width: '100%', paddingTop: 4 },
  controlBtn:      { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  controlBtnWide:  { flex: 1, minWidth: 120, justifyContent: 'center', paddingVertical: 4, paddingHorizontal: 4 },
  evHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 },
  evReadout:       { color: '#FFF', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  evSlider:        { width: '100%', height: 36 },
  controlLabel:    { color: '#555', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  controlValue:    { color: '#FFF', fontSize: 11, fontWeight: '800' },

  lensPlate:     { position: 'absolute', top: 12, left: 10, right: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  lensPlateK:    { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  lensPlateM:    { color: '#d4d4d4', fontSize: 9, fontWeight: '700', marginTop: 2 },
  lensPlateS:    { color: '#888', fontSize: 8, marginTop: 4, fontWeight: '600' },

  dazzFrameRing: { position: 'absolute', top: 44, left: 0, right: 0, alignItems: 'center' },
  dazzFrameMm:   {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.88)',
    backgroundColor: 'rgba(0,0,0,0.42)',
    overflow: 'hidden',
  },

  hintStrip:     { color: '#555', fontSize: 10, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 0, lineHeight: 15 },
  digitalBodyChrome: {
    width: Math.min(SCREEN_W * 0.97, LCD_W + 52),
    alignSelf: 'center',
    borderRadius: 26,
    padding: 2,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  digitalBody:        { borderRadius: 24, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 10, backgroundColor: '#141414', borderWidth: 1, borderColor: 'rgba(0,0,0,0.45)' },
  lcdMetaPanel:      { paddingTop: 8, marginTop: 2, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', gap: 4 },
  lcdMetaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lcdMetaFocal:      { color: '#e5e5e5', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  lcdMetaEvLine:     { flex: 1, color: '#a3a3a3', fontSize: 9, fontWeight: '700', textAlign: 'right' },
  lcdMetaRecipe:     { color: '#737373', fontSize: 8, fontWeight: '600', letterSpacing: 0.2 },
  digitalBrand:       { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '900', letterSpacing: 3, textAlign: 'center', marginBottom: 8 },
  digicamTopPlate:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 6 },
  digicamTopPlateL:   { color: '#ef4444', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  digicamTopPlateC:   { color: 'rgba(255,255,255,0.55)', fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  digicamTopPlateR:   { color: '#86efac', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  digitalSensor:      { width: LCD_W, height: LCD_H, alignSelf: 'center', borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', borderWidth: 2, borderColor: '#1E1E1E' },
  digitalSensorInner: { flex: 1, overflow: 'hidden' },
  gripRail:           { width: 16, alignSelf: 'stretch', marginVertical: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12 },
  gripGroove:         { width: 6, height: 2, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.55)' },

  // Corner bracket decorations
  corner:        { position: 'absolute', width: 22, height: 22, borderColor: '#FF0055', borderStyle: 'solid' },
  tl:            { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 },
  tr:            { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 },
  bl:            { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 },
  br:            { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 },

  countdownWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.32)' },
  countdownText: {
    color: '#FFF', fontSize: 88, fontWeight: '900',
    textShadowColor: '#FF0055', textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 },
  },

  // Shutter dock
  shutterRow:    { paddingHorizontal: 0, gap: 6, paddingBottom: 0, paddingTop: 4 },
  shutterDock:   {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  dockThumb:     { width: 52, height: 52, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  dockThumbImg:  { width: '100%', height: '100%' },
  dockThumbEmpty:{ width: 52, height: 52, borderRadius: 12, backgroundColor: '#151515', borderWidth: 1, borderColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' },
  flipDockBtn:   { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  editLinkRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 },
  editLinkTxt:   { color: '#FF0055', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  shutter:       { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: '#FF0055', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  shutterInner:  { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FF0055' },
  editBtn:       { width: 40, alignItems: 'center', gap: 2 },
  editBtnText:   { color: '#FF0055', fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  // Quick filter bar
  quickFilter:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#1A1A1A' },
  quickFilterText:{ fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // Gesture panel
  panel:         { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#111' },
  // Edit phase
  editCanvas:    { width: '100%', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  previewStrip:  { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', padding: 8, gap: 5, alignItems: 'center' },
  previewDate:   { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },

  editPanel:     { flex: 1, backgroundColor: '#030303', borderTopWidth: 1, borderTopColor: '#111' },
  editTabs:      { flexDirection: 'row', backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: '#111' },
  editTab:       { flex: 1, alignItems: 'center', paddingVertical: 10 },
  editTabActive: { borderTopWidth: 2, borderTopColor: '#FF0055' },
  editTabLabel:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 1, color: '#333' },
  chipRow:       { paddingHorizontal: 14, gap: 8, alignItems: 'center', flexDirection: 'row' },

  filterChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#1E1E1E', backgroundColor: 'rgba(255,255,255,0.02)' },
  filterChipLabel:{ fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },

  frameChip:     { alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: '#1E1E1E', backgroundColor: 'rgba(255,255,255,0.02)' },
  frameChipColor:{ width: 38, height: 22, borderRadius: 6, borderWidth: 1.5 },
  frameChipLabel:{ fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

  stickerChip:   { width: 52, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
});