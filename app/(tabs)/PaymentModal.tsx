import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, Modal, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { completePayment, paymentButtonLabel } from '../_lib/stripe/pay';
import { isIosIapAvailable } from '../_lib/iap/iosIap';
import { isStripeNativeAvailable } from '../_lib/stripe/nativeAvailable';
import type { PaymentItem, StripePlanId } from '../_lib/stripe/plans';
import { SPIN_PACK_META, spinPackFromTierLabel } from '../_lib/stripe/plans';
import { recordSubscriptionActivation } from '../_lib/billingSupabase';
import { useTheme } from './ThemeContext';

export type { PaymentItem } from '../_lib/stripe/plans';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  item: PaymentItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ visible, item, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, user, setPlan, refreshPlanFromSupabase, addBonusSwipes } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const startedRef = useRef(false);

  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const isSubscription = item.checkoutMode !== 'payment' && !!item.planId;
  const planId = item.planId as StripePlanId | undefined;

  React.useEffect(() => {
    if (visible) {
      setDone(false);
      setError('');
      setProcessing(false);
      startedRef.current = false;
      Animated.spring(slideAnim, { toValue: 0, friction: 12, tension: 80, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  const runApplePay = useCallback(async () => {
    setError('');
    if (!user?.isLoggedIn) {
      setError('Sign in to subscribe.');
      return;
    }
    if (Platform.OS !== 'ios') {
      setError('Apple Pay is available on iPhone only.');
      return;
    }

    setProcessing(true);
    try {
      const req =
        isSubscription && planId
          ? { mode: 'subscription' as const, planId }
          : {
            mode: 'payment' as const,
            productKey: item.productKey ?? spinPackFromTierLabel(item.title),
            title: item.title,
          };

      const result = await completePayment(req);
      if (!result.ok) {
        if (result.needsAuth) {
          onClose();
          router.push('/auth');
          return;
        }
        setError(result.error);
        return;
      }

      if (isSubscription) {
        // For iOS IAP flow, unlock immediately on successful StoreKit transaction.
        await setPlan('pro');
        await refreshPlanFromSupabase();
        if (user?.uid && planId) {
          await recordSubscriptionActivation({
            userId: user.uid,
            planId,
            provider: Platform.OS === 'ios' ? 'apple' : 'stripe',
            status: 'active',
          });
        }
      } else if (req.mode === 'payment') {
        const key = req.productKey as keyof typeof SPIN_PACK_META;
        const meta = SPIN_PACK_META[key];
        if (meta?.bonusSwipes) await addBonusSwipes(meta.bonusSwipes);
      }

      setDone(true);
      Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      setTimeout(() => onSuccess(), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed.');
    } finally {
      setProcessing(false);
    }
  }, [
    addBonusSwipes, isSubscription, item, onClose, onSuccess, planId,
    refreshPlanFromSupabase, router, setPlan, user?.isLoggedIn,
  ]);

  /** Open native purchase sheet as soon as modal appears (dev/prod iOS builds). */
  React.useEffect(() => {
    if (!visible || done || processing || startedRef.current) return;
    if (!user?.isLoggedIn) return;
    if (!(isIosIapAvailable() || (Platform.OS === 'ios' && isStripeNativeAvailable()))) return;
    startedRef.current = true;
    const t = setTimeout(() => void runApplePay(), 400);
    return () => clearTimeout(t);
  }, [visible, done, processing, user?.isLoggedIn, runApplePay]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={s.overlay}>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[theme.bg, theme.bg2]} style={StyleSheet.absoluteFill} />

          <View style={s.handle} />

          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={[s.headerTitle, { color: theme.text }]}>
                {done ? 'Subscribed' : isIosIapAvailable() ? 'App Store' : 'Apple Pay'}
              </Text>
              {!done && (
                <Text style={[s.headerSub, { color: theme.textSub }]}>
                  {isIosIapAvailable()
                    ? 'Subscribe with your App Store account. Confirm with Side Button / Face ID.'
                    : 'No Stripe account needed — pay with Face ID or double-click the side button.'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: theme.bg3 }]}>
              <Text style={{ color: theme.textMuted, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {done ? (
            <View style={s.successWrap}>
              <Animated.View style={{ transform: [{ scale: successScale }], alignItems: 'center', gap: 14 }}>
                <CheckCircle2 size={56} color={theme.success} />
                <Text style={[s.successTitle, { color: theme.text }]}>You&apos;re on Pro</Text>
                <Text style={[s.successNote, { color: theme.textMuted }]}>{item.title}</Text>
              </Animated.View>
            </View>
          ) : (
            <View style={[s.body, { paddingBottom: insets.bottom + 20 }]}>
              <View style={[s.orderCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <Text style={[s.orderTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[s.orderSub, { color: theme.textSub }]}>{item.subtitle}</Text>
                <Text style={[s.orderAmt, { color: theme.accent }]}>{item.amount}</Text>
                <Text style={[s.orderUsd, { color: theme.textMuted }]}>{item.usd}</Text>
              </View>

              {!!error && (
                <View style={s.errorRow}>
                  <AlertCircle size={14} color={theme.danger} />
                  <Text style={[s.errorText, { color: theme.danger }]}>{error}</Text>
                </View>
              )}

              {!isIosIapAvailable() && !isStripeNativeAvailable() && (
                <Text style={[s.expoGoWarn, { color: theme.textSub }]}>
                  No Mac? You can still pay here — we&apos;ll open Stripe in your browser. For native Apple Pay on iPhone, use an EAS cloud build (see supabase/STRIPE_SETUP.md).
                </Text>
              )}

              {processing ? (
                <View style={s.waiting}>
                  <ActivityIndicator color={theme.accent} size="large" />
                  <Text style={[s.waitingTxt, { color: theme.text }]}>
                    Confirm with Apple Pay…
                  </Text>
                  <Text style={[s.waitingHint, { color: theme.textMuted }]}>
                    Double-click the side button (or use Face ID)
                  </Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => void runApplePay()} activeOpacity={0.88}>
                  <LinearGradient
                    colors={['#1c1c1e', '#000']}
                    style={s.appleBtn}
                  >
                    <Text style={s.appleMark}></Text>
                    <Text style={s.appleBtnText}>{paymentButtonLabel()}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Text style={[s.disclaimer, { color: theme.textMuted }]}>
                {isIosIapAvailable()
                  ? 'Charged via App Store. Manage or cancel in Apple ID → Subscriptions.'
                  : 'Charged through Apple Pay. Cancel anytime in Settings → subscription.'}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { minHeight: SCREEN_H * 0.55, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.35)', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingVertical: 14, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 6, lineHeight: 17 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 20 },
  orderCard: { borderRadius: 18, padding: 18, borderWidth: 1, marginBottom: 16 },
  orderTitle: { fontSize: 16, fontWeight: '800' },
  orderSub: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  orderAmt: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  orderUsd: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  errorRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-start' },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600' },
  waiting: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  waitingTxt: { fontSize: 16, fontWeight: '800' },
  waitingHint: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  appleBtn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  appleMark: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  appleBtnText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  disclaimer: { fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16 },
  expoGoWarn: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 12, textAlign: 'center' },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successTitle: { fontSize: 22, fontWeight: '900' },
  successNote: { fontSize: 14, fontWeight: '600' },
});
