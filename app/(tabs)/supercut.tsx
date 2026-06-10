/**
 * Supercut — one-tap AI-assisted batch cleanup (screenshots + duplicate dimensions heuristic).
 */
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import {
  Cpu, RotateCcw, ScanLine, Sparkles, Trash2, X, Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { getLocaleUi } from '../_lib/localeUi';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { useRequireProFeature } from '../_lib/useRequireProFeature';
import { estimateAssetBytes, recordUserStatsDeletion } from '../_lib/userStatsSupabase';
import { pageAccentWash } from '../_lib/themeContrast';
import { useTheme } from './ThemeContext';

const { width: W, height: H } = Dimensions.get('window');

function estimateMB(a: MediaLibrary.Asset): number {
  return estimateAssetBytes({
    mediaType: a.mediaType === 'video' ? 'video' : 'photo',
    width: a.width,
    height: a.height,
    duration: a.duration,
  }) / (1024 * 1024);
}

function itemLabel(a: MediaLibrary.Asset): string {
  if ((a as { mediaSubtypes?: string[] }).mediaSubtypes?.includes('screenshot')) return 'Screenshot';
  return 'Duplicate';
}

type QueueModalProps = {
  visible: boolean;
  queue: MediaLibrary.Asset[];
  estMB: number;
  running: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onConfirm: () => void;
};

function SupercutQueueModal({
  visible, queue, estMB, running, onClose, onRemove, onConfirm,
}: QueueModalProps) {
  const { theme } = useTheme();
  const slide = useRef(new Animated.Value(H)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: visible ? 0 : H, friction: 14, tension: 80, useNativeDriver: true }).start();
  }, [visible, slide]);

  const cell = (W - 36) / 3;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={qm.backdrop}>
        <Animated.View style={[qm.sheet, { backgroundColor: theme.bg, transform: [{ translateY: slide }] }]}>
          <LinearGradient colors={['#220018', theme.bg]} style={qm.head}>
            <View style={[qm.handle, { backgroundColor: theme.border }]} />
            <View style={qm.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={[qm.title, { color: theme.text }]}>Review delete queue</Text>
                <Text style={[qm.sub, { color: theme.danger }]}>
                  {queue.length} items · ~{estMB.toFixed(0)} MB · tap to remove from queue
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[qm.closeBtn, { backgroundColor: theme.bg3 }]}>
                <X size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={[qm.hint, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <Sparkles size={12} color="#FFD600" />
            <Text style={[qm.hintTxt, { color: theme.textSub }]}>
              Double-check before deleting. Removed items stay in your library.
            </Text>
          </View>

          {queue.length === 0 ? (
            <View style={qm.empty}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Queue is empty</Text>
            </View>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(item) => item.id}
              numColumns={3}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[qm.cell, { width: cell, height: cell }]}
                  onPress={() => onRemove(item.id)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={qm.cellBadge}>
                    <Text style={qm.cellBadgeTxt}>{itemLabel(item)}</Text>
                  </View>
                  <View style={qm.cellOverlay}>
                    <RotateCcw size={16} color="#FFF" />
                    <Text style={qm.cellOverlayTxt}>Keep</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          <View style={[qm.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[qm.footerBtn, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={running}
            >
              <Text style={{ color: theme.textSub, fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>BACK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 2, opacity: queue.length && !running ? 1 : 0.45 }}
              onPress={onConfirm}
              disabled={!queue.length || running}
              activeOpacity={0.88}
            >
              <LinearGradient colors={['#FF0055', '#FF5500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={qm.confirmGrad}>
                {running ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Trash2 size={18} color="#FFF" />
                    <Text style={qm.confirmTxt}>DELETE {queue.length} ITEMS</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const qm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  sheet: { height: H * 0.88, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  head: { paddingTop: 12, paddingBottom: 14, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  hintTxt: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cell: { margin: 2, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  cellBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  cellBadgeTxt: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  cellOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,0,85,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellOverlayTxt: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  confirmGrad: {
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmTxt: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});

export default function SupercutScreen() {
  const proAllowed = useRequireProFeature();
  const goBack = useExploreAwareBack();
  const { theme, themeId, language, user } = useTheme();
  const u = getLocaleUi(language);

  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [candidates, setCandidates] = useState<MediaLibrary.Asset[]>([]);
  const [estMB, setEstMB] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  const pulseLoop = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  const scanLibrary = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Supercut', 'Batch cleaning runs on iOS and Android.');
      return;
    }
    setScanning(true);
    setCandidates([]);
    setEstMB(0);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.status !== 'granted' && perm.status !== 'limited') {
        Alert.alert('Permission', 'Photo library access is required.');
        setScanning(false);
        return;
      }
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 3000,
        mediaType: ['photo', 'video'],
        sortBy: 'creationTime',
      });

      const seen = new Map<string, MediaLibrary.Asset>();
      const dups: MediaLibrary.Asset[] = [];
      const shots: MediaLibrary.Asset[] = [];

      for (const a of assets) {
        if ((a as { mediaSubtypes?: string[] }).mediaSubtypes?.includes('screenshot')) {
          shots.push(a);
          continue;
        }
        const sig = `${a.filename}_${a.width}x${a.height}`;
        if (seen.has(sig)) dups.push(a);
        else seen.set(sig, a);
      }

      const pick = [...shots, ...dups];
      const mb = pick.reduce((s, a) => s + estimateMB(a), 0);
      setCandidates(pick);
      setEstMB(mb);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pulseLoop();
    } catch (e) {
      console.warn(e);
      Alert.alert('Scan failed', 'Could not read the library.');
    } finally {
      setScanning(false);
    }
  };

  const removeFromQueue = (id: string) => {
    setCandidates(prev => {
      const next = prev.filter(c => c.id !== id);
      setEstMB(next.reduce((s, a) => s + estimateMB(a), 0));
      return next;
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openQueue = () => {
    if (candidates.length === 0) {
      Alert.alert(u.supercutTitle, u.supercutEmpty);
      return;
    }
    setShowQueue(true);
  };

  const confirmDelete = async () => {
    if (candidates.length === 0) return;
    setRunning(true);
    try {
      const ids = candidates.map((c) => c.id);
      const chunk = 400;
      for (let i = 0; i < ids.length; i += chunk) {
        await MediaLibrary.deleteAssetsAsync(ids.slice(i, i + chunk));
      }
      const bytes = Math.round(estMB * 1024 * 1024);
      await recordUserStatsDeletion({
        userId: user?.uid ?? '',
        itemsCount: candidates.length,
        bytesCleared: bytes,
        source: 'supercut',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Supercut', `${candidates.length} items removed.`);
      setCandidates([]);
      setEstMB(0);
      setShowQueue(false);
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', 'Deletion did not complete.');
    } finally {
      setRunning(false);
    }
  };

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] });

  if (!proAllowed) return null;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={pageAccentWash(themeId, theme)} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader variant="detail" onBack={goBack} subtitle={u.supercutSubtitle} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: glow }}>
            <LinearGradient colors={['#6D28D9', '#FF0055', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <BlurView intensity={Platform.OS === 'ios' ? 28 : 0} tint="dark" style={styles.heroInner}>
                <View style={styles.heroIconRow}>
                  <Cpu size={26} color="#FFF" />
                  <Sparkles size={22} color="#FDE68A" />
                </View>
                <Text style={styles.heroTitle}>{u.supercutTitle}</Text>
                <Text style={styles.heroSub}>
                  AI-style scan flags screenshots and same-size burst duplicates. Review the queue, then delete in one tap.
                </Text>
              </BlurView>
            </LinearGradient>
          </Animated.View>

          <View style={[styles.statRow, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
            <View style={styles.statCell}>
              <Text style={[styles.statNum, { color: theme.text }]}>{candidates.length}</Text>
              <Text style={[styles.statLbl, { color: theme.textSub }]}>items</Text>
            </View>
            <View style={[styles.statSep, { backgroundColor: theme.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statNum, { color: '#34D399' }]}>{estMB.toFixed(0)} MB</Text>
              <Text style={[styles.statLbl, { color: theme.textSub }]}>est. freed</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnScan, { opacity: scanning ? 0.6 : 1 }]}
            disabled={scanning}
            onPress={() => void scanLibrary()}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#1e1b4b', '#312e81']} style={styles.btnGrad}>
              {scanning ? <ActivityIndicator color="#fff" /> : <ScanLine size={22} color="#A5B4FC" />}
              <Text style={styles.btnScanTxt}>{scanning ? u.supercutAnalyzing : u.supercutScan}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnRun, { opacity: candidates.length && !running ? 1 : 0.45 }]}
            disabled={!candidates.length || running}
            onPress={openQueue}
            activeOpacity={0.88}
          >
            <LinearGradient colors={['#FF0055', '#F97316']} style={styles.btnGrad}>
              <Zap size={22} color="#FFF" />
              <Text style={styles.btnRunTxt}>{u.supercutRun}</Text>
              <Trash2 size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.legal, { color: theme.textMuted }]}>
            Heuristic only — review the delete queue before confirming. Nothing is uploaded; deletions are on-device.
          </Text>
        </ScrollView>
      </SafeAreaView>

      <SupercutQueueModal
        visible={showQueue}
        queue={candidates}
        estMB={estMB}
        running={running}
        onClose={() => !running && setShowQueue(false)}
        onRemove={removeFromQueue}
        onConfirm={() => void confirmDelete()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 48 },
  hero: { borderRadius: 28, overflow: 'hidden', marginBottom: 20 },
  heroInner: { padding: 22, gap: 10 },
  heroIconRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: '600', lineHeight: 21 },
  statRow: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    marginBottom: 16,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statSep: { width: 1, alignSelf: 'stretch' },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLbl: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  btnScan: { borderRadius: 20, overflow: 'hidden', marginBottom: 12 },
  btnRun: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  btnScanTxt: { color: '#E0E7FF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  btnRunTxt: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
  legal: { fontSize: 11, fontWeight: '600', lineHeight: 16, textAlign: 'center' },
});
