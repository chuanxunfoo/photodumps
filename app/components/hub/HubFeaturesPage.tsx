import { useFocusEffect } from 'expo-router';
import {
  BarChart2, Camera, Crown, Layers2, Scissors, Sticker, Zap,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubscriptionModal } from '../../(tabs)/SubscriptionModal';
import { hubPush, type HubChildRoute } from '../../_lib/exploreBack';
import { getExploreCopy } from '../../_lib/localeContent';
import { resolveTypeface, useTheme } from '../../(tabs)/ThemeContext';
import { HubPageChrome } from './HubPageChrome';
import {
  GlowBanner, SUBSCRIBE_BANNER_GRADIENT, assignUniqueBannerGradients, exploreBannerVibe,
} from './exploreUi';
import { hubPageStyles as es } from './hubPageStyles';

const FEATURE_SLOTS = [6, 16, 15, 7, 2, 10, 0] as const;

type Props = { active?: boolean };

export default function HubFeaturesPage({ active = false }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isPro, isAdmin, openSubscription, themeId, language } = useTheme();
  const ex = getExploreCopy(language);
  const fonts = resolveTypeface(theme);
  const vibe = exploreBannerVibe(themeId, theme.isDark);
  const bannerColors = useMemo(() => assignUniqueBannerGradients(vibe, [...FEATURE_SLOTS]), [vibe]);
  const color = (slot: number) => bannerColors.get(slot);
  const [showSub, setShowSub] = useState(false);
  const openSubModal = useCallback(() => setShowSub(true), []);
  const openSubRef = useRef(openSubscription);
  openSubRef.current = openSubscription;

  useFocusEffect(
    useCallback(() => {
      if (!active || isPro || isAdmin) return;
      const t = setTimeout(() => openSubRef.current(), 550);
      return () => clearTimeout(t);
    }, [active, isPro, isAdmin]),
  );

  const gatePro = (fn: () => void) => {
    if (!isPro && !isAdmin) {
      openSubscription();
      return;
    }
    fn();
  };

  const go = (pathname: HubChildRoute) => () => hubPush(pathname, 'features');

  return (
    <View style={[es.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <HubPageChrome active={active} sectionLabel="Features" onSubscriptionModal={() => setShowSub(true)}>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 40 }}
          >
            <View style={es.sectionHead}>
              <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionPro}</Text>
              <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{ex.sectionProHint}</Text>
            </View>
            <View style={es.section}>
              <GlowBanner
                slot={6}
                vibe={vibe}
                theme={theme}
                fonts={fonts}
                title={ex.subscribe}
                subtitle={isPro ? ex.subscribeSubManage : ex.subscribeSubUpgrade}
                colors={SUBSCRIBE_BANNER_GRADIENT}
                subscribeShimmer={!isPro && !isAdmin}
                icon={<Crown size={22} color="#FFF" />}
                onPress={() => { if (isPro || isAdmin) openSubModal(); else openSubscription(); }}
              />
              <GlowBanner slot={16} vibe={vibe} theme={theme} fonts={fonts} colors={color(16)} title={ex.duplicates} subtitle={ex.duplicatesSub} proLock={!isPro && !isAdmin} icon={<Layers2 size={22} color="#FFF" />} onPress={() => gatePro(go('/duplicates'))} />
              <GlowBanner slot={15} vibe={vibe} theme={theme} fonts={fonts} colors={color(15)} title={ex.videoTrim} subtitle={ex.videoTrimSub} proLock={!isPro && !isAdmin} icon={<Scissors size={22} color="#FFF" />} onPress={() => gatePro(go('/explore-trim'))} />
              <GlowBanner slot={7} vibe={vibe} theme={theme} fonts={fonts} colors={color(7)} title={ex.supercut} subtitle={ex.supercutSub} proLock={!isPro && !isAdmin} icon={<Zap size={22} color="#FFF" />} onPress={() => gatePro(go('/supercut'))} />
              <GlowBanner slot={2} vibe={vibe} theme={theme} fonts={fonts} colors={color(2)} title={ex.myStats} subtitle={ex.myStatsSub} proLock={!isPro && !isAdmin} icon={<BarChart2 size={22} color="#FFF" />} onPress={() => gatePro(go('/insights'))} />
              <GlowBanner slot={10} vibe={vibe} theme={theme} fonts={fonts} colors={color(10)} title={ex.stickerStudio} subtitle={ex.stickerStudioSub} proLock={!isPro && !isAdmin} icon={<Sticker size={22} color="#FFF" />} onPress={() => gatePro(go('/sticker-studio'))} />
              <GlowBanner slot={0} vibe={vibe} theme={theme} fonts={fonts} colors={color(0)} title={ex.photobooth} subtitle={ex.photoboothSub} proLock={!isPro && !isAdmin} icon={<Camera size={22} color="#FFF" />} onPress={() => gatePro(go('/photobooth'))} />
            </View>
          </ScrollView>
        </HubPageChrome>
      </SafeAreaView>
      <SubscriptionModal visible={showSub} onClose={() => setShowSub(false)} />
    </View>
  );
}
