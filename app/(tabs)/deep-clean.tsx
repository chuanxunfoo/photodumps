import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { Crown, Sparkles, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ticker } from './Ticker';
import { textOnAccent } from '../_lib/themeContrast';
import { useTheme } from './ThemeContext';

const { width, height } = Dimensions.get('window');

type Asset = MediaLibrary.Asset;

function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  return mounted;
}

export default function DeepCleanScreen() {
  const router = useRouter();
  const { theme, isPro, openSubscription, t } = useTheme();

  const mounted = useMountedRef();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const progress = useRef(new Animated.Value(0)).current;

  const numColumns = useMemo(() => {
    // Use as much screen as possible: dense grid for Pro.
    if (!isPro) return 3;
    return width >= 420 ? 5 : 4;
  }, [isPro]);

  const tileSize = useMemo(() => {
    const gap = 2;
    return Math.floor((width - gap * (numColumns - 1)) / numColumns);
  }, [numColumns]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: totalCount ? Math.min(1, scannedCount / totalCount) : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [scannedCount, totalCount]);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (!mounted.current) return;
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      setLoading(false);
      setScanning(true);

      try {
        // First pass: get overall count quickly.
        const initial = await MediaLibrary.getAssetsAsync({
          first: 1,
          mediaType: ['photo'],
          sortBy: 'creationTime',
        });
        if (!mounted.current) return;
        setTotalCount(initial.totalCount ?? null);

        // Stream assets in pages so UI stays responsive.
        const pageSize = 120;
        let after: string | undefined;
        let collected: Asset[] = [];
        let scanned = 0;

        while (mounted.current) {
          const page = await MediaLibrary.getAssetsAsync({
            first: pageSize,
            mediaType: ['photo'],
            sortBy: 'creationTime',
            after,
          });
          collected = collected.concat(page.assets);
          scanned += page.assets.length;

          setAssets(collected);
          setScannedCount(scanned);

          if (!page.hasNextPage) break;
          after = page.endCursor;
        }
      } catch {
        // swallow; user can still exit
      } finally {
        if (mounted.current) setScanning(false);
      }
    })();
  }, [mounted]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!isPro) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              <X size={18} color={theme.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[s.title, { color: theme.text }]}>Deep Clean</Text>
              <Text style={[s.subtitle, { color: theme.textSub }]}>Full-library scan is a Pro feature</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          <View style={[s.paywallCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <View style={s.paywallBadge}>
              <Crown size={18} color="#FFD600" />
              <Text style={s.paywallBadgeText}>PRO</Text>
            </View>
            <Text style={[s.paywallTitle, { color: theme.text }]}>
              Scan your entire gallery
            </Text>
            <Text style={[s.paywallBody, { color: theme.textSub }]}>
              Deep Clean analyzes your whole library and displays everything in a space-efficient grid so you can review faster.
            </Text>
            <TouchableOpacity
              onPress={openSubscription}
              activeOpacity={0.86}
              style={s.paywallBtn}
            >
              <View style={s.paywallBtnInner}>
                <Sparkles size={16} color={textOnAccent(theme)} />
                <Text style={[s.paywallBtnText, { color: textOnAccent(theme) }]}>Upgrade to Pro</Text>
              </View>
            </TouchableOpacity>
            <Text style={[s.paywallFine, { color: theme.textMuted }]}>
              You can still use Monthly Archive for targeted cleanup.
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <Ticker text="DEEP CLEAN • PRO FEATURE • UPGRADE TO UNLOCK" bg="transparent" color={theme.textSub} speed={9000} height={26} fontSize={10} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <X size={18} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[s.title, { color: theme.text }]}>Deep Clean</Text>
            <Text style={[s.subtitle, { color: theme.textSub }]}>
              {scanning ? (totalCount ? `Scanning ${scannedCount}/${totalCount}` : 'Scanning…') : 'Scan complete'}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={[s.progressTrack, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          <Animated.View style={[s.progressFill, { width: progressWidth }]} />
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[s.loadingText, { color: theme.textSub }]}>{t.scanning}</Text>
          </View>
        ) : (
          <FlatList
            data={assets}
            key={numColumns}
            numColumns={numColumns}
            keyExtractor={(a) => a.id}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 120 }}
            columnWrapperStyle={{ gap: 2 }}
            renderItem={({ item }) => (
              <View style={{ width: tileSize, height: tileSize, marginBottom: 2, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.bg2 }}>
                <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
            )}
            showsVerticalScrollIndicator={false}
            initialNumToRender={40}
            windowSize={9}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 12, fontWeight: '600' },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF0055',
    borderRadius: 999,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 12, fontWeight: '600' },
  paywallCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginTop: 14,
  },
  paywallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,214,0,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  paywallBadgeText: { color: '#FFD600', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  paywallTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  paywallBody: { fontSize: 13, fontWeight: '600', lineHeight: 20, marginTop: 8 },
  paywallBtn: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#FF0055',
    overflow: 'hidden',
  },
  paywallBtnInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  paywallBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  paywallFine: { marginTop: 12, fontSize: 11, fontWeight: '600', lineHeight: 16 },
});

