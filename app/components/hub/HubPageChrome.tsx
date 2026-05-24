import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, Crown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '../AppHeader';
import { getExploreCopy } from '../../_lib/localeContent';
import { getLocaleUi } from '../../_lib/localeUi';
import { resolveTypeface, useTheme } from '../../(tabs)/ThemeContext';
import { Ticker, exploreBannerVibe, tickerChrome } from './exploreUi';
import { hubPageStyles as es } from './hubPageStyles';

type Props = {
  sectionLabel: string;
  children: React.ReactNode;
  /** When false, do not register the global subscription opener (off-screen hub pages). */
  active?: boolean;
};

export function HubPageChrome({ sectionLabel, children, active = true }: Props) {
  const { theme, isPro, isAdmin, user, swipesLeft, openSubscription, setOnSubscriptionOpen, themeId, language } = useTheme();
  const ex = getExploreCopy(language);
  const u = getLocaleUi(language);
  const fonts = resolveTypeface(theme);
  const vibe = exploreBannerVibe(themeId, theme.isDark);
  const tickerColors = tickerChrome(theme, vibe);
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const openSubPage = useCallback(() => {
    try {
      router.push('/subscription');
    } catch {
      setTimeout(() => router.push('/subscription'), 50);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    setOnSubscriptionOpen(() => {
      if (!isPro && !isAdmin) openSubPage();
    });
    return () => {
      setOnSubscriptionOpen(() => {});
    };
  }, [active, isPro, isAdmin, openSubPage, setOnSubscriptionOpen]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [headerFade, headerSlide]);

  return (
    <Animated.View style={{ flex: 1, opacity: headerFade, transform: [{ translateY: headerSlide }] }}>
      <AppHeader
        variant="tabs"
        endSlot={
          isPro ? (
            <TouchableOpacity onPress={openSubPage} accessibilityLabel="Subscription and plan">
              <LinearGradient colors={['#FFD700', '#FF8C00']} style={es.proBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Crown size={16} color="#FFF" />
                <Text style={es.proBadgeText}>PRO</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={openSubscription} style={[es.upgradeBtn, { backgroundColor: 'rgba(255,0,85,0.12)', borderColor: '#FF0055', flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
              <Text style={{ color: '#FF0055', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>{u.hubUpgrade}</Text>
              <ChevronRight size={14} color="#FF0055" strokeWidth={2.5} />
            </TouchableOpacity>
          )
        }
        subtitle={`${sectionLabel} · ${isAdmin ? 'Admin' : isPro ? 'Pro' : 'Hobby'} · ${user?.email ?? u.hubSignedIn}`}
      />
      {!isPro && !isAdmin && (
        <View style={[es.hobbyPill, { backgroundColor: theme.bg2, borderColor: theme.border, alignSelf: 'center', marginTop: 8, marginBottom: 4 }]}>
          <Text style={{ color: theme.textSub, fontSize: 11, fontWeight: '700' }}>
            {swipesLeft} {ex.swipesLeftWeek}
          </Text>
        </View>
      )}
      <Ticker text={ex.tickerText} bg={tickerColors.bg} color={tickerColors.fg} speed={9200} height={26} />
      <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
    </Animated.View>
  );
}
