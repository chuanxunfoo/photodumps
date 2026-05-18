import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Bookmark, Heart, Sparkles } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { type BookmarkEntry, getBookmarks, removeBookmark } from '../_lib/bookmarks';
import { resolveTypeface, useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');
const PAD = 14;
const GAP = 10;
const COLS = 2;
const CELL = (width - PAD * 2 - GAP) / COLS;

export default function ExploreBookmarksScreen() {
  const goBack = useExploreAwareBack();
  const { theme } = useTheme();
  const fonts = resolveTypeface(theme);
  const [items, setItems] = useState<BookmarkEntry[]>([]);

  const refresh = useCallback(() => {
    void getBookmarks().then(setItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onRemove = (item: BookmarkEntry) => {
    Alert.alert('Remove bookmark?', 'This only removes it from your saved list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void removeBookmark(item.id).then(refresh);
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={
          theme.isDark
            ? ['#1a0a24', theme.bg, '#0a1420']
            : ['#FFF0FB', theme.bg, '#F0F7FF']
        }
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          variant="detail"
          onBack={goBack}
          subtitle={`${items.length} saved · tap & hold to remove`}
        />

        {items.length === 0 ? (
          <View style={styles.empty}>
            <LinearGradient
              colors={['#FF6B9D', '#C084FC', '#60A5FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyOrb}
            >
              <Bookmark size={36} color="#FFF" strokeWidth={2} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>
              Your little gallery
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
              While swiping, tap the bookmark on a photo to keep it and send it here — soft, safe, and all yours.
            </Text>
            <View style={styles.emptyChips}>
              <View style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
                <Heart size={12} color="#FF6B9D" fill="#FF6B9D" />
                <Text style={[styles.chipTxt, { color: theme.textSub }]}>Keeps stay in library</Text>
              </View>
              <View style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
                <Sparkles size={12} color="#C084FC" />
                <Text style={[styles.chipTxt, { color: theme.textSub }]}>Bookmarks land here</Text>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            numColumns={COLS}
            columnWrapperStyle={{ gap: GAP, paddingHorizontal: PAD }}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 12, gap: GAP }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() => onRemove(item)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.bg2,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Image source={{ uri: item.uri }} style={styles.img} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.75)']}
                  style={styles.tileGrad}
                />
                <View style={styles.tileMeta}>
                  <Text style={styles.tileDate} numberOfLines={1}>
                    {item.dateStr}
                  </Text>
                  <Text style={styles.tileSize}>{item.sizeMB} MB</Text>
                </View>
                <View style={styles.cornerHeart}>
                  <Heart size={14} color="#FFF" fill="rgba(255,255,255,0.35)" />
                </View>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  empty: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  emptyOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#C084FC',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyChips: { gap: 8, marginTop: 8, width: '100%' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipTxt: { fontSize: 12, fontWeight: '700' },
  tile: {
    width: CELL,
    height: CELL * 1.12,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  img: { ...StyleSheet.absoluteFillObject },
  tileGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
  },
  tileMeta: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    gap: 2,
  },
  tileDate: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  tileSize: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700' },
  cornerHeart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
