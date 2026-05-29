import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useRouter, useFocusEffect } from 'expo-router';
import { ListFilter } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { useRequireProFeature } from '../_lib/useRequireProFeature';
import { setDuplicateSwiperPayload, type SwiperAssetPayload } from './duplicateNavPayload';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');
const GAP = 16;
const PAD = 16;
const ROW_GAP = 20;
const CELL = (width - PAD * 2 - GAP) / 2;

function clusterDuplicates(assets: MediaLibrary.Asset[]): MediaLibrary.Asset[][] {
  const sorted = [...assets].sort((a, b) => a.creationTime - b.creationTime);
  const groups: MediaLibrary.Asset[][] = [];
  let cur: MediaLibrary.Asset[] = [];
  const MAX_GAP_MS = 2800;
  for (const a of sorted) {
    if (a.mediaType !== 'photo') continue;
    if (cur.length === 0) {
      cur = [a];
      continue;
    }
    const prev = cur[cur.length - 1];
    const gap = a.creationTime - prev.creationTime;
    const sameDims = a.width === prev.width && a.height === prev.height;
    if (sameDims && gap <= MAX_GAP_MS && gap >= 0) cur.push(a);
    else {
      if (cur.length >= 2) groups.push([...cur]);
      cur = [a];
    }
  }
  if (cur.length >= 2) groups.push(cur);
  groups.sort((x, y) => y.length - x.length);
  return groups;
}

function mapToSwiperPayload(list: MediaLibrary.Asset[]): SwiperAssetPayload[] {
  return list.map(a => ({
    id: a.id,
    uri: a.uri,
    width: a.width,
    height: a.height,
    duration: a.duration,
    mediaType: a.mediaType === 'video' ? 'video' : 'photo',
    creationTime: a.creationTime,
    sizeMB: a.mediaType === 'video'
      ? +(Math.max(0.4, a.duration) * 0.38).toFixed(2)
      : +((a.width * a.height) * 0.00000045).toFixed(2),
    device: Platform.OS === 'ios' ? 'iPhone' : 'Android',
    dateStr: new Date(a.creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }));
}

function StackCell({ uris, count, onPress }: { uris: string[]; count: number; onPress: () => void }) {
  const layers = uris.slice(0, 3);
  const backToFront = [...layers].reverse();
  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.stackArea}>
        {backToFront.map((uri, i) => (
          <View
            key={`${uri}-${i}`}
            style={[
              styles.stackCard,
              {
                transform: [{ translateX: -i * 6 }, { translateY: -i * 5 }],
                zIndex: i,
              },
            ]}
          >
            <Image source={{ uri }} style={styles.stackImg} contentFit="cover" />
          </View>
        ))}
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DuplicatesScreen() {
  useRequireProFeature();
  const router = useRouter();
  const goBack = useExploreAwareBack();
  const { theme } = useTheme();
  const [groups, setGroups] = useState<MediaLibrary.Asset[][]>([]);
  const [loading, setLoading] = useState(true);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPressedKey(null);
    }, []),
  );

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setGroups([]);
        setLoading(false);
        return;
      }
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 500,
        mediaType: 'photo',
        sortBy: 'creationTime',
      });
      setGroups(clusterDuplicates(assets));
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void scan();
  }, [scan]);

  const openGroup = (g: MediaLibrary.Asset[], visualKey: string) => {
    setPressedKey(visualKey);
    setDuplicateSwiperPayload(mapToSwiperPayload(g));
    const duplicateKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    router.push({
      pathname: '/dump',
      params: { mode: 'duplicates', duplicateKey },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader
          variant="detail"
          onBack={goBack}
          endSlot={
            <TouchableOpacity
              style={[styles.hBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}
              onPress={() => Alert.alert('How we group', 'We cluster same-size shots captured within a few seconds — typical burst or reshoot patterns. This is a fast on-device guess, not a pixel-perfect match.')}
            >
              <ListFilter size={20} color={theme.text} />
            </TouchableOpacity>
          }
          subtitle="Duplicates · on-device clusters"
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.scan, { color: theme.textSub }]}>SCANNING LIBRARY…</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.empty, { color: theme.text }]}>No duplicate-style clusters found.</Text>
            <Text style={[styles.emptySub, { color: theme.textSub }]}>Try again after taking burst photos or similar shots.</Text>
            <TouchableOpacity style={[styles.retry, { backgroundColor: theme.text }]} onPress={() => void scan()}>
              <Text style={[styles.retryTxt, { color: theme.bg }]}>RESCAN</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(_, i) => `g-${i}`}
            numColumns={2}
            columnWrapperStyle={{ gap: GAP, paddingHorizontal: PAD, marginBottom: ROW_GAP }}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 12 }}
            renderItem={({ item, index }) => {
              const key = `${index}-${item[0]?.id ?? ''}`;
              const selected = pressedKey === key;
              return (
                <View
                  style={[
                    styles.cellWrap,
                    { backgroundColor: theme.bg2, borderColor: theme.border },
                    selected && styles.cellWrapSelected,
                  ]}
                >
                  <StackCell
                    uris={item.map(a => a.uri)}
                    count={item.length}
                    onPress={() => openGroup(item, key)}
                  />
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  scan: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  empty: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center' },
  retry: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 20 },
  retryTxt: { fontWeight: '900', letterSpacing: 1 },
  cell: { width: CELL },
  cellWrap: {
    width: CELL,
    borderRadius: 22,
    padding: 8,
    marginBottom: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cellWrapSelected: {
    backgroundColor: 'rgba(255,0,85,0.12)',
    borderWidth: 2,
    borderColor: '#FF0055',
  },
  stackArea: { width: CELL, height: CELL * 1.12, position: 'relative' },
  stackCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CELL,
    height: CELL * 1.08,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ddd',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  stackImg: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    left: 10,
    bottom: 14,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 20,
  },
  badgeTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
