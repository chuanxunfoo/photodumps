import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Check, ChevronLeft, Crown, Infinity as InfinityIcon,
  Sparkles, Star, Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaymentModal } from './PaymentModal';
import type { PlanType } from './ThemeContext';
import {
  calloutTextStyle,
  planCardSurface,
  subscriptionHeroStyle,
  textOnHex,
} from '../_lib/themeContrast';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: InfinityIcon, label: 'Unlimited swipes — forever', color: '#FF0055' },
  { icon: Sparkles,     label: 'AI duplicate detection',      color: '#BF5AF2' },
  { icon: Star,         label: 'Full storage analytics',      color: '#FFD600' },
  { icon: Zap,          label: '9 premium colour themes',     color: '#00E5FF' },
  { icon: Crown,        label: 'Photobooth — filters & frames', color: '#FF8C00' },
  { icon: Check,        label: 'Duplicates finder & Supercut', color: '#00FFA3' },
  { icon: Check,        label: 'All 13 languages unlocked',   color: '#00FFA3' },
  { icon: Check,        label: 'Priority support',            color: '#00FFA3' },
];

type PlanDef = {
  id: PlanType;
  label: string;
  badge: string | null;
  myr: string;
  usd: string;
  perDay: string;
  sub: string;
  color: string;
  highlight: boolean;
  trial: string | null;
};

const PLANS: PlanDef[] = [
  {
    id: 'weekly',   label: 'WEEKLY',  badge: null,
    myr: 'MYR 19.99', usd: 'USD 4.99', perDay: 'MYR 2.85/day',
    sub: 'Cancel anytime · billed weekly',
    color: '#00E5FF', highlight: false, trial: null,
  },
  {
    id: 'monthly',  label: 'MONTHLY', badge: '⭐ BEST VALUE',
    myr: 'MYR 39.99', usd: 'USD 9.99', perDay: 'MYR 1.33/day',
    sub: 'Save 53% vs weekly · billed monthly',
    color: '#FFD600', highlight: true, trial: null,
  },
  {
    id: 'yearly',   label: 'YEARLY',  badge: '🔥 LOWEST PRICE',
    myr: 'MYR 199.99', usd: 'USD 49.99', perDay: 'MYR 0.55/day',
    sub: 'Save 81% vs weekly · billed yearly',
    color: '#FF0055', highlight: false, trial: null,
  },
];

export default function SubscribePage() {
  const { theme, themeId, refreshPlanFromSupabase } = useTheme();
  const heroStyle = subscriptionHeroStyle(themeId, theme);
  const callout = calloutTextStyle(theme);
  const [selected, setSelected] = useState<PlanType>('monthly');
  const [showPayment, setShowPayment] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const planAnims = useRef(PLANS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: false })).start();
  }, []);

  const crownGlow = glow.interpolate({ inputRange: [0, 1], outputRange: [10, 32] });

  const tap = (id: PlanType, idx: number) => {
    setSelected(id);
    Animated.sequence([
      Animated.spring(planAnims[idx], { toValue: 0.97, useNativeDriver: true, friction: 8 }),
      Animated.spring(planAnims[idx], { toValue: 1,    useNativeDriver: true, friction: 8 }),
    ]).start();
  };

  const plan = PLANS.find(p => p.id === selected)!;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={heroStyle.gradient} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* NAV */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: theme.bg3 }]}>
            <ChevronLeft size={22} color={theme.textSub} />
          </TouchableOpacity>
          <Text style={[s.navTitle, { color: theme.text }]}>Upgrade to Pro</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* HERO */}
          <View style={s.hero}>
            <Animated.View style={{ shadowColor: '#FFD700', shadowRadius: crownGlow, shadowOpacity: 0.9, elevation: 20 }}>
              <LinearGradient colors={['#FFD700', '#FF8C00', '#FF4500']} style={s.crownBadge}>
                <Crown size={40} color="#FFF" />
              </LinearGradient>
            </Animated.View>
            <Text style={[s.heroTitle, { color: heroStyle.title }]}>PHOTODUMPS PRO</Text>
            <Text style={[s.heroSub, { color: heroStyle.sub }]}>
              Join 50,000+ users who've reclaimed{'\n'}gigabytes of storage — for good.
            </Text>

            {/* Social proof */}
            <View style={s.proof}>
              <View style={s.stars}>
                {[0,1,2,3,4].map(i => <Text key={i} style={{ fontSize: 14 }}>⭐</Text>)}
              </View>
              <Text style={[s.proofText, { color: heroStyle.rating }]}>4.9 · 12,400 ratings</Text>
            </View>
          </View>

          {/* FEATURES */}
          <View style={[s.featCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <View style={s.featHeader}>
              <Sparkles size={14} color="#FFD600" />
              <Text style={[s.featHeading, { color: theme.textSub }]}>EVERYTHING IN PRO</Text>
            </View>
            <View style={s.featGrid}>
              {FEATURES.map((feat, i) => (
                <View key={i} style={s.featRow}>
                  <LinearGradient colors={[feat.color + '30', feat.color + '10']} style={s.featIconWrap}>
                    <feat.icon size={14} color={feat.color} />
                  </LinearGradient>
                  <Text style={[s.featLabel, { color: theme.text }]}>{feat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* VS FREE BANNER */}
          <LinearGradient colors={[theme.accentSoft, theme.bg2]} style={[s.vsBanner, { borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[s.vsFree, { color: theme.textSub }]}>Free plan: only <Text style={{ color: theme.accent, fontWeight: '900' }}>100 swipes/week</Text></Text>
            <Text style={[s.vsArrow, { color: theme.textMuted }]}>↓ Upgrade for unlimited ↓</Text>
          </LinearGradient>

          {/* PLANS */}
          <Text style={[s.planHeading, { color: theme.textSub }]}>CHOOSE YOUR PLAN</Text>
          {PLANS.map((p, i) => {
            const isSel = selected === p.id;
            const surface = planCardSurface(theme, isSel, p.color, false);
            return (
              <Animated.View key={p.id} style={{ transform: [{ scale: planAnims[i] }] }}>
                <TouchableOpacity onPress={() => tap(p.id, i)} activeOpacity={0.9}>
                  <View style={[s.planCard, { borderColor: surface.border, backgroundColor: surface.bg }]}>
                    {p.badge && (
                      <LinearGradient
                        colors={p.highlight ? ['#FFD600', '#FF8C00'] : p.id === 'yearly' ? ['#FF0055', '#FF5500'] : ['#00E5FF', '#006FFF']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={s.planBadge}
                      >
                        <Text style={s.planBadgeText}>{p.badge}</Text>
                      </LinearGradient>
                    )}
                    <View style={s.planBody}>
                      <View style={[s.planRadio, { borderColor: surface.radioBorder }]}>
                        {isSel && <View style={[s.planDot, { backgroundColor: p.color }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.planLabel, { color: surface.label }]}>{p.label}</Text>
                        <Text style={[s.planSub, { color: surface.sub }]}>{p.sub}</Text>
                        {p.trial && <Text style={[s.planTrial, { color: p.color }]}>✓ {p.trial} included</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.planMyr, { color: surface.price }]}>{p.myr}</Text>
                        <Text style={[s.planUsd, { color: surface.usd }]}>{p.usd}</Text>
                        <View style={[s.perDayBadge, { backgroundColor: p.color + '20', borderColor: p.color + '50' }]}>
                          <Text style={[s.perDayText, { color: p.color }]}>{p.perDay}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {/* VALUE CALLOUT */}
          <View style={[s.callout, { backgroundColor: theme.bg2, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={s.calloutEmoji}>💡</Text>
            <Text style={[s.calloutText, { color: callout.body }]}>
              Monthly plan = less than a cup of coffee per day.{'\n'}
              <Text style={{ color: callout.bold, fontWeight: '800' }}>Start free, cancel anytime.</Text>
            </Text>
          </View>

          {/* CTA */}
          <TouchableOpacity onPress={() => setShowPayment(true)} activeOpacity={0.88} style={s.ctaWrap}>
            <LinearGradient
              colors={plan.id === 'monthly' ? ['#FFD600', '#FF8C00'] : plan.id === 'yearly' ? ['#FF0055', '#FF5500'] : ['#00E5FF', '#006FFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.cta}
            >
              {(() => {
                const ctaColors = plan.id === 'monthly' ? ['#FFD600', '#FF8C00'] as [string, string] : plan.id === 'yearly' ? ['#FF0055', '#FF5500'] as [string, string] : ['#00E5FF', '#006FFF'] as [string, string];
                const ctaInk = textOnHex(ctaColors[0]);
                return (
                  <>
              <Zap size={20} color={ctaInk} />
              <Text style={[s.ctaText, { color: ctaInk }]}>
                SUBSCRIBE WITH APPLE PAY
              </Text>
                  </>
                );
              })()}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={[s.ctaNote, { color: theme.textMuted }]}>
            {plan.myr} · Apple Pay · cancel anytime
          </Text>

          {/* LEGAL */}
          <View style={s.legal}>
            {['Terms of Service', 'Privacy Policy', 'Restore Purchase'].map(l => (
              <TouchableOpacity key={l}><Text style={[s.legalLink, { color: theme.textMuted }]}>{l}</Text></TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>

      {/* PAYMENT MODAL */}
      <PaymentModal
        visible={showPayment}
        item={{
          title: `photodumps Pro · ${plan.label}`,
          subtitle: `${plan.sub} · Apple Pay`,
          amount: plan.myr,
          usd: plan.usd,
          planId: selected === 'free' ? undefined : selected,
          checkoutMode: 'subscription',
        }}
        onClose={() => setShowPayment(false)}
        onSuccess={async () => {
          await refreshPlanFromSupabase();
          setShowPayment(false);
          router.replace('/hub');
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  nav:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  navTitle:    { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3 },
  scroll:      { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  hero:        { alignItems: 'center', paddingVertical: 24, gap: 10 },
  crownBadge:  { width: 90, height: 90, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  heroTitle:   { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -1.5 },
  heroSub:     { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22 },
  proof:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  stars:       { flexDirection: 'row', gap: 2 },
  proofText:   { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  featCard:    { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  featHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  featHeading: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  featGrid:    { gap: 10 },
  featRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featIconWrap:{ width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  featLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', flex: 1 },
  vsBanner:    { borderRadius: 16, padding: 14, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,0,85,0.2)' },
  vsFree:      { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  vsArrow:     { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginTop: 4 },
  planHeading: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  planCard:    { borderWidth: 1.5, borderRadius: 22, marginBottom: 10, overflow: 'hidden' },
  planBadge:   { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderBottomRightRadius: 14 },
  planBadgeText:{ color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  planBody:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  planRadio:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  planDot:     { width: 10, height: 10, borderRadius: 5 },
  planLabel:   { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  planSub:     { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  planTrial:   { fontSize: 11, fontWeight: '800', marginTop: 3 },
  planMyr:     { fontSize: 17, fontWeight: '900' },
  planUsd:     { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  perDayBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4 },
  perDayText:  { fontSize: 10, fontWeight: '900' },
  callout:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: 'rgba(255,214,0,0.07)', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,214,0,0.15)' },
  calloutEmoji:{ fontSize: 22 },
  calloutText: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 20 },
  ctaWrap:     { borderRadius: 28, overflow: 'hidden', marginBottom: 10 },
  cta:         { paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText:     { fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  ctaNote:     { color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontSize: 11, fontWeight: '500', marginBottom: 20, lineHeight: 17 },
  legal:       { flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 10 },
  legalLink:   { color: 'rgba(255,255,255,0.22)', fontSize: 11, textDecorationLine: 'underline', fontWeight: '600' },
});
