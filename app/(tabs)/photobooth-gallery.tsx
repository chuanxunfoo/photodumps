/**
 * Gallery of shots taken with digital camera bodies in photobooth.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { deleteDigiShot, loadDigiShots, type SavedDigiShot } from '../_lib/photobooth/storage';
import { useTheme } from './ThemeContext';

const { width: W } = Dimensions.get('window');
const COL = 2;
const GAP = 10;
const PAD = 14;
const CELL = (W - PAD * 2 - GAP) / COL;

export default function PhotoboothGalleryScreen() {
  const goBack = useExploreAwareBack();
  const router = useRouter();
  const { theme } = useTheme();
  const [shots, setShots] = useState<SavedDigiShot[]>([]);

  const refresh = useCallback(async () => {
    setShots(await loadDigiShots());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onDelete = (id: string) => {
    Alert.alert('Remove from roll?', 'The file stays in your camera roll if you saved it there.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void deleteDigiShot(id).then(refresh),
      },
    ]);
  };

  return (
    <View style={[st.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg, '#0f0a06', theme.bg]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader variant="detail" onBack={goBack} subtitle="Digital cam roll" />

        {shots.length === 0 ? (
          <View style={st.empty}>
            <Text style={[st.emptyTitle, { color: theme.text }]}>No shots yet</Text>
            <Text style={[st.emptySub, { color: theme.textSub }]}>
              Take photos in Digi Cam — they appear here after you save.
            </Text>
            <TouchableOpacity onPress={() => router.push('/photobooth')} style={st.emptyBtn}>
              <LinearGradient colors={['#FF0055', '#F97316']} style={st.emptyBtnGrad}>
                <Text style={st.emptyBtnTxt}>OPEN DIGI CAM</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={shots}
            keyExtractor={(item) => item.id}
            numColumns={COL}
            contentContainerStyle={{ padding: PAD, paddingBottom: 40 }}
            columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
            renderItem={({ item }) => (
              <View style={[st.cell, { width: CELL, height: CELL * 1.25, borderColor: theme.border }]}>
                <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={st.cellFoot}>
                  <Text style={st.cellBrand} numberOfLines={1}>{item.rigId.toUpperCase()}</Text>
                </LinearGradient>
                <TouchableOpacity style={st.del} onPress={() => onDelete(item.id)}>
                  <Trash2 size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '900' },
  emptySub: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 12, borderRadius: 18, overflow: 'hidden' },
  emptyBtnGrad: { paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnTxt: { color: '#FFF', fontWeight: '900', letterSpacing: 1.2, fontSize: 12 },
  cell: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, backgroundColor: '#111' },
  cellFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8 },
  cellBrand: { color: '#FF9500', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  del: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,0,85,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
