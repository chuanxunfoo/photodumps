import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Modal, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openPrivacyDocument, openTermsDocument } from '../_lib/openLegalDocument';
import { completePayment, paymentButtonLabel } from '../_lib/stripe/pay';
import { isStripeNativeAvailable } from '../_lib/stripe/nativeAvailable';
import type { PaymentItem, StripePlanId } from '../_lib/stripe/plans';
import { SUBSCRIPTION_PLAN_META, SPIN_PACK_META, spinPackFromTierLabel } from '../_lib/stripe/plans';
import { recordSubscriptionActivation } from '../_lib/billingSupabase';
import { sendSubscriptionConfirmationEmail } from '../_lib/subscriptionConfirm';
import { useTheme } from './ThemeContext';

export type { PaymentItem } from '../_lib/stripe/plans';

const { height: SCREEN_H } = Dimensions.get('window');

const SUB_LENGTH_LABEL: Record<StripePlanId, string> = {
  weekly: '1 week (auto-renewing)',
  monthly: '1 month (auto-renewing)',
  yearly: '1 year (auto-renewing)',
};

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
  const useIap = Platform.OS === 'ios' && isSubscription;
  const payMode = isSubscription ? 'subscription' as const : 'payment' as const;
  const iosSpinPackBlocked = Platform.OS === 'ios' && !isSubscription;

  React.useEffect(() => {
    if (visible) {
      setDone(false);
      setError('');
      setProcessing(false);
      startedRef.current = false;
      Animated.spring(slideAnim, { toValue: 0, friction: 12, tension: 80, useNativeDriver: true }).start();
      if (useIap) {
        void import('../_lib/iap/iosIap').then((m) => m.warmIosIapConnection());
      }
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim, useIap]);

  const runPurchase = useCallback(async () => {
    setError('');
    if (!user?.isLoggedIn && !useIap) {
      setError(isSubscription ? 'Sign in to subscribe.' : 'Sign in to purchase a spin pack.');
      return;
    }

    if (iosSpinPackBlocked) {
      setError('Spin pack purchases are not available on iOS yet. Subscribe to Pro for unlimited swipes, or use free spins from ads.');
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
          Alert.alert('Account', 'Open Generals → account to sign in with Apple, then try again.');
          return;
        }
        setError(result.error);
        return;
      }

      if (isSubscription) {
        await setPlan('pro', { skipRemote: !user?.uid });
        await refreshPlanFromSupabase();
        if (user?.uid && planId) {
          await recordSubscriptionActivation({
            userId: user.uid,
            planId,
            provider: Platform.OS === 'ios' ? 'apple' : 'stripe',
            status: 'active',
          });
          await sendSubscriptionConfirmationEmail(planId);
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
    addBonusSwipes, iosSpinPackBlocked, isSubscription, item, onClose, onSuccess, planId,
    refreshPlanFromSupabase, router, setPlan, useIap, user?.isLoggedIn, user?.uid,
  ]);

  React.useEffect(() => {
    if (!visible || done || processing || startedRef.current) return;
    if (!user?.isLoggedIn && !useIap) return;
    if (!(useIap || isStripeNativeAvailable())) return;
    startedRef.current = true;
    const t = setTimeout(() => void runPurchase(), 400);
    return () => clearTimeout(t);
  }, [visible, done, processing, user?.isLoggedIn, runPurchase, useIap]);

  const subMeta = planId ? SUBSCRIPTION_PLAN_META[planId] : null;

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
                {done
                  ? isSubscription
                    ? 'Subscribed'
                    : 'Purchase complete'
                  : useIap
                    ? 'photodumps Pro'
                    : isSubscription
                      ? 'Subscribe'
                      : 'Buy spin pack'}
              </Text>
              {!done && useIap && (
                <Text style={[s.headerSub, { color: theme.textSub }]}>
                  Auto-renewing subscription via the App Store
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
                <Text style={[s.successTitle, { color: theme.text }]}>
                  {isSubscription ? "You're on Pro" : 'Spin pack unlocked'}
                </Text>
                <Text style={[s.successNote, { color: theme.textMuted }]}>{item.title}</Text>
              </Animated.View>
            </View>
          ) : (
            <View style={[s.body, { paddingBottom: insets.bottom + 20 }]}>
              <View style={[s.orderCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <Text style={[s.orderTitle, { color: theme.text }]}>{item.title}</Text>
                {isSubscription && planId && (
                  <>
                    <Text style={[s.orderSub, { color: theme.textSub }]}>
                      Subscription length: {SUB_LENGTH_LABEL[planId]}
                    </Text>
                    <Text style={[s.orderSub, { color: theme.textSub }]}>
                      {subMeta?.label ?? 'Pro'} · auto-renews until cancelled
                    </Text>
                  </>
                )}
                {!isSubscription && (
                  <Text style={[s.orderSub, { color: theme.textSub }]}>{item.subtitle}</Text>
                )}
                <Text style={[s.orderAmt, { color: theme.accent }]}>{item.amount}</Text>
                {!!item.usd && (
                  <Text style={[s.orderUsd, { color: theme.textMuted }]}>{item.usd}</Text>
                )}
              </View>

              {isSubscription && (
                <Text style={[s.legalBlock, { color: theme.textMuted }]}>
                  Payment will be charged to your Apple ID account at confirmation. Subscription automatically renews
                  unless cancelled at least 24 hours before the end of the current period. Manage or cancel in Settings
                  → Apple ID → Subscriptions.
                </Text>
              )}

              {!!error && (
                <View style={s.errorRow}>
                  <AlertCircle size={14} color={theme.danger} />
                  <Text style={[s.errorText, { color: theme.danger }]}>{error}</Text>
                </View>
              )}

              {!useIap && !isStripeNativeAvailable() && !iosSpinPackBlocked && (
                <Text style={[s.expoGoWarn, { color: theme.textSub }]}>
                  Opens secure Stripe checkout in your browser.
                </Text>
              )}

              {iosSpinPackBlocked && (
                <Text style={[s.expoGoWarn, { color: theme.textSub }]}>
                  One-time spin packs are not sold on iOS yet. Pro subscriptions use In-App Purchase; spin packs will
                  follow when consumable IAP is added.
                </Text>
              )}

              {processing ? (
                <View style={s.waiting}>
                  <ActivityIndicator color={theme.accent} size="large" />
                  <Text style={[s.waitingTxt, { color: theme.text }]}>
                    {useIap ? 'Confirm in the App Store…' : 'Opening checkout…'}
                  </Text>
                  {useIap && (
                    <Text style={[s.waitingHint, { color: theme.textMuted }]}>
                      Use Face ID or your device passcode to confirm
                    </Text>
                  )}
                </View>
              ) : iosSpinPackBlocked ? (
                <TouchableOpacity onPress={onClose} activeOpacity={0.88}>
                  <LinearGradient
                    colors={[theme.accent, theme.accent2 ?? theme.accent]}
                    style={s.subscribeBtn}
                  >
                    <Text style={s.subscribeBtnText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => void runPurchase()} activeOpacity={0.88}>
                  <LinearGradient
                    colors={[theme.accent, theme.accent2 ?? theme.accent]}
                    style={s.subscribeBtn}
                  >
                    <Text style={s.subscribeBtnText}>{paymentButtonLabel(payMode)}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={s.legalLinks}>
                <TouchableOpacity onPress={() => openTermsDocument()}>
                  <Text style={[s.legalLink, { color: theme.accent }]}>Terms of Use</Text>
                </TouchableOpacity>
                <Text style={{ color: theme.textMuted }}>·</Text>
                <TouchableOpacity onPress={() => openPrivacyDocument()}>
                  <Text style={[s.legalLink, { color: theme.accent }]}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { minHeight: SCREEN_H * 0.58, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.35)', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingVertical: 14, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 6, lineHeight: 17 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 20 },
  orderCard: { borderRadius: 18, padding: 18, borderWidth: 1, marginBottom: 12 },
  orderTitle: { fontSize: 16, fontWeight: '800' },
  orderSub: { fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 17 },
  orderAmt: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  orderUsd: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  legalBlock: { fontSize: 11, lineHeight: 16, marginBottom: 14 },
  errorRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-start' },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600' },
  waiting: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  waitingTxt: { fontSize: 16, fontWeight: '800' },
  waitingHint: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  subscribeBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  subscribeBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 },
  legalLink: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  expoGoWarn: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 12, textAlign: 'center' },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successTitle: { fontSize: 22, fontWeight: '900' },
  successNote: { fontSize: 14, fontWeight: '600' },
});
