/**
 * SubscriptionModal — plans, localized copy, unified scroll, gold CTA shimmer.
 */
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2, Check, Crown, Infinity as InfinityIcon, Mail,
  Palette, Shield, Sparkles, Star, Zap,
} from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, Modal, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { recordSubscriptionActivation } from '../_lib/billingSupabase';
import { markPaywallComplete } from '../_lib/appLaunchFlow';
import { safeReplaceAfterPaywall } from '../_lib/safeNavigate';
import {
  sendSubscriptionConfirmationEmail,
  subscriptionSuccessMessage,
} from '../_lib/subscriptionConfirm';
import type { StripePlanId } from '../_lib/stripe/plans';
import { getSubscriptionCopy } from '../_lib/localeContent';
import {
  calloutTextStyle,
  planCardSurface,
  subscriptionCtaInk,
  subscriptionHeroStyle,
} from '../_lib/themeContrast';
import type { ThemeColors } from './ThemeContext';
import type { PaymentItem } from './PaymentModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');

const PRO_ICONS = [InfinityIcon, Sparkles, BarChart2, Palette, Star, Mail, Check, Shield];

type PlanId = 'free' | 'weekly' | 'monthly' | 'yearly';

interface PlanDef {
  id: PlanId;
  label: string;
  badge: string | null;
  badgeTextDark: boolean;
  badgeColors: [string, string];
  myr: string;
  usd: string;
  perDay: string;
  sub: string;
  trial: string | null;
  color: string;
  payTitle: string;
  paySub: string;
}

function GoldShimmerCTA({
  onPress,
  colors,
  textDark,
  label,
  icon,
}: {
  onPress: () => void;
  colors: [string, string];
  textDark: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.6, width * 1.1],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={s.ctaWrap}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
        <Animated.View
          pointerEvents="none"
          style={[s.shimmerBand, { transform: [{ translateX }, { skewX: '-18deg' }] }]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,215,0,0.15)', 'rgba(255,248,220,0.85)', 'rgba(255,215,0,0.15)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {icon}
        <Text style={[s.ctaTxt, { color: textDark ? '#111111' : '#FFFFFF' }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
  theme,
}: {
  plan: PlanDef;
  selected: boolean;
  onSelect: () => void;
  theme: ThemeColors;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 8 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }),
    ]).start();
    onSelect();
  };

  const isFree = plan.id === 'free';
  const surface = planCardSurface(theme, selected, plan.color, isFree);

  return (
    <TouchableOpacity onPress={press} activeOpacity={0.9}>
      <Animated.View style={[pc.card, { borderColor: surface.border, backgroundColor: surface.bg, transform: [{ scale }] }]}>
        {plan.badge && (
          <LinearGradient colors={plan.badgeColors} style={pc.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[pc.badgeTxt, { color: plan.badgeTextDark ? '#000' : '#FFF' }]}>{plan.badge}</Text>
          </LinearGradient>
        )}
        <View style={pc.row}>
          <View style={[pc.radio, { borderColor: surface.radioBorder }]}>
            {selected && <View style={[pc.dot, { backgroundColor: plan.color }]} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[pc.label, { color: surface.label }]}>
              {plan.label}
            </Text>
            <Text style={[pc.sub, { color: surface.sub }]}>{plan.sub}</Text>
            {plan.trial && <Text style={[pc.trial, { color: plan.color }]}>✓ {plan.trial}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[pc.priceMain, { color: surface.price }]}>
              {plan.usd}
            </Text>
            {!isFree && <Text style={[pc.priceSub, { color: surface.usd }]}>{plan.myr}</Text>}
            {!isFree && (
              <View style={[pc.perDay, { backgroundColor: plan.color + '20', borderColor: plan.color + '50' }]}>
                <Text style={[pc.perDayTxt, { color: plan.color }]}>{plan.perDay}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 20, marginBottom: 10, overflow: 'hidden' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 5, borderBottomRightRadius: 12 },
  badgeTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  sub: { fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  trial: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  priceMain: { fontSize: 17, fontWeight: '900' },
  priceSub: { fontSize: 10, fontWeight: '600' },
  perDay: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 3 },
  perDayTxt: { fontSize: 9, fontWeight: '900' },
});

type Props = { onClose: () => void; postOnboarding?: boolean };

/** Full-screen subscription page (routed at /subscription). */
export default function SubscriptionScreen({ onClose, postOnboarding = false }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, themeId, user, setIsPro, setPlan, refreshPlanFromSupabase, language } = useTheme();
  const heroStyle = subscriptionHeroStyle(themeId, theme);
  const callout = calloutTextStyle(theme);
  const sub = getSubscriptionCopy(language);
  const [selected, setSelected] = useState<PlanId>('monthly');
  const [showPay, setShowPay] = useState(false);
  const [payItem, setPayItem] = useState<PaymentItem | null>(null);
  const [PaymentModalComp, setPaymentModalComp] = useState<React.ComponentType<{
    visible: boolean;
    item: PaymentItem;
    onClose: () => void;
    onSuccess: () => void;
  }> | null>(null);
  const [iapBusy, setIapBusy] = useState(false);
  const enterOpacity = useRef(new Animated.Value(1)).current;
  const enterY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const crownGlow = useRef(new Animated.Value(0)).current;

  const PLANS: PlanDef[] = [
    {
      id: 'free', label: 'HOBBY',
      badge: null, badgeTextDark: false, badgeColors: ['#333', '#444'],
      myr: 'MYR 0', usd: 'USD 0', perDay: 'Free forever',
      sub: sub.freeSub,
      trial: null, color: '#555555',
      payTitle: '', paySub: '',
    },
    {
      id: 'weekly', label: 'WEEKLY',
      badge: null, badgeTextDark: false, badgeColors: ['#00C2FF', '#006FFF'],
      myr: 'MYR 22.90', usd: 'USD 4.99', perDay: 'USD 0.71/day',
      sub: 'Billed weekly · Cancel anytime',
      trial: null, color: '#00E5FF',
      payTitle: 'photodumps Pro — Weekly', paySub: 'USD 4.99/week · MYR 22.90 · App Store',
    },
    {
      id: 'monthly', label: 'MONTHLY',
      badge: 'BEST VALUE', badgeTextDark: true, badgeColors: ['#FFD600', '#FF8C00'],
      myr: 'MYR 49.90', usd: 'USD 9.99', perDay: 'USD 0.33/day',
      sub: 'Save 53% vs weekly · Billed monthly',
      trial: null, color: '#FFD600',
      payTitle: 'photodumps Pro — Monthly', paySub: 'USD 9.99/month · MYR 49.90 · App Store',
    },
    {
      id: 'yearly', label: 'YEARLY',
      badge: 'LOWEST PRICE', badgeTextDark: false, badgeColors: ['#FF0055', '#FF5500'],
      myr: 'MYR 229.90', usd: 'USD 49.99', perDay: 'USD 0.14/day',
      sub: 'Save 81% vs weekly · Billed annually',
      trial: null, color: '#FF5500',
      payTitle: 'photodumps Pro — Yearly', paySub: 'USD 49.99/year · MYR 229.90 · App Store',
    },
  ];

  useEffect(() => {
    if (Platform.OS === 'ios') {
      void import('../_lib/iap/iosIap').then((m) => m.warmIosIapConnection());
    }
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(crownGlow, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(crownGlow, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [crownGlow]);

  useEffect(() => {
    enterOpacity.setValue(0.94);
    enterY.setValue(8);
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterY]);

  const requestClose = async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      await markPaywallComplete();
    } catch (e) {
      console.warn('[subscription] markPaywallComplete failed', e);
    }
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 0,
        duration: 170,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(enterY, {
        toValue: 10,
        duration: 170,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      try {
        onClose();
      } catch (e) {
        console.warn('[subscription] onClose failed', e);
      } finally {
        closingRef.current = false;
      }
    });
  };

  const glowR = crownGlow.interpolate({ inputRange: [0, 1], outputRange: [10, 38] });
  const plan = PLANS.find((p) => p.id === selected)!;
  const isHobby = selected === 'free';

  const ctaColors: [string, string] =
    selected === 'monthly' ? ['#FFD600', '#FF8C00'] :
    selected === 'yearly' ? ['#FF0055', '#FF5500'] :
    selected === 'weekly' ? ['#00C2FF', '#006FFF'] :
    ['#2A2A2A', '#1A1A1A'];

  const ctaInk = subscriptionCtaInk(ctaColors);
  const ctaTextDark = ctaInk === '#111111';
  const ctaLabel = selected === 'free' ? sub.ctaFree : sub.ctaSubscribe;

  const featureList = isHobby ? sub.hobbyFeatures : sub.proFeatures;
  const featureTitle = isHobby ? sub.featHobbyTitle : sub.featProTitle;
  const featureColors = ['#FF0055', '#BF5AF2', '#00FFA3', '#FF8A00', '#FFD600', '#00E5FF', '#00FFA3', '#BF5AF2'];

  const handleRestore = async () => {
    const { restoreIosPurchases } = await import('../_lib/iap/iosIap');
    const res = await restoreIosPurchases();
    if (res.ok) {
      await refreshPlanFromSupabase();
      Alert.alert('Restored', 'Your photodumps Pro subscription is active on this Apple ID.');
      return;
    }
    Alert.alert('Restore purchases', res.error);
  };

  const finishHobbyAndEnterApp = async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      await markPaywallComplete();
      if (postOnboarding) {
        safeReplaceAfterPaywall('/hub?page=calendar');
      } else {
        onClose();
      }
    } catch (e) {
      console.warn('[subscription] hobby continue failed', e);
      safeReplaceAfterPaywall('/hub?page=calendar');
    }
  };

  const handleCTA = async () => {
    if (selected === 'free') {
      await finishHobbyAndEnterApp();
      return;
    }

    const planId = selected as StripePlanId;
    const { isIosIapAvailable, purchaseIosSubscription } = await import('../_lib/iap/iosIap');

    if (Platform.OS === 'ios' && isIosIapAvailable()) {
      if (iapBusy) return;
      setIapBusy(true);
      try {
        const result = await purchaseIosSubscription(planId);
        if (!result.ok) {
          if (!result.cancelled) Alert.alert('Subscription', result.error);
          return;
        }

        setIapBusy(false);
        await setIsPro(true);
        void setPlan('pro', { skipRemote: true });
        void markPaywallComplete();
        if (postOnboarding) {
          safeReplaceAfterPaywall('/hub?page=calendar');
        } else {
          requestClose();
        }

        void (async () => {
          try {
            await refreshPlanFromSupabase();
            if (user?.uid) {
              await recordSubscriptionActivation({
                userId: user.uid,
                planId,
                provider: 'apple',
                status: 'active',
              });
            }
            const baseMsg = subscriptionSuccessMessage(planId);
            if (user?.uid) {
              const { emailSent } = await sendSubscriptionConfirmationEmail(planId);
              Alert.alert(
                'Welcome to Pro',
                emailSent
                  ? `${baseMsg}\n\nA confirmation email was sent to ${user.email}.`
                  : baseMsg,
              );
            } else {
              Alert.alert('Welcome to Pro', baseMsg);
            }
          } catch (e) {
            console.warn('[subscription] post-purchase sync failed', e);
          }
        })();
      } finally {
        setIapBusy(false);
      }
      return;
    }

    setPayItem({
      title: plan.payTitle,
      subtitle: plan.paySub,
      amount: plan.usd,
      usd: plan.myr,
      planId: selected,
      checkoutMode: 'subscription',
    });
    if (!PaymentModalComp) {
      void import('./PaymentModal').then((m) => setPaymentModalComp(() => m.PaymentModal));
    }
    setShowPay(true);
  };

  const handleSuccess = async () => {
    await refreshPlanFromSupabase();
    setShowPay(false);
    requestClose();
  };

  return (
    <>
      <Animated.View style={[s.fullPage, { backgroundColor: theme.bg, opacity: enterOpacity, transform: [{ translateY: enterY }] }]}>
        <SafeAreaView style={s.fullSafe} edges={['top']}>
          <AppHeader
            variant="detail"
            onBack={postOnboarding ? undefined : requestClose}
            subtitle="photodumps Pro"
          />

          <ScrollView
            style={s.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
            bounces
          >
              <LinearGradient colors={heroStyle.gradient} style={s.hdr}>
                <View style={s.hdrBody}>
                  <Animated.View style={{ shadowColor: '#FFD700', shadowRadius: glowR, shadowOpacity: 1, elevation: 20 }}>
                    <LinearGradient colors={['#FFD700', '#FF8C00', '#FF4500']} style={s.crownBox}>
                      <Crown size={36} color="#FFF" />
                    </LinearGradient>
                  </Animated.View>
                  <Text style={[s.heroTitle, { color: heroStyle.title }]}>{sub.heroTitle}</Text>
                  <Text style={[s.heroSub, { color: heroStyle.sub }]}>{sub.heroSub}</Text>
                  <View style={s.stars}>
                    {[0, 1, 2, 3, 4].map((i) => <Text key={i} style={{ color: '#FFD600', fontSize: 14 }}>★</Text>)}
                    <Text style={[s.rating, { color: heroStyle.rating }]}>{sub.rating}</Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={[s.featCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                <View style={s.featHdr}>
                  <Sparkles size={13} color="#FFD600" />
                  <Text style={[s.featHdrTxt, { color: theme.textSub }]}>{featureTitle}</Text>
                </View>
                {featureList.map((label, i) => {
                  const Icon = isHobby ? Check : (PRO_ICONS[i] ?? Check);
                  const color = featureColors[i % featureColors.length];
                  return (
                    <View key={label} style={s.featRow}>
                      <LinearGradient colors={[color + '30', color + '10']} style={s.featIcon}>
                        <Icon size={13} color={color} />
                      </LinearGradient>
                      <Text style={[s.featTxt, { color: theme.text }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={[s.callout, {
                backgroundColor: theme.isDark ? 'rgba(255,214,0,0.08)' : theme.accentSoft,
                borderColor: theme.isDark ? 'rgba(255,214,0,0.2)' : theme.border,
              }]}
              >
                <Zap size={16} color={callout.bold} />
                <Text style={[s.calloutTxt, { color: callout.body }]}>
                  {sub.callout}{' '}
                  <Text style={{ color: callout.bold, fontWeight: '800' }}>{sub.calloutBold}</Text>
                </Text>
              </View>

              <Text style={[s.planHead, { color: theme.textSub }]}>{sub.planHead}</Text>
              {PLANS.map((p) => (
                <PlanCard key={p.id} plan={p} theme={theme} selected={selected === p.id} onSelect={() => setSelected(p.id)} />
              ))}

              <GoldShimmerCTA
                onPress={handleCTA}
                colors={ctaColors}
                textDark={ctaTextDark}
                label={ctaLabel}
                icon={selected !== 'free' ? <Zap size={18} color={ctaInk} /> : undefined}
              />

              {selected !== 'free' && (
                <>
                  <Text style={[s.ctaNote, { color: theme.textMuted }]}>
                    {plan.payTitle} · {plan.usd} ({plan.myr}) · auto-renewing · cancel anytime in Apple ID Subscriptions
                  </Text>
                  <Text style={[s.subDisclosure, { color: theme.textMuted }]}>
                    Subscriptions renew automatically unless cancelled at least 24 hours before the period ends.
                  </Text>
                </>
              )}

              <View style={s.trust}>
                {[
                  { icon: Shield, txt: sub.trustSecure },
                  { icon: Check, txt: sub.trustCancel },
                  { icon: Star, txt: sub.trustFees },
                ].map(({ icon: Icon, txt }) => (
                  <View key={txt} style={s.trustItem}>
                    <Icon size={11} color={theme.textMuted} />
                    <Text style={[s.trustTxt, { color: theme.textMuted }]}>{txt}</Text>
                  </View>
                ))}
              </View>

              {postOnboarding && (
                <TouchableOpacity onPress={requestClose} style={{ alignSelf: 'center', marginBottom: 8 }}>
                  <Text style={[s.legalLink, { color: theme.textMuted }]}>Continue with Hobby (free)</Text>
                </TouchableOpacity>
              )}

              <View style={s.legal}>
                <TouchableOpacity onPress={() => { void import('../_lib/openLegalDocument').then((m) => m.openTermsDocument()); }}>
                  <Text style={[s.legalLink, { color: theme.textMuted }]}>{sub.termsLink}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { void import('../_lib/openLegalDocument').then((m) => m.openPrivacyDocument()); }}>
                  <Text style={[s.legalLink, { color: theme.textMuted }]}>{sub.privacyLink}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { void handleRestore(); }}>
                  <Text style={[s.legalLink, { color: theme.textMuted }]}>{sub.restore}</Text>
                </TouchableOpacity>
              </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {payItem && PaymentModalComp && (
        <PaymentModalComp visible={showPay} item={payItem} onClose={() => setShowPay(false)} onSuccess={handleSuccess} />
      )}

      <Modal visible={iapBusy} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FFD600" />
          <Text style={{ color: '#FFF', marginTop: 14, fontWeight: '700' }}>Opening App Store…</Text>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fullPage: { flex: 1 },
  fullSafe: { flex: 1 },
  scrollView: { flex: 1 },
  hdr: { paddingBottom: 22, paddingTop: 8 },
  hdrBody: { alignItems: 'center', paddingTop: 6, paddingHorizontal: 24, gap: 7 },
  crownBox: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5 },
  heroSub: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 12, fontWeight: '700', marginLeft: 5 },
  scroll: { paddingHorizontal: 18 },
  featCard: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 14, marginTop: 4 },
  featHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  featHdrTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  featIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  featTxt: { fontSize: 13, fontWeight: '600', flex: 1 },
  callout: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1,
  },
  calloutTxt: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 20 },
  planHead: { fontSize: 9, fontWeight: '900', letterSpacing: 4, marginBottom: 12 },
  ctaWrap: { borderRadius: 26, overflow: 'hidden', marginTop: 2, marginBottom: 10 },
  cta: {
    paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute', top: 0, bottom: 0, width: width * 0.45,
  },
  ctaTxt: { fontSize: 16, fontWeight: '900', letterSpacing: 0.8 },
  ctaNote: { textAlign: 'center', fontSize: 11, fontWeight: '500', marginBottom: 8, lineHeight: 17 },
  subDisclosure: { textAlign: 'center', fontSize: 10, fontWeight: '500', marginBottom: 16, lineHeight: 15, paddingHorizontal: 8 },
  trust: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 14, flexWrap: 'wrap' },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustTxt: { fontSize: 10, fontWeight: '700' },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 6 },
  legalLink: { fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
});
