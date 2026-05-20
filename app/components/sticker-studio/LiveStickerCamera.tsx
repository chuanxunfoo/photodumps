import { CameraView } from 'expo-camera';
import { ChevronDown, ChevronUp, Image as ImageIcon, RefreshCw, Sparkles, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ViewportPoint } from '../../_lib/photoFile';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CutoutResult, TraceSettings } from '../../_lib/stickerStudio/types';
import { FramedCutout } from './FramedCutout';
import { StickerStyleBar } from './StickerStyleBar';

const { width: SW, height: SH } = Dimensions.get('window');
const SCAN = Math.min(SW * 0.72, 280);
const PREVIEW_SZ = Math.min(SW * 0.26, 108);
const PREVIEW_GAP = 12;
const PREVIEW_SLOT_H = PREVIEW_SZ + PREVIEW_GAP;
const HINT_H = 24;
const COLLAPSED_TAB_H = 48;
const DEFAULT_DOCK_H = 300;

const SCAN_BLOCK_H = PREVIEW_SLOT_H + SCAN + HINT_H + 8;

type ThemeSlice = {
  bg: string;
  bg2: string;
  bg3: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  border: string;
  isDark: boolean;
};

type Props = {
  cameraRef: React.RefObject<CameraView | null>;
  trace: TraceSettings;
  onTraceChange: (t: TraceSettings) => void;
  cutout: CutoutResult | null;
  previewRef: React.RefObject<View | null>;
  scanning: boolean;
  scanStage: string;
  scanError: string | null;
  saving: boolean;
  theme: ThemeSlice;
  onBack: () => void;
  onGallery: () => void;
  onScan: () => void;
  onTapFocus: (point: ViewportPoint) => void;
  onMakeSticker: () => void;
  stillUri?: string | null;
};

function frameTopForLayout(
  screenH: number,
  topBarBottom: number,
  bottomOccupied: number,
  biasUp: number,
): number {
  const avail = screenH - topBarBottom - bottomOccupied;
  return topBarBottom + Math.max(10, (avail - SCAN_BLOCK_H) / 2 - biasUp);
}

export function LiveStickerCamera({
  cameraRef,
  trace,
  onTraceChange,
  cutout,
  previewRef,
  scanning,
  scanStage,
  scanError,
  saving,
  theme,
  onBack,
  onGallery,
  onScan,
  onTapFocus,
  onMakeSticker,
  stillUri,
}: Props) {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;
  const frameTopAnim = useRef(new Animated.Value(frameTopForLayout(SH, insets.top + 56, DEFAULT_DOCK_H + insets.bottom, 28))).current;

  const [tapMark, setTapMark] = useState<{ x: number; y: number } | null>(null);
  const [dockVisible, setDockVisible] = useState(true);
  const [topBarH, setTopBarH] = useState(56);
  const [dockH, setDockH] = useState(DEFAULT_DOCK_H);

  const topBarBottom = insets.top + topBarH;
  const bottomPad = Math.max(insets.bottom, 10);
  const bottomOccupied = dockVisible ? dockH + bottomPad : COLLAPSED_TAB_H + bottomPad;
  const targetFrameTop = useMemo(
    () => frameTopForLayout(SH, topBarBottom, bottomOccupied, dockVisible ? 32 : 0),
    [topBarBottom, bottomOccupied, dockVisible],
  );

  useEffect(() => {
    Animated.spring(frameTopAnim, {
      toValue: targetFrameTop,
      friction: 11,
      tension: 72,
      useNativeDriver: false,
    }).start();
  }, [frameTopAnim, targetFrameTop]);

  useEffect(() => {
    if (!scanning) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, scanning]);

  const frameBorder = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.accent, '#FFFFFF'],
  });

  const statusLine = scanning
    ? scanStage || 'Scanning…'
    : scanError
      ? scanError
      : cutout
        ? 'Sticker ready'
        : 'Point at any object — tap it if scan struggles';

  const frameHint = cutout
    ? dockVisible
      ? 'Adjust style below'
      : 'Show tools below to style'
    : scanError
      ? 'Tap the object to help AI'
      : 'Tap object if scan is slow';

  const onTopBarLayout = (e: LayoutChangeEvent) => {
    setTopBarH(e.nativeEvent.layout.height);
  };

  const onDockLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setDockH(h);
  };

  return (
    <View style={[st.root, { backgroundColor: '#000' }]}>
      {stillUri ? (
        <Image source={{ uri: stillUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      )}

      <Pressable
        style={st.tapLayer}
        onPress={e => {
          const { locationX, locationY } = e.nativeEvent;
          setTapMark({ x: locationX, y: locationY });
          onTapFocus({ x: locationX / SW, y: locationY / SH });
        }}
      />

      <Animated.View style={[st.scanAnchor, { top: frameTopAnim }]} pointerEvents="none">
        <View style={[st.previewSlot, { width: PREVIEW_SZ, height: PREVIEW_SZ }]}>
          {cutout ? (
            <View style={[st.previewCard, { borderColor: theme.accent, backgroundColor: theme.bg2 }]}>
              <FramedCutout
                uri={cutout.uri}
                trace={trace}
                width={PREVIEW_SZ - 8}
                height={PREVIEW_SZ - 8}
                showTransparencyGrid
                exportRef={previewRef}
              />
            </View>
          ) : (
            <View style={[st.previewEmpty, { borderColor: theme.border, backgroundColor: 'rgba(0,0,0,0.45)' }]}>
              <Sparkles size={22} color={theme.textMuted} />
              <Text style={[st.previewEmptyLbl, { color: theme.textMuted }]}>Preview</Text>
              <Text style={[st.previewEmptySub, { color: theme.textSub }]}>
                {scanning ? 'Scanning…' : 'Shows here'}
              </Text>
            </View>
          )}
        </View>

        <Animated.View style={[st.scanFrame, { borderColor: scanning ? frameBorder : theme.accent }]} />
        <Text style={[st.frameHint, { color: 'rgba(255,255,255,0.85)' }]}>{frameHint}</Text>
      </Animated.View>

      <SafeAreaView style={st.flex} edges={['top']} pointerEvents="box-none">
        <View style={st.topRow} pointerEvents="box-none" onLayout={onTopBarLayout}>
          <TouchableOpacity
            style={[st.iconBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}
            onPress={onBack}
            hitSlop={16}
          >
            <X size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={[st.statusPill, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            {scanning && <ActivityIndicator color={theme.accent} size="small" style={{ marginRight: 6 }} />}
            <Text style={[st.statusTxt, { color: theme.text }]} numberOfLines={1}>
              {statusLine}
            </Text>
          </View>
          <TouchableOpacity
            style={[st.iconBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}
            onPress={onScan}
            disabled={scanning}
            hitSlop={16}
          >
            <RefreshCw size={18} color={scanning ? theme.textMuted : theme.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {tapMark && (
        <View
          pointerEvents="none"
          style={[
            st.tapRing,
            {
              left: tapMark.x - 28,
              top: tapMark.y - 28,
              borderColor: theme.accent,
            },
          ]}
        />
      )}

      {dockVisible ? (
        <View
          style={[
            st.bottomDock,
            {
              backgroundColor: theme.bg,
              borderTopColor: theme.border,
              paddingBottom: bottomPad,
            },
          ]}
          onLayout={onDockLayout}
        >
          <TouchableOpacity
            style={[st.dockToggle, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
            onPress={() => setDockVisible(false)}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <ChevronDown size={18} color={theme.textSub} />
            <Text style={[st.dockToggleTxt, { color: theme.textSub }]}>Hide outline & actions</Text>
          </TouchableOpacity>

          <StickerStyleBar trace={trace} onChange={onTraceChange} theme={theme} />

          <TouchableOpacity
            activeOpacity={0.9}
            style={[st.makeBtn, { backgroundColor: cutout && !saving ? theme.accent : theme.bg3 }]}
            disabled={!cutout || saving}
            onPress={onMakeSticker}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[st.makeTxt, { color: cutout ? '#fff' : theme.textMuted }]}>Make sticker</Text>
            )}
          </TouchableOpacity>

          {!stillUri && (
            <TouchableOpacity
              style={[st.galleryBtn, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
              onPress={onGallery}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <ImageIcon size={18} color={theme.text} />
              <Text style={[st.galleryTxt, { color: theme.text }]}>Pick from gallery</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[st.collapsedDock, { paddingBottom: bottomPad }]}>
          <TouchableOpacity
            style={[st.dockToggle, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
            onPress={() => setDockVisible(true)}
            activeOpacity={0.85}
          >
            <ChevronUp size={18} color={theme.text} />
            <Text style={[st.dockToggleTxt, { color: theme.text }]}>Show outline & actions</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  scanAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
    gap: PREVIEW_GAP,
  },
  previewSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  previewCard: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  previewEmpty: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  previewEmptyLbl: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  previewEmptySub: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  scanFrame: {
    width: SCAN,
    height: SCAN,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  frameHint: { fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  tapRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 15,
  },
  flex: { flex: 1, zIndex: 2 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 42,
  },
  statusTxt: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    elevation: 20,
  },
  collapsedDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 6,
    zIndex: 20,
    elevation: 20,
  },
  dockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dockToggleTxt: { fontSize: 13, fontWeight: '700' },
  makeBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  makeTxt: { fontSize: 16, fontWeight: '800' },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  galleryTxt: { fontSize: 14, fontWeight: '700' },
});
