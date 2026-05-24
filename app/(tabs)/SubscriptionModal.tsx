/**
 * SubscriptionModal — plans, localized copy, unified scroll, gold CTA shimmer.
 */
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2, Check, Crown, Infinity as InfinityIcon,
  Palette, Shield, Sparkles, Star, Zap,
} from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { getSubscriptionCopy } from '../_lib/localeContent';
import { PaymentModal } from './PaymentModal';
import type { PaymentItem } from './PaymentModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');

const PRO_ICONS = [InfinityIcon, Sparkles, BarChart2, Palette, Star, Check, Check, Shield];

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
        <Text style={[s.ctaTxt, { color: textDark ? '#000' : '#FFF' }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PlanCard({ plan, selected, onSelect }: { plan: PlanDef; selected: boolean; onSelect: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 8 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }),
    ]).start();
    onSelect();
  };

  const isFree = plan.id === 'free';
  const borderCol = selected ? plan.color : (isFree ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.09)');
  const bgCol = selected && !isFree ? plan.color + '0E' : 'rgba(255,255,255,0.02)';

  return (
    <TouchableOpacity onPress={press} activeOpacity={0.9}>
      <Animated.View style={[pc.card, { borderColor: borderCol, backgroundColor: bgCol, transform: [{ scale }] }]}>
        {plan.badge && (
          <LinearGradient colors={plan.badgeColors} style={pc.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[pc.badgeTxt, { color: plan.badgeTextDark ? '#000' : '#FFF' }]}>{plan.badge}</Text>
          </LinearGradient>
        )}
        <View style={pc.row}>
          <View style={[pc.radio, { borderColor: selected ? plan.color : 'rgba(255,255,255,0.2)' }]}>
            {selected && <View style={[pc.dot, { backgroundColor: plan.color }]} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[pc.label, { color: isFree ? 'rgba(255,255,255,0.35)' : selected ? plan.color : 'rgba(255,255,255,0.7)' }]}>
              {plan.label}
            </Text>
            <Text style={pc.sub}>{plan.sub}</Text>
            {plan.trial && <Text style={[pc.trial, { color: plan.color }]}>✓ {plan.trial}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[pc.price, { color: isFree ? 'rgba(255,255,255,0.25)' : selected ? '#FFF' : 'rgba(255,255,255,0.6)' }]}>
              {plan.myr}
            </Text>
            {!isFree && <Text style={pc.usd}>{plan.usd}</Text>}
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
  sub: { color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  trial: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  price: { fontSize: 17, fontWeight: '900' },
  usd: { color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: '600' },
  perDay: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 3 },
  perDayTxt: { fontSize: 9, fontWeight: '900' },
});

type Props = { onClose: () => void };

/** Full-screen subscription page (routed at /subscription). */
export default function SubscriptionScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, setPlan, language } = useTheme();
  const sub = getSubscriptionCopy(language);
  const [selected, setSelected] = useState<PlanId>('monthly');
  const [showPay, setShowPay] = useState(false);
  const [payItem, setPayItem] = useState<PaymentItem | null>(null);

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
      badge: '3-DAY FREE TRIAL', badgeTextDark: false, badgeColors: ['#00C2FF', '#006FFF'],
      myr: 'MYR 19.99', usd: 'USD 4.99', perDay: 'MYR 2.85/day',
      sub: 'Billed weekly · Cancel anytime',
      trial: '3-day free trial included', color: '#00E5FF',
      payTitle: 'photodumps Pro — Weekly', paySub: '3-day free trial, then MYR 19.99/week',
    },
    {
      id: 'monthly', label: 'MONTHLY',
      badge: 'BEST VALUE', badgeTextDark: true, badgeColors: ['#FFD600', '#FF8C00'],
      myr: 'MYR 39.99', usd: 'USD 9.99', perDay: 'MYR 1.33/day',
      sub: 'Save 53% vs weekly · Billed monthly',
      trial: '7-day free trial included', color: '#FFD600',
      payTitle: 'photodumps Pro — Monthly', paySub: '7-day free trial, then MYR 39.99/month',
    },
    {
      id: 'yearly', label: 'YEARLY',
      badge: 'LOWEST PRICE', badgeTextDark: false, badgeColors: ['#FF0055', '#FF5500'],
      myr: 'MYR 199.99', usd: 'USD 49.99', perDay: 'MYR 0.55/day',
      sub: 'Save 81% vs weekly · Billed annually',
      trial: '7-day free trial included', color: '#FF5500',
      payTitle: 'photodumps Pro — Yearly', paySub: '7-day free trial, then MYR 199.99/year',
    },
  ];

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

  const glowR = crownGlow.interpolate({ inputRange: [0, 1], outputRange: [10, 38] });
  const plan = PLANS.find((p) => p.id === selected)!;
  const isHobby = selected === 'free';

  const ctaColors: [string, string] =
    selected === 'monthly' ? ['#FFD600', '#FF8C00'] :
    selected === 'yearly' ? ['#FF0055', '#FF5500'] :
    selected === 'weekly' ? ['#00C2FF', '#006FFF'] :
    ['#2A2A2A', '#1A1A1A'];

  const ctaTextDark = selected === 'monthly';
  const ctaLabel =
    selected === 'free' ? sub.ctaFree :
    selected === 'weekly' ? sub.ctaWeekly :
    sub.ctaTrial;

  const featureList = isHobby ? sub.hobbyFeatures : sub.proFeatures;
  const featureTitle = isHobby ? sub.featHobbyTitle : sub.featProTitle;
  const featureColors = ['#FF0055', '#BF5AF2', '#00FFA3', '#FF8A00', '#FFD600', '#00E5FF', '#00FFA3', '#BF5AF2'];

  const handleCTA = () => {
    if (selected === 'free') {
      void setPlan('hobby');
      onClose();
      return;
    }
    setPayItem({ title: plan.payTitle, subtitle: plan.paySub, amount: plan.myr, usd: plan.usd });
    setShowPay(true);
  };

  const handleSuccess = async () => {
    await setPlan(selected);
    setShowPay(false);
    onClose();
  };

  return (
    <>
      <View style={[s.fullPage, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={s.fullSafe} edges={['top']}>
          <AppHeader variant="detail" onBack={onClose} subtitle="photodumps Pro" />

          <ScrollView
            style={s.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
            bounces
          >
              <LinearGradient colors={['#08001C', '#10003A', '#08001C']} style={s.hdr}>
                <View style={s.hdrBody}>
                  <Animated.View style={{ shadowColor: '#FFD700', shadowRadius: glowR, shadowOpacity: 1, elevation: 20 }}>
                    <LinearGradient colors={['#FFD700', '#FF8C00', '#FF4500']} style={s.crownBox}>
                      <Crown size={36} color="#FFF" />
                    </LinearGradient>
                  </Animated.View>
                  <Text style={s.heroTitle}>{sub.heroTitle}</Text>
                  <Text style={s.heroSub}>{sub.heroSub}</Text>
                  <View style={s.stars}>
                    {[0, 1, 2, 3, 4].map((i) => <Text key={i} style={{ color: '#FFD600', fontSize: 14 }}>★</Text>)}
                    <Text style={s.rating}>{sub.rating}</Text>
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

              <View style={s.callout}>
                <Zap size={16} color="#FFD600" />
                <Text style={s.calloutTxt}>
                  {sub.callout}{' '}
                  <Text style={{ color: '#FFD600', fontWeight: '800' }}>{sub.calloutBold}</Text>
                </Text>
              </View>

              <Text style={[s.planHead, { color: theme.textSub }]}>{sub.planHead}</Text>
              {PLANS.map((p) => (
                <PlanCard key={p.id} plan={p} selected={selected === p.id} onSelect={() => setSelected(p.id)} />
              ))}

              <GoldShimmerCTA
                onPress={handleCTA}
                colors={ctaColors}
                textDark={ctaTextDark}
                label={ctaLabel}
                icon={selected !== 'free' ? <Zap size={18} color={ctaTextDark ? '#000' : '#FFF'} /> : undefined}
              />

              {selected !== 'free' && (
                <Text style={[s.ctaNote, { color: theme.textMuted }]}>
                  {plan.trial ? `${plan.trial} · then ${plan.myr}/period · cancel anytime` : `${plan.myr} · cancel anytime`}
                </Text>
              )}

              <View style={s.trust}>
                {[
                  { icon: Shield, txt: sub.trustSecure },
                  { icon: Check, txt: sub.trustCancel },
                  { icon: Star, txt: sub.trustFees },
                ].map(({ icon: Icon, txt }) => (
                  <View key={txt} style={s.trustItem}>
                    <Icon size={11} color="rgba(255,255,255,0.3)" />
                    <Text style={[s.trustTxt, { color: theme.textMuted }]}>{txt}</Text>
                  </View>
                ))}
              </View>

              <View style={s.legal}>
                {[sub.termsLink, sub.privacyLink, sub.restore].map((l) => (
                  <TouchableOpacity key={l}>
                    <Text style={[s.legalLink, { color: theme.textMuted }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </View>

      {payItem && (
        <PaymentModal visible={showPay} item={payItem} onClose={() => setShowPay(false)} onSuccess={handleSuccess} />
      )}
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
  heroTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -1.5 },
  heroSub: { color: 'rgba(255,255,255,0.42)', fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: '700', marginLeft: 5 },
  scroll: { paddingHorizontal: 18 },
  featCard: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 14, marginTop: 4 },
  featHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  featHdrTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  featIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  featTxt: { fontSize: 13, fontWeight: '600', flex: 1 },
  callout: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,214,0,0.06)',
    borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,214,0,0.16)',
  },
  calloutTxt: { color: 'rgba(255,255,255,0.52)', fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 20 },
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
  ctaNote: { textAlign: 'center', fontSize: 11, fontWeight: '500', marginBottom: 16, lineHeight: 17 },
  trust: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 14, flexWrap: 'wrap' },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustTxt: { fontSize: 10, fontWeight: '700' },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 6 },
  legalLink: { fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
});
