import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, BookmarkIcon, CircleDot, Crown, FileText, Globe, HelpCircle, LifeBuoy, Palette, Settings, Star,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubscriptionModal } from '../../(tabs)/SubscriptionModal';
import { hubPush } from '../../_lib/exploreBack';
import { getExploreCopy } from '../../_lib/localeContent';
import { PREMIUM_THEMES, resolveTypeface, useTheme } from '../../(tabs)/ThemeContext';
import { HubPageChrome } from './HubPageChrome';
import { SupportModal } from './SupportModal';
import {
  GlowBanner, LanguageModal, PRO_LOOK_CARD_W, PRO_LOOK_SNAP, ThemeModal, ThemeShowcaseCard,
  assignUniqueBannerGradients, exploreBannerVibe,
} from './exploreUi';
import { hubPageStyles as es } from './hubPageStyles';

const EUGENE_PAPER = require('../../assets/explore/eugene-paper.png');
const PALM_KL = require('../../assets/explore/palm-kl.png');

const GENERAL_SLOTS = [1, 8, 17, 4, 3, 5, 18, 9, 11, 13, 14] as const;

type Props = { active?: boolean };

export default function HubGeneralsPage({ active = false }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isPro, isAdmin, openSubscription, themeId, setThemeId, language } = useTheme();
  const ex = getExploreCopy(language);
  const fonts = resolveTypeface(theme);
  const vibe = exploreBannerVibe(themeId, theme.isDark);
  const bannerColors = useMemo(() => assignUniqueBannerGradients(vibe, [...GENERAL_SLOTS]), [vibe]);
  const color = (slot: number) => bannerColors.get(slot);
  const [showSub, setShowSub] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const openSubModal = useCallback(() => setShowSub(true), []);
  const go = (pathname: Parameters<typeof hubPush>[0]) => () => hubPush(pathname, 'generals');

  return (
    <View style={[es.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <HubPageChrome active={active} sectionLabel="Generals" onSubscriptionModal={() => setShowSub(true)}>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 40 }}
          >
            <View style={es.sectionHead}>
              <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionEveryone}</Text>
              <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{ex.sectionEveryoneHint}</Text>
            </View>
            <View style={es.section}>
              <GlowBanner slot={1} vibe={vibe} theme={theme} fonts={fonts} colors={color(1)} title={ex.settings} subtitle={ex.settingsSub} icon={<Settings size={22} color="#FFF" />} onPress={go('/settings')} />
              <GlowBanner slot={8} vibe={vibe} theme={theme} fonts={fonts} colors={color(8)} title={ex.bookmarks} subtitle={ex.bookmarksSub} italic icon={<BookmarkIcon size={22} color="#FFF" />} onPress={go('/explore-bookmarks')} />
              <GlowBanner slot={17} vibe={vibe} theme={theme} fonts={fonts} colors={color(17)} title={ex.notifications} subtitle={ex.notificationsSub} icon={<Bell size={22} color="#FFF" />} onPress={go('/notifications')} />
              <GlowBanner slot={4} vibe={vibe} theme={theme} fonts={fonts} colors={color(4)} title={ex.faq} subtitle={ex.faqSub} icon={<HelpCircle size={22} color="#FFF" />} onPress={go('/explore-faq')} />
              <GlowBanner slot={3} vibe={vibe} theme={theme} fonts={fonts} colors={color(3)} title={ex.rateUs} subtitle={ex.rateUsSub} italic icon={<Star size={22} color="#FFF" />} onPress={go('/explore-rate')} />
              <GlowBanner slot={5} vibe={vibe} theme={theme} fonts={fonts} colors={color(5)} title={ex.support} subtitle={ex.supportSub} icon={<LifeBuoy size={22} color="#FFF" />} onPress={() => setShowSupport(true)} />
              <GlowBanner
                slot={18}
                vibe={vibe}
                theme={theme}
                fonts={fonts}
                colors={color(18)}
                title={ex.spinWheel}
                subtitle={ex.spinWheelSub}
                icon={<CircleDot size={22} color="#FFF" />}
                onPress={go('/spin-wheel')}
              />
            </View>

            <View style={[es.proLooksRail, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              <View style={es.sectionHead}>
                <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionProLooks}</Text>
                <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{ex.sectionProLooksHint}</Text>
              </View>
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={PRO_LOOK_SNAP}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 18, paddingTop: 4, gap: 14 }}
              >
                {PREMIUM_THEMES.map((id) => {
                  const locked = !isPro && !isAdmin;
                  return (
                    <TouchableOpacity
                      key={id}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (locked) { openSubscription(); return; }
                        void setThemeId(id);
                      }}
                      style={{ opacity: locked ? 0.55 : 1 }}
                    >
                      <View style={{ position: 'relative' }}>
                        <ThemeShowcaseCard id={id} active={themeId === id} cardWidth={PRO_LOOK_CARD_W} />
                        {locked && (
                          <View style={es.proStrip}>
                            <Crown size={11} color="#FFF" />
                            <Text style={es.proStripTxt}>PRO</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={es.section}>
              <GlowBanner slot={9} vibe={vibe} theme={theme} fonts={fonts} colors={color(9)} title={ex.appTheme} subtitle={ex.appThemeSub} proLock={!isPro && !isAdmin} icon={<Palette size={22} color="#FFF" />} onPress={() => { if (!isPro && !isAdmin) { openSubscription(); return; } setShowTheme(true); }} />
              <GlowBanner slot={11} vibe={vibe} theme={theme} fonts={fonts} colors={color(11)} title={ex.languages} subtitle={ex.languagesSub} proLock={!isPro && !isAdmin} icon={<Globe size={22} color="#FFF" />} onPress={() => { if (!isPro && !isAdmin) { openSubscription(); return; } setShowLang(true); }} />
            </View>

            <View style={[es.letterOuter, { borderColor: theme.border }]}>
              <ImageBackground source={EUGENE_PAPER} style={{ minHeight: 220 }} imageStyle={{ resizeMode: 'cover' }}>
                <LinearGradient colors={['rgba(62,39,35,0.08)', 'rgba(62,39,35,0.14)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={es.letterPanel}>
                  <Text style={es.letterMeta}>FROM EUGENE</Text>
                  <Text style={es.letterBody}>
                    {`Hey friend,\n\nThank you for letting photodumps live on your phone. Every swipe you take helps prove that a tiny team can build something honest, fast, and a little bit chaotic in the best way.\n\nI'm grateful you are here — whether you are on Hobby or Pro, you are part of the story. Stay tuned: we are cooking more playful features, kinder defaults, and surprises you can feel.\n\nWith love,\nEugene`}
                  </Text>
                </View>
              </ImageBackground>
            </View>

            <View style={es.sectionHead}>
              <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionLegal}</Text>
              <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{ex.sectionLegalHint}</Text>
            </View>
            <View style={es.section}>
              <GlowBanner slot={13} vibe={vibe} theme={theme} fonts={fonts} colors={color(13)} title={ex.terms} subtitle={ex.termsSub} icon={<FileText size={22} color="#FFF" />} onPress={go('/explore-legal-terms')} />
              <GlowBanner slot={14} vibe={vibe} theme={theme} fonts={fonts} colors={color(14)} title={ex.privacy} subtitle={ex.privacySub} icon={<FileText size={22} color="#FFF" />} onPress={go('/explore-legal-privacy')} />
            </View>

            <View style={[es.klFooter, { borderColor: theme.border }]}>
              <ImageBackground source={PALM_KL} style={StyleSheet.absoluteFill} imageStyle={{ resizeMode: 'cover' }} pointerEvents="none" />
              <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <View style={{ alignItems: 'center', zIndex: 2, paddingVertical: 28, paddingHorizontal: 22 }}>
                <Text style={es.klFooterTitle}>{ex.footerMadeIn}</Text>
                <Text style={es.klFooterSub}>{ex.footerSub}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TouchableOpacity onPress={() => { if (isPro || isAdmin) openSubModal(); else openSubscription(); }}>
                    <Text style={es.klLink}>{ex.footerRestore}</Text>
                  </TouchableOpacity>
                  <Text style={es.klLink}>v3.0</Text>
                </View>
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </HubPageChrome>
      </SafeAreaView>
      <SubscriptionModal visible={showSub} onClose={() => setShowSub(false)} />
      <ThemeModal visible={showTheme} onClose={() => setShowTheme(false)} />
      <LanguageModal visible={showLang} onClose={() => setShowLang(false)} />
      <SupportModal visible={showSupport} onClose={() => setShowSupport(false)} copy={ex} />
    </View>
  );
}
