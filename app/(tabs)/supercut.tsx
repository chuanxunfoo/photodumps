/**
 * Supercut — one-tap AI-assisted batch cleanup (screenshots + duplicate dimensions heuristic).
 */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import {
  Cpu, ScanLine, Sparkles, Trash2, Zap,
} from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
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
import { estimateAssetBytes, recordUserStatsDeletion } from '../_lib/userStatsSupabase';
import { useTheme } from './ThemeContext';

const { width: W } = Dimensions.get('window');

function estimateMB(a: MediaLibrary.Asset): number {
  return estimateAssetBytes({
    mediaType: a.mediaType === 'video' ? 'video' : 'photo',
    width: a.width,
    height: a.height,
    duration: a.duration,
  }) / (1024 * 1024);
}

export default function SupercutScreen() {
  const goBack = useExploreAwareBack();
  const { theme, language, user } = useTheme();
  const u = getLocaleUi(language);

  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [candidates, setCandidates] = useState<MediaLibrary.Asset[]>([]);
  const [estMB, setEstMB] = useState(0);
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

  const runSupercut = () => {
    if (candidates.length === 0) {
      Alert.alert(u.supercutTitle, u.supercutEmpty);
      return;
    }
    Alert.alert(u.supercutConfirmTitle, `${u.supercutConfirmMsg}\n\n~${estMB.toFixed(0)} MB · ${candidates.length} items`, [
      { text: theme.isDark ? 'Cancel' : 'Cancel', style: 'cancel' },
      {
        text: u.supercutRun,
        style: 'destructive',
        onPress: async () => {
          setRunning(true);
          try {
            const ids = candidates.map((c) => c.id);
            const chunk = 400;
            for (let i = 0; i < ids.length; i += chunk) {
              const slice = ids.slice(i, i + chunk);
              await MediaLibrary.deleteAssetsAsync(slice);
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
          } catch (err) {
            console.warn(err);
            Alert.alert('Error', 'Deletion did not complete.');
          } finally {
            setRunning(false);
          }
        },
      },
    ]);
  };

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] });

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg, '#120018', theme.bg]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
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
                  AI-style scan flags screenshots and same-size burst duplicates. One button clears the batch after you confirm.
                </Text>
              </BlurView>
            </LinearGradient>
          </Animated.View>

          <View style={[styles.statRow, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
            <View style={styles.statCell}>
              <Text style={[styles.statNum, { color: theme.text }]}>{candidates.length}</Text>
              <Text style={[styles.statLbl, { color: theme.textSub }]}>targets</Text>
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
            onPress={runSupercut}
            activeOpacity={0.88}
          >
            <LinearGradient colors={['#FF0055', '#F97316']} style={styles.btnGrad}>
              {running ? <ActivityIndicator color="#fff" /> : <Zap size={22} color="#FFF" />}
              <Text style={styles.btnRunTxt}>{running ? '…' : u.supercutRun}</Text>
              <Trash2 size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.legal, { color: theme.textMuted }]}>
            Heuristic only — review counts before confirming. Nothing is uploaded; deletions are on-device.
          </Text>
        </ScrollView>
      </SafeAreaView>
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
