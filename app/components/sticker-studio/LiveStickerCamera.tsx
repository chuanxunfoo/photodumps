import { BlurView } from 'expo-blur';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { ChevronDown, Home, Image as ImageIcon, RefreshCw, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ViewportPoint } from '../../_lib/photoFile';
import type { CutoutResult, TraceSettings } from '../../_lib/stickerStudio/types';
import { FramedCutout } from './FramedCutout';
import { StickerStyleBar } from './StickerStyleBar';
import { TapGuidePulse } from './TapGuidePulse';

const { width: SW, height: SH } = Dimensions.get('window');
const BUTTER = '#F5D547';
const BUTTER_LIGHT = '#FFE566';
const SCAN = Math.min(SW * 0.72, 280);
const CUTOUT_PREVIEW = Math.round(SCAN * 0.78);
const EXPORT_SZ = 320;
const DEFAULT_DOCK_H = 300;
const SCAN_BLOCK_H = SCAN + 8;
const HOUSE_SZ = 46;

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
  scanError: string | null;
  saving: boolean;
  theme: ThemeSlice;
  stickerCount: number;
  onBack: () => void;
  onGallery: () => void;
  onScan: () => void;
  onTapFocus: (point: ViewportPoint) => void;
  onSaveSticker: () => void;
  onOpenCollection: () => void;
  absorbUri: string | null;
};

function frameTopForLayout(screenH: number, topBarBottom: number, bottomOccupied: number, biasUp: number): number {
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
  scanError,
  saving,
  theme,
  stickerCount,
  onBack,
  onGallery,
  onScan,
  onTapFocus,
  onSaveSticker,
  onOpenCollection,
  absorbUri,
}: Props) {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;
  const dockSlide = useRef(new Animated.Value(SH)).current;
  const absorb = useRef(new Animated.Value(0)).current;
  const houseBounce = useRef(new Animated.Value(1)).current;
  const cutoutPop = useRef(new Animated.Value(0.88)).current;
  const frameRef = useRef<View>(null);
  const houseRef = useRef<View>(null);

  const [dockOpen, setDockOpen] = useState(false);
  const [topBarH, setTopBarH] = useState(56);
  const [dockH, setDockH] = useState(DEFAULT_DOCK_H);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [absorbing, setAbsorbing] = useState(false);
  const [tapFlash, setTapFlash] = useState<{ x: number; y: number } | null>(null);
  const [frameLayout, setFrameLayout] = useState({ x: 0, y: 0, w: SCAN, h: SCAN });
  const [houseLayout, setHouseLayout] = useState({ x: SW - 58, y: insets.top + 12, w: HOUSE_SZ, h: HOUSE_SZ });

  const topBarBottom = insets.top + topBarH;
  const bottomPad = Math.max(insets.bottom, 10);
  const dockVisible = Boolean(cutout);
  const bottomOccupied = dockVisible && dockOpen ? dockH + bottomPad : bottomPad + 16;
  const targetFrameTop = useMemo(
    () => frameTopForLayout(SH, topBarBottom, bottomOccupied, dockOpen ? 36 : 8),
    [topBarBottom, bottomOccupied, dockOpen],
  );
  const frameTopAnim = useRef(new Animated.Value(targetFrameTop)).current;

  const showTapGuide = !cutout && !scanning && !guideDismissed;
  const showCenterCutout = Boolean(cutout) && !absorbing;

  useEffect(() => {
    Animated.spring(frameTopAnim, {
      toValue: targetFrameTop,
      friction: 11,
      tension: 72,
      useNativeDriver: false,
    }).start();
  }, [frameTopAnim, targetFrameTop]);

  useEffect(() => {
    if (cutout) {
      setDockOpen(true);
      cutoutPop.setValue(0.88);
      Animated.spring(cutoutPop, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
    } else {
      setDockOpen(false);
      setGuideDismissed(false);
      cutoutPop.setValue(0.88);
    }
  }, [cutout, cutoutPop]);

  useEffect(() => {
    if (scanError) setGuideDismissed(false);
  }, [scanError]);

  useEffect(() => {
    if (!dockVisible) {
      dockSlide.setValue(SH);
      return;
    }
    Animated.spring(dockSlide, {
      toValue: dockOpen ? 0 : SH * 0.72,
      friction: 9,
      tension: 58,
      useNativeDriver: true,
    }).start();
  }, [dockOpen, dockSlide, dockVisible]);

  useEffect(() => {
    if (!scanning) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, scanning]);

  const runAbsorb = () => {
    frameRef.current?.measureInWindow((fx, fy, fw, fh) => {
      houseRef.current?.measureInWindow((hx, hy, hw, hh) => {
        setFrameLayout({ x: fx, y: fy, w: fw, h: fh });
        setHouseLayout({ x: hx, y: hy, w: hw, h: hh });
        setAbsorbing(true);
        absorb.setValue(0);
        Animated.timing(absorb, {
          toValue: 1,
          duration: 720,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }).start(() => setAbsorbing(false));

        houseBounce.setValue(1);
        Animated.sequence([
          Animated.spring(houseBounce, { toValue: 1.22, friction: 4, tension: 200, useNativeDriver: true }),
          Animated.spring(houseBounce, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        ]).start();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });
    });
  };

  useEffect(() => {
    if (!absorbUri) return;
    requestAnimationFrame(() => runAbsorb());
  }, [absorbUri]);

  const frameBorder = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [BUTTER, BUTTER_LIGHT],
  });

  const statusLine = scanError || '';

  const frameCenterX = frameLayout.x + frameLayout.w / 2;
  const frameCenterY = frameLayout.y + frameLayout.h / 2;
  const houseCenterX = houseLayout.x + houseLayout.w / 2;
  const houseCenterY = houseLayout.y + houseLayout.h / 2;

  const absorbX = absorb.interpolate({
    inputRange: [0, 1],
    outputRange: [0, houseCenterX - frameCenterX],
  });
  const absorbY = absorb.interpolate({
    inputRange: [0, 1],
    outputRange: [0, houseCenterY - frameCenterY],
  });
  const absorbScale = absorb.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.5, 0.08] });
  const absorbOp = absorb.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.9, 0] });

  const handleTap = (locationX: number, locationY: number) => {
    if (cutout) return;
    setTapFlash({ x: locationX, y: locationY });
    setGuideDismissed(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTapFocus({ x: locationX / SW, y: locationY / SH });
    setTimeout(() => setTapFlash(null), 520);
  };

  const dockGlass =
    Platform.OS === 'web' ? (
      <View style={[st.dockGlass, { backgroundColor: 'rgba(12,12,18,0.88)' }]} />
    ) : (
      <BlurView intensity={72} tint="dark" style={st.dockGlass} />
    );

  return (
    <View style={st.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <Animated.View style={[st.scanAnchor, { top: frameTopAnim }]} pointerEvents="box-none">
        <View ref={frameRef} collapsable={false} style={st.frameBox} pointerEvents="none">
          <Animated.View
            pointerEvents="none"
            style={[
              st.scanFrame,
              {
                borderColor: scanning ? frameBorder : cutout ? 'rgba(245,213,71,0.5)' : BUTTER,
                borderStyle: cutout ? 'solid' : 'dashed',
              },
            ]}
          >
            {scanning && (
              <View style={st.scanningOverlay} pointerEvents="none">
                <ActivityIndicator color={BUTTER} size="large" />
              </View>
            )}

            {showTapGuide && (
              <View style={st.guideCenter} pointerEvents="none">
                <TapGuidePulse size={120} active />
              </View>
            )}

            {showCenterCutout && cutout && (
              <Animated.View
                style={[st.cutoutCenter, { transform: [{ scale: cutoutPop }] }]}
                pointerEvents="none"
              >
                <FramedCutout
                  uri={cutout.uri}
                  trace={trace}
                  width={CUTOUT_PREVIEW}
                  height={CUTOUT_PREVIEW}
                  exportRef={previewRef}
                />
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View style={[st.frameRefreshWrap, { top: Animated.add(frameTopAnim, SCAN - 22) }]} pointerEvents="box-none">
        <TouchableOpacity
          style={st.frameRefresh}
          onPress={onScan}
          disabled={scanning}
          activeOpacity={0.85}
          hitSlop={10}
        >
          <RefreshCw size={16} color={scanning ? 'rgba(255,255,255,0.35)' : '#fff'} />
        </TouchableOpacity>
      </Animated.View>

      <Pressable
        style={st.tapLayer}
        onPress={e => handleTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      />

      {tapFlash && (
        <View pointerEvents="none" style={[st.tapFlash, { left: tapFlash.x - 36, top: tapFlash.y - 36 }]}>
          <View style={st.tapFlashRing} />
        </View>
      )}

      {absorbing && absorbUri && (
        <Animated.View
          pointerEvents="none"
          style={[
            st.absorbFlyer,
            {
              left: frameCenterX - CUTOUT_PREVIEW / 2,
              top: frameCenterY - CUTOUT_PREVIEW / 2,
              width: CUTOUT_PREVIEW,
              height: CUTOUT_PREVIEW,
              opacity: absorbOp,
              transform: [{ translateX: absorbX }, { translateY: absorbY }, { scale: absorbScale }],
            },
          ]}
        >
          <Image source={{ uri: absorbUri }} style={st.absorbImg} resizeMode="contain" />
        </Animated.View>
      )}

      <SafeAreaView style={st.topSafe} edges={['top']} pointerEvents="box-none">
        <View style={st.topRow} pointerEvents="box-none" onLayout={onTopBarLayout}>
          <TouchableOpacity style={st.iconBtn} onPress={onBack} hitSlop={16}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
          {scanError ? (
            <View style={st.statusPill}>
              <Text style={st.statusTxt} numberOfLines={2}>
                {statusLine}
              </Text>
            </View>
          ) : scanning ? (
            <View style={st.statusPillMini}>
              <ActivityIndicator color={BUTTER} size="small" />
            </View>
          ) : (
            <View style={st.statusSpacer} />
          )}
          <View ref={houseRef} collapsable={false}>
            <Animated.View style={{ transform: [{ scale: houseBounce }] }}>
              <TouchableOpacity style={st.houseBtn} onPress={onOpenCollection} activeOpacity={0.88} hitSlop={10}>
                <View style={st.houseRoof} />
                <Home size={22} color="#fff" strokeWidth={2.4} style={st.houseIcon} />
                {stickerCount > 0 && (
                  <View style={[st.houseBadge, { backgroundColor: theme.accent }]}>
                    <Text style={st.houseBadgeTxt}>{stickerCount > 99 ? '99+' : stickerCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>

      {dockVisible && (
        <Animated.View
          style={[st.dockWrap, { transform: [{ translateY: dockSlide }], paddingBottom: bottomPad }]}
          onLayout={onDockLayout}
        >
          {dockGlass}
          <TouchableOpacity
            style={st.dockHandle}
            onPress={() => setDockOpen(v => !v)}
            activeOpacity={0.9}
            hitSlop={{ top: 12, bottom: 12 }}
          >
            <View style={st.handleBar} />
            <ChevronDown
              size={16}
              color="rgba(255,255,255,0.7)"
              style={{ transform: [{ rotate: dockOpen ? '0deg' : '180deg' }] }}
            />
          </TouchableOpacity>

          {dockOpen && (
            <View style={st.dockBody}>
              <StickerStyleBar trace={trace} onChange={onTraceChange} theme={theme} />

              <View style={st.dockActions}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[st.saveBtn, { backgroundColor: !saving ? theme.accent : theme.bg3 }]}
                  disabled={saving}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSaveSticker();
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={st.saveBtnTxt}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={st.miniBtn} onPress={onGallery} activeOpacity={0.85}>
                  <ImageIcon size={18} color="#fff" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );

  function onTopBarLayout(e: LayoutChangeEvent) {
    setTopBarH(e.nativeEvent.layout.height);
  }

  function onDockLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setDockH(h);
  }
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  tapLayer: { ...StyleSheet.absoluteFillObject, zIndex: 8 },
  scanAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  frameBox: { alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: SCAN,
    height: SCAN,
    borderWidth: 2.5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  guideCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutoutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameRefresh: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapFlash: {
    position: 'absolute',
    width: 72,
    height: 72,
    zIndex: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapFlashRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: BUTTER,
    backgroundColor: 'rgba(245,213,71,0.18)',
  },
  absorbFlyer: {
    position: 'absolute',
    zIndex: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absorbImg: { width: '100%', height: '100%' },
  topSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 16 },
  frameRefreshWrap: {
    position: 'absolute',
    right: (SW - SCAN) / 2 - 14,
    zIndex: 17,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSpacer: { flex: 1 },
  statusPillMini: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  statusPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    minHeight: 36,
  },
  statusTxt: { fontSize: 11, fontWeight: '600', flexShrink: 1, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  houseBtn: {
    width: HOUSE_SZ,
    height: HOUSE_SZ,
    borderRadius: HOUSE_SZ / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(245,213,71,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  houseRoof: {
    position: 'absolute',
    top: 6,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BUTTER,
  },
  houseIcon: { marginTop: 6 },
  houseBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  houseBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 24,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dockGlass: { ...StyleSheet.absoluteFillObject },
  dockHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    gap: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dockBody: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  dockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
  miniBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
