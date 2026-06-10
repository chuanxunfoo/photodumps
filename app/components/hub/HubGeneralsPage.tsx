import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, BookmarkIcon, CircleDot, Crown, FileText, Globe, HelpCircle, LifeBuoy, Palette, Settings, Star, User,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { hubPush } from '../../_lib/exploreBack';
import { AccountAuthSheet, openAccountActionsSheet, runAccountDeleteFlow } from '../AccountAuthSheet';
import { signOutAccount } from '../../_lib/accountAuth';
import { openPrivacyDocument, openTermsDocument } from '../../_lib/openLegalDocument';
import { getExploreCopy } from '../../_lib/localeContent';
import { getLocaleUi } from '../../_lib/localeUi';
import { PREMIUM_THEMES, resolveTypeface, useTheme } from '../../(tabs)/ThemeContext';
import { HubPageChrome } from './HubPageChrome';
import { SupportModal } from './SupportModal';
import {
  HubNavRow, LanguageModal, PRO_LOOK_CARD_W, PRO_LOOK_SNAP, ThemeModal, ThemeShowcaseCard,
} from './exploreUi';
import { hubPageStyles as es } from './hubPageStyles';

const EUGENE_PAPER = require('../../assets/explore/eugene-paper.png');
const PALM_KL = require('../../assets/explore/palm-kl.png');

type Props = { active?: boolean };

export default function HubGeneralsPage({ active = false }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isPro, isAdmin, openSubscription, themeId, setThemeId, language, user, setUser } = useTheme();
  const ex = getExploreCopy(language);
  const u = getLocaleUi(language);
  const fonts = resolveTypeface(theme);
  const ic = () => '#FFFFFF';
  const [showTheme, setShowTheme] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const openSubPage = useCallback(() => {
    try {
      router.push('/subscription');
    } catch {
      setTimeout(() => router.push('/subscription'), 50);
    }
  }, []);
  const go = (pathname: Parameters<typeof hubPush>[0]) => () => hubPush(pathname, 'generals');

  const openAccount = useCallback(() => {
    if (user?.isLoggedIn) {
      openAccountActionsSheet({
        onSignOut: () => {
          void signOutAccount(setUser);
        },
        onDelete: () => {
          void runAccountDeleteFlow({ setUser, labels: u });
        },
        labels: {
          signOut: u.settingsSignOut,
          deleteAccount: u.settingsDeleteAccount,
          cancel: u.captionCancel,
        },
      });
      return;
    }
    setAccountOpen(true);
  }, [setUser, u, user?.isLoggedIn]);

  return (
    <View style={[es.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <HubPageChrome active={active} sectionLabel={u.hubGenerals}>
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
              <HubNavRow
                theme={theme}
                themeId={themeId}
                slot={11}
                fonts={fonts}
                title={u.accountBarTitle}
                subtitle={user?.isLoggedIn ? u.accountBarSubSignedIn : u.accountBarSubGuest}
                icon={<User size={22} color="#FFFFFF" />}
                onPress={openAccount}
              />
              <HubNavRow theme={theme} themeId={themeId} slot={0} fonts={fonts} title={ex.settings} subtitle={ex.settingsSub} icon={<Settings size={22} color={ic(0)} />} onPress={go('/settings')} />
              <HubNavRow theme={theme} themeId={themeId} slot={1} fonts={fonts} title={ex.bookmarks} subtitle={ex.bookmarksSub} icon={<BookmarkIcon size={22} color={ic(1)} />} onPress={go('/explore-bookmarks')} />
              <HubNavRow theme={theme} themeId={themeId} slot={2} fonts={fonts} title={ex.notifications} subtitle={ex.notificationsSub} icon={<Bell size={22} color={ic(2)} />} onPress={go('/notifications')} />
              <HubNavRow theme={theme} themeId={themeId} slot={3} fonts={fonts} title={ex.faq} subtitle={ex.faqSub} icon={<HelpCircle size={22} color={ic(3)} />} onPress={go('/explore-faq')} />
              <HubNavRow theme={theme} themeId={themeId} slot={4} fonts={fonts} title={ex.rateUs} subtitle={ex.rateUsSub} icon={<Star size={22} color={ic(4)} />} onPress={go('/explore-rate')} />
              <HubNavRow theme={theme} themeId={themeId} slot={5} fonts={fonts} title={ex.support} subtitle={ex.supportSub} icon={<LifeBuoy size={22} color={ic(5)} />} onPress={() => setShowSupport(true)} />
              <HubNavRow theme={theme} themeId={themeId} slot={6} fonts={fonts} title={ex.spinWheel} subtitle={ex.spinWheelSub} icon={<CircleDot size={22} color={ic(6)} />} onPress={go('/spin-wheel')} />
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
              <HubNavRow theme={theme} themeId={themeId} slot={7} fonts={fonts} title={ex.appTheme} subtitle={ex.appThemeSub} icon={<Palette size={22} color={ic(7)} />} onPress={() => setShowTheme(true)} />
              <HubNavRow theme={theme} themeId={themeId} slot={8} fonts={fonts} title={ex.languages} subtitle={ex.languagesSub} icon={<Globe size={22} color={ic(8)} />} onPress={() => setShowLang(true)} />
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
              <HubNavRow theme={theme} themeId={themeId} slot={9} fonts={fonts} title={ex.terms} subtitle={ex.termsSub} icon={<FileText size={22} color={ic(9)} />} onPress={() => openTermsDocument('generals')} />
              <HubNavRow theme={theme} themeId={themeId} slot={10} fonts={fonts} title={ex.privacy} subtitle={ex.privacySub} icon={<FileText size={22} color={ic(10)} />} onPress={() => openPrivacyDocument('generals')} />
            </View>

            <View style={[es.klFooter, { borderColor: theme.border }]}>
              <ImageBackground source={PALM_KL} style={StyleSheet.absoluteFill} imageStyle={{ resizeMode: 'cover' }} pointerEvents="none" />
              <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <View style={{ alignItems: 'center', zIndex: 2, paddingVertical: 28, paddingHorizontal: 22 }}>
                <Text style={es.klFooterTitle}>{ex.footerMadeIn}</Text>
                <Text style={es.klFooterSub}>{ex.footerSub}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TouchableOpacity onPress={() => { if (isPro || isAdmin) openSubPage(); else openSubscription(); }}>
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
      <ThemeModal visible={showTheme} onClose={() => setShowTheme(false)} />
      <LanguageModal visible={showLang} onClose={() => setShowLang(false)} />
      <SupportModal visible={showSupport} onClose={() => setShowSupport(false)} copy={ex} />
      <AccountAuthSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />
    </View>
  );
}
