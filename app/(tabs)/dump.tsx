import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bookmark, ChevronRight, Heart, Info, RotateCcw, Sparkles, Trash2, X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { takeDuplicateSwiperPayload } from './duplicateNavPayload';
import { useTheme } from './ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { addBookmark } from '../_lib/bookmarks';
import { initMobileAds, showInterstitialAd, showRewardedAdDetailed } from '../_lib/ads/admob';
import {
  fetchAssetsPaged,
  fetchDeepCleanCandidates,
  fetchRandomVaultAssets,
  mapAssetToSwiper,
  monthRange,
  SWIPE_MEDIA_TYPES,
} from '../_lib/mediaArchive';
import { recordUserStatsDeletion } from '../_lib/userStatsSupabase';

const { width, height } = Dimensions.get('window');
const SWIPES_PER_INTERSTITIAL = 30;
const REWARDED_SWIPE_BONUS = 20;

function MediaCard({ card, cardW, cardH }: { card: any; cardW: number; cardH: number }) {
  return (
    <View style={{ width: cardW, height: cardH, borderRadius: 22, overflow: 'hidden', backgroundColor: '#111' }}>
      <Image source={{ uri: card.uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <View
        pointerEvents="none"
        style={{ ...StyleSheet.absoluteFillObject, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
      />
    </View>
  );
}

// ─── DELETE QUEUE MODAL ──────────────────────────────────────────────
function DeleteQueueModal({ visible, queue, onUndo, onConfirm, onClose }: any) {
  const { theme, t } = useTheme();
  const slideAnim = useRef(new Animated.Value(height)).current;
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : height, friction: 14, tension: 80, useNativeDriver: true }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <Animated.View style={{ height: height * 0.88, borderTopLeftRadius: 36, borderTopRightRadius: 36, backgroundColor: theme.bg, overflow: 'hidden', transform: [{ translateY: slideAnim }] }}>
          <LinearGradient colors={[theme.bg3, theme.bg]} style={{ paddingTop: 16, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 }}>
              <View>
                <Text style={{ color: theme.text, fontSize: 24, fontWeight: '900' }}>{t.deleteQueue}</Text>
                <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                  {queue.length} {t.photos.toLowerCase()} · {queue.reduce((a: number, p: any) => a + (p.sizeMB || 0), 0).toFixed(1)} MB
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bg3, justifyContent: 'center', alignItems: 'center' }}>
                <X size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 10, backgroundColor: theme.bg2, padding: 12, borderRadius: 14 }}>
            <Sparkles size={12} color="#FFD600" />
            <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600' }}>{t.rescueHint}</Text>
          </View>
          <FlatList
            data={queue}
            numColumns={3}
            keyExtractor={(item: any) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }: any) => (
              <TouchableOpacity style={{ width: (width - 36) / 3, height: (width - 36) / 3, margin: 2, borderRadius: 12, overflow: 'hidden' }} onPress={() => onUndo(item.id)}>
                <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.accentSoft, justifyContent: 'center', alignItems: 'center' }}>
                  <RotateCcw size={18} color="#FFF" />
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={{ padding: 16, paddingBottom: 34, flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 20, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 }} onPress={onClose}>
              <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '900', letterSpacing: 1 }}>{t.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 2, borderRadius: 20, overflow: 'hidden' }} onPress={onConfirm} disabled={queue.length === 0}>
              <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>{t.deleteAll} ({queue.length})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────
export default function SwiperScreen() {
  const { theme, useSwipe, swipesLeft, isPro, openSubscription, t, user, addBonusSwipes } = useTheme();
  const { router: _r } = (() => { try { return require('expo-router'); } catch { return { router: null }; } })();
  const swipeCounterRef = useRef(0);
  const [rewardBusy, setRewardBusy] = useState(false);

  useEffect(() => {
    void initMobileAds();
  }, []);

  const maybeShowInterstitialForSwipe = () => {
    if (isPro) return;
    swipeCounterRef.current += 1;
    if (swipeCounterRef.current % SWIPES_PER_INTERSTITIAL !== 0) return;
    void showInterstitialAd();
  };

  const watchRewardedForSwipes = async () => {
    if (rewardBusy) return;
    setRewardBusy(true);
    try {
      const rewarded = await showRewardedAdDetailed(async () => {
        await addBonusSwipes(REWARDED_SWIPE_BONUS);
      });
      if (rewarded.ok) {
        Alert.alert('Bonus unlocked', `+${REWARDED_SWIPE_BONUS} swipes added.`);
      } else {
        Alert.alert('Ad not available', rewarded.error);
      }
    } finally {
      setRewardBusy(false);
    }
  };

  const _handleOutOfSwipes = () => {
    if (isPro) return;
    // Free users: show choice between subscribe or spin wheel
    const { Alert } = require('react-native');
    Alert.alert(
      '🎰 Out of Swipes!',
      'You\'ve used your 100 free swipes this week. Get more now!',
      [
        { text: 'Subscribe for Unlimited', style: 'default', onPress: () => openSubscription() },
        { text: rewardBusy ? 'Loading Ad…' : `Watch Ad (+${REWARDED_SWIPE_BONUS} swipes)`, onPress: () => { void watchRewardedForSwipes(); } },
        { text: 'Spin for Swipes 🎡', onPress: () => { const { router } = require('expo-router'); router.push('/spin-wheel'); } },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string; year?: string; mode?: string; duplicateKey?: string }>();
  const swiperRef = useRef<any>(null);
  const pendingBookmarkRef = useRef(false);
  const insets = useSafeAreaInsets();

  const deleteFlash = useRef(new Animated.Value(0)).current;
  const keepFlash   = useRef(new Animated.Value(0)).current;
  const counterScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const infoSlide   = useRef(new Animated.Value(height)).current;

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deleteQueue, setDeleteQueue] = useState<any[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(0);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number | null }>({
    loaded: 0,
    total: null,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setCurrentIndex(0);
      setDeleteQueue([]);
      setSessionSaved(0);
      setLoadProgress({ loaded: 0, total: null });

      const dupMode = typeof params.mode === 'string' && params.mode.toLowerCase() === 'duplicates';
      if (dupMode) {
        const preset = takeDuplicateSwiperPayload();
        if (!mounted) return;
        if (preset?.length) {
          const photoOnly = preset.filter((p) => p.mediaType !== 'video');
          setPhotos(photoOnly as any[]);
          setLoading(false);
          return;
        }
        setPhotos([]);
        setLoading(false);
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (!mounted) return;
      if (status !== 'granted') { setLoading(false); return; }

      const mode = typeof params.mode === 'string' ? params.mode.toLowerCase() : '';
      const deepClean = mode === 'deep_clean';
      const randomVault = mode === 'random_vault';

      try {
        let assets: Awaited<ReturnType<typeof fetchAssetsPaged>> = [];

        if (randomVault) {
          assets = await fetchRandomVaultAssets((loaded, total) => {
            if (mounted) setLoadProgress({ loaded, total });
          });
        } else if (deepClean) {
          assets = await fetchDeepCleanCandidates((loaded, total) => {
            if (mounted) setLoadProgress({ loaded, total });
          });
        } else {
          const rangeOpts: Parameters<typeof fetchAssetsPaged>[0] = {
            sortBy: 'creationTime',
            mediaType: SWIPE_MEDIA_TYPES,
          };

          if (params.month && params.year) {
            const monthNames = [
              'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
              'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
            ];
            const monthIdx = monthNames.indexOf(String(params.month).toUpperCase());
            if (monthIdx !== -1) {
              const y = parseInt(String(params.year), 10);
              const { createdAfter, createdBefore } = monthRange(y, monthIdx);
              rangeOpts.createdAfter = createdAfter;
              rangeOpts.createdBefore = createdBefore;
            }
          }

          assets = await fetchAssetsPaged(rangeOpts, (loaded, total) => {
            if (mounted) setLoadProgress({ loaded, total });
          });
        }

        if (!mounted) return;

        setPhotos(
          assets
            .filter((a) => a.mediaType !== 'video')
            .map(mapAssetToSwiper),
        );
      } catch {
        if (mounted) setPhotos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [params.month, params.year, params.mode, params.duplicateKey]);

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: photos.length ? currentIndex / photos.length : 0, useNativeDriver: false, friction: 8 }).start();
  }, [currentIndex, photos.length]);

  useEffect(() => {
    if (deleteQueue.length > 0) {
      Animated.sequence([
        Animated.spring(counterScale, { toValue: 1.5, useNativeDriver: true, friction: 4 }),
        Animated.spring(counterScale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [deleteQueue.length]);

  const flashScreen = (side: 'delete' | 'keep') => {
    const anim = side === 'delete' ? deleteFlash : keepFlash;
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 60, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0, duration: 350, useNativeDriver: false }),
    ]).start();
  };

  const handleSwipedLeft = (idx: number) => {
    if (!useSwipe()) { _handleOutOfSwipes(); return; }
    pendingBookmarkRef.current = false;
    setDeleteQueue(prev => [...prev, photos[idx]]);
    setSessionSaved(prev => +(prev + (photos[idx]?.sizeMB || 0)).toFixed(2));
    setCurrentIndex(prev => prev + 1);
    flashScreen('delete');
    maybeShowInterstitialForSwipe();
  };

  const handleSwipedRight = (idx: number) => {
    if (!useSwipe()) {
      pendingBookmarkRef.current = false;
      _handleOutOfSwipes();
      return;
    }
    const p = photos[idx];
    if (pendingBookmarkRef.current && p) {
      void addBookmark({
        id: p.id,
        uri: p.uri,
        width: p.width,
        height: p.height,
        mediaType: 'photo',
        creationTime: p.creationTime,
        dateStr: p.dateStr,
        sizeMB: p.sizeMB,
      });
      pendingBookmarkRef.current = false;
    }
    setCurrentIndex(prev => prev + 1);
    flashScreen('keep');
    maybeShowInterstitialForSwipe();
  };

  const handleBookmarkPress = () => {
    if (loading || currentIndex >= photos.length || photos.length === 0) return;
    if (!useSwipe()) {
      _handleOutOfSwipes();
      return;
    }
    pendingBookmarkRef.current = true;
    swiperRef.current?.swipeRight();
  };

  const handleUndo = () => {
    if (currentIndex === 0) return;
    if (deleteQueue.length > 0) {
      const last = deleteQueue[deleteQueue.length - 1];
      setDeleteQueue(prev => prev.slice(0, -1));
      setSessionSaved(prev => Math.max(0, +(prev - (last?.sizeMB || 0)).toFixed(2)));
    }
    swiperRef.current?.swipeBack();
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleUndoSingle = (id: string) => {
    setDeleteQueue(prev => {
      const item = prev.find((p: any) => p.id === id);
      if (item) setSessionSaved(s => Math.max(0, +(s - (item.sizeMB || 0)).toFixed(2)));
      return prev.filter((p: any) => p.id !== id);
    });
  };

  const handleConfirmDelete = async () => {
    const ids = deleteQueue.map(p => p.id);
    const count = ids.length;
    if (count === 0) return;
    try {
      await MediaLibrary.deleteAssetsAsync(ids);
      const mb = deleteQueue.reduce((a: number, p: any) => a + (p.sizeMB || 0), 0);
      const bytes = Math.round(mb * 1024 * 1024);
      await recordUserStatsDeletion({
        userId: user?.uid ?? '',
        itemsCount: count,
        bytesCleared: bytes,
        source: 'dump',
      });
      setDeleteQueue([]);
      setShowQueue(false);
      Alert.alert('Done!', `${count} item(s) removed from your library.`);
    } catch {
      Alert.alert('Error', 'Could not delete items.');
    }
  };

  const toggleInfo = (show: boolean) => {
    setShowInfo(show);
    Animated.spring(infoSlide, { toValue: show ? 0 : height, useNativeDriver: true, friction: 12 }).start();
  };

  const dupMode = Boolean(params.mode && String(params.mode).toLowerCase() === 'duplicates');
  const isDupMissing = !loading && dupMode && photos.length === 0;
  const isDone = !loading && !isDupMissing && currentIndex >= photos.length && photos.length > 0;

  const modeKey = typeof params.mode === 'string' ? params.mode.toLowerCase() : '';
  const randomVault = modeKey === 'random_vault';

  const monthLabel =
    dupMode
      ? 'DUPLICATE SET'
      : randomVault
        ? 'LOST & FOUND'
        : params.month
          ? `${params.month} ${params.year ?? ''}`
          : 'ALL MEDIA';

  const headerBlock = 80;
  const bottomBlock = 96 + insets.bottom;
  const CARD_W = width - 24;
  const CARD_H = Math.max(260, height - insets.top - headerBlock - bottomBlock);

  const totalShown = photos.length;
  const progressPct = totalShown
    ? Math.min(100, Math.round((currentIndex / Math.max(totalShown, 1)) * 100))
    : 0;

  const headerSubtitle = loading
    ? loadProgress.total != null
      ? `Loading ${loadProgress.loaded} / ${loadProgress.total}…`
      : loadProgress.loaded > 0
        ? `Loading ${loadProgress.loaded}…`
        : 'Loading…'
    : dupMode
      ? (totalShown
        ? `Duplicates · ${totalShown} in set · ${currentIndex + 1}/${totalShown}`
        : 'Duplicates')
      : `${monthLabel} · ${totalShown} photos · ${currentIndex + 1}/${totalShown}${
        totalShown ? ` · ${progressPct}%` : ''
      }${!isPro ? ` · ${swipesLeft} swipes` : ''}`;

  const renderCard = (card: any) => {
    if (!card) return null;
    return <MediaCard card={card} cardW={CARD_W} cardH={CARD_H} />;
  };

  const deleteFlashBg = deleteFlash.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', theme.accentSoft] });
  const keepFlashBg   = keepFlash.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(52,211,153,0.18)'] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaProvider>
      <View style={[ms.root, { backgroundColor: theme.bg }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: deleteFlashBg, zIndex: 20 }]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: keepFlashBg, zIndex: 20 }]} />

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <AppHeader
            variant="detail"
            onBack={() => router.back()}
            endSlot={(
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={[ms.iconBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}
                  onPress={handleUndo}
                  disabled={currentIndex === 0}
                  activeOpacity={0.85}
                >
                  <RotateCcw size={17} color={currentIndex === 0 ? theme.textMuted : theme.textSub} />
                </TouchableOpacity>
                <Animated.View style={{ transform: [{ scale: counterScale }] }}>
                  <TouchableOpacity
                    style={[ms.trashBtn, { backgroundColor: deleteQueue.length > 0 ? theme.accentSoft : theme.bg2, borderColor: deleteQueue.length > 0 ? theme.accent : theme.border }]}
                    onPress={() => deleteQueue.length > 0 && setShowQueue(true)}
                    activeOpacity={0.85}
                  >
                    <Trash2 size={18} color={deleteQueue.length > 0 ? theme.accent : theme.textMuted} />
                    {deleteQueue.length > 0 && (
                      <View style={[ms.badge, { backgroundColor: theme.accent }]}><Text style={ms.badgeText}>{deleteQueue.length}</Text></View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
            subtitle={headerSubtitle}
          />

          {/* SWIPER AREA */}
          <View style={[ms.swiperArea, { position: 'relative' }]}>
            {loading ? (
              <View style={ms.loader}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[ms.loadingText, { color: theme.textMuted }]}>
                  {dupMode ? 'OPENING SET…' : 'SCANNING GALLERY...'}
                </Text>
              </View>
            ) : isDupMissing ? (
              <View style={[ms.loader, { paddingHorizontal: 28 }]}>
                <Text style={{ color: theme.text, fontWeight: '900', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
                  No duplicate set loaded
                </Text>
                <Text style={{ color: theme.textSub, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 18 }}>
                  Go back to Duplicates and tap a stack again. Each tap starts a fresh session.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/duplicates')}
                  style={{ backgroundColor: theme.accent, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 20 }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '900', letterSpacing: 1 }}>BACK TO DUPLICATES</Text>
                </TouchableOpacity>
              </View>
            ) : isDone ? (
              <DoneScreen
                deleteCount={deleteQueue.length}
                savedMB={sessionSaved}
                onReview={() => setShowQueue(true)}
                theme={theme}
                duplicateMode={dupMode}
              />
            ) : (
              <>
                <Swiper
                  key={`${String(params.mode)}-${String(params.month)}-${String(params.year)}-${String(params.duplicateKey ?? '')}-${photos.length}`}
                  ref={swiperRef}
                  cards={photos}
                  renderCard={renderCard}
                  onSwipedLeft={handleSwipedLeft}
                  onSwipedRight={handleSwipedRight}
                  stackSize={4}
                  stackSeparation={14}
                  stackScale={6}
                  backgroundColor="transparent"
                  disableTopSwipe disableBottomSwipe
                  cardVerticalMargin={0}
                  cardHorizontalMargin={12}
                  animateOverlayLabelsOpacity
                  overlayOpacityHorizontalThreshold={10}
                  overlayLabels={{
                    left: {
                      element: (
                        <View style={{ transform: [{ rotate: '-8deg' }] }}>
                          <LinearGradient colors={[theme.accent, theme.accent2]} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, borderWidth: 2, borderColor: theme.accent }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 }}>TRASH</Text>
                          </LinearGradient>
                        </View>
                      ),
                      style: { wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 26, marginLeft: 14 } },
                    },
                    right: {
                      element: (
                        <View style={{ transform: [{ rotate: '8deg' }] }}>
                          <LinearGradient colors={['#00C87A', '#00FFA3']} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, borderWidth: 2, borderColor: '#00FFA3' }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 }}>KEEP</Text>
                          </LinearGradient>
                        </View>
                      ),
                      style: { wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 26, marginRight: 14 } },
                    },
                  }}
                />
                <View
                  style={ms.cardActions}
                  pointerEvents="box-none"
                >
                  <TouchableOpacity
                    style={ms.floatBtn}
                    onPress={handleBookmarkPress}
                    activeOpacity={0.88}
                    accessibilityLabel="Bookmark and keep"
                  >
                    <Bookmark size={20} color="#FFF" strokeWidth={2.2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={ms.floatBtn}
                    onPress={() => toggleInfo(true)}
                    activeOpacity={0.88}
                    accessibilityLabel="Media details"
                  >
                    <Info size={20} color="#FFF" strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* BOTTOM BAR */}
          <View style={[ms.bottomBar, { backgroundColor: theme.bg, borderTopColor: theme.border, paddingBottom: 12 + insets.bottom }]}>
            <View style={[ms.progressTrack, { backgroundColor: theme.bg3 ?? theme.bg2 }]}>
              <Animated.View style={[ms.progressFill, { width: progressWidth }]}>
                <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 2 }} />
              </Animated.View>
            </View>
            <View style={ms.actionRow}>
              <View style={[ms.miniStat, { backgroundColor: theme.bg2, borderColor: theme.accentSoft }]}>
                <Trash2 size={10} color={theme.accent} />
                <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '900' }}>{deleteQueue.length}</Text>
              </View>
              <TouchableOpacity style={[ms.dumpBtn, deleteQueue.length === 0 && { opacity: 0.35 }]} disabled={deleteQueue.length === 0} onPress={() => setShowQueue(true)} activeOpacity={0.85}>
                <LinearGradient colors={deleteQueue.length > 0 ? [theme.accent, theme.accent2] : [theme.bg2, theme.bg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ms.dumpBtnGrad}>
                  <Trash2 size={15} color={deleteQueue.length > 0 ? '#FFF' : theme.textMuted} />
                  <Text style={{ color: deleteQueue.length > 0 ? '#FFF' : theme.textMuted, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 }}>
                    {t.dump}{deleteQueue.length > 0 ? ` (${deleteQueue.length})` : ''}
                  </Text>
                  {deleteQueue.length > 0 && <ChevronRight size={13} color="#FFF" />}
                </LinearGradient>
              </TouchableOpacity>
              <View style={[ms.miniStat, { backgroundColor: theme.bg2, borderColor: '#00FFA340' }]}>
                <Heart size={10} color="#00FFA3" fill="#00FFA3" />
                <Text style={{ color: '#00FFA3', fontSize: 11, fontWeight: '900' }}>{currentIndex - deleteQueue.length}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* INFO PANEL */}
        <Animated.View style={[ms.infoPanel, { backgroundColor: theme.bg2, transform: [{ translateY: infoSlide }] }]}>
          <View style={[ms.infoHandle, { backgroundColor: theme.border }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900', letterSpacing: 2 }}>MEDIA DETAILS</Text>
            <TouchableOpacity onPress={() => toggleInfo(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.bg3 ?? theme.bg, justifyContent: 'center', alignItems: 'center' }}>
              <X size={16} color={theme.textSub} />
            </TouchableOpacity>
          </View>
          {photos[currentIndex] && (
            <>
              {[
                { l: 'TYPE', v: 'PHOTO', c: '#00E5FF' },
                { l: 'SIZE', v: `${photos[currentIndex].sizeMB} MB`, c: '#FFD600' },
                { l: 'DATE', v: photos[currentIndex].dateStr, c: '#BF5AF2' },
                { l: 'DEVICE', v: photos[currentIndex].device, c: '#00E5FF' },
                { l: 'DIMENSIONS', v: `${photos[currentIndex].width} × ${photos[currentIndex].height}`, c: theme.accent },
              ].map(({ l, v, c }) => (
                <View key={l} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 14 }}>
                  <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: c }} />
                  <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 2, flex: 1 }}>{l}</Text>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{v}</Text>
                </View>
              ))}
            </>
          )}
        </Animated.View>

        <DeleteQueueModal visible={showQueue} queue={deleteQueue} onUndo={handleUndoSingle} onConfirm={handleConfirmDelete} onClose={() => setShowQueue(false)} />
      </View>
    </SafeAreaProvider>
  );
}

function DoneScreen({ deleteCount, savedMB, onReview, theme, duplicateMode }: any) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 16, paddingHorizontal: 30 }}>
      <Animated.View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: theme.accentSoft, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', transform: [{ scale: pulse }] }}>
        <Text style={{ fontSize: 52 }}>🎉</Text>
      </Animated.View>
      <Text style={{ color: theme.text, fontSize: 40, fontWeight: '900', letterSpacing: -2 }}>ALL DONE!</Text>
      <Text style={{ color: theme.textSub, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{deleteCount} item(s) in queue</Text>
      <Text style={{ color: theme.success, fontSize: 24, fontWeight: '900' }}>{savedMB} MB freed</Text>
      {duplicateMode && (
        <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
          Finished this set. Open Duplicates and tap another stack — each pick loads a new session right away.
        </Text>
      )}
      {deleteCount > 0 && (
        <TouchableOpacity style={{ borderRadius: 26, overflow: 'hidden', width: '100%', marginTop: 8 }} onPress={onReview}>
          <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 18, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>REVIEW & DELETE ({deleteCount})</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingRight: 52, borderBottomWidth: 1 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  headerSub: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 2 },
  dupRibbon: { paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  dupRibbonTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  dupRibbonSub: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
  dupRibbonId: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  trashBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  swiperArea: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  cardActions: {
    position: 'absolute',
    right: 14,
    bottom: 22,
    alignItems: 'center',
    gap: 12,
    zIndex: 50,
  },
  floatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: { alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  hintWrap: { position: 'absolute', bottom: 16, left: 18, right: 18, zIndex: 99 },
  hintGrad: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 16 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  hintText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  swipeCounter: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, zIndex: 99, borderWidth: 1 },
  swipeCountText: { fontSize: 11, fontWeight: '700' },
  bottomBar: { paddingBottom: 12, borderTopWidth: 1 },
  progressTrack: { height: 3, marginHorizontal: 20, marginTop: 10, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginTop: 14 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18 },
  dumpBtn: { flex: 1, marginHorizontal: 10, borderRadius: 24, overflow: 'hidden' },
  dumpBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15 },
  infoPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, padding: 26, paddingBottom: 50, zIndex: 200 },
  infoHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
});

