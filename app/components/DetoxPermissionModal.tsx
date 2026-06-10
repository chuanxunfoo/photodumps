import { Mail } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { ThemeColors } from '../(tabs)/ThemeContext';
import { resolveTypeface } from '../(tabs)/ThemeContext';
import { primaryButtonColors } from '../_lib/buttonContrast';

type Props = {
  visible: boolean;
  connecting: boolean;
  onConnect: () => void;
  onClose: () => void;
  theme: ThemeColors;
  fonts: ReturnType<typeof resolveTypeface>;
  primaryBtn: ReturnType<typeof primaryButtonColors>;
};

export function DetoxPermissionModal({
  visible,
  connecting,
  onConnect,
  onClose,
  theme,
  fonts,
  primaryBtn,
}: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 72, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, scale]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={connecting ? undefined : onClose}>
        <Animated.View style={[styles.backdropInner, { opacity }]} />
      </Pressable>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <View style={[styles.iconRing, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <Mail size={30} color={theme.text} strokeWidth={2} />
          </View>

          <Text style={[styles.title, { color: theme.text, fontFamily: fonts.titleFont }]}>
            Connect Gmail
          </Text>
          <Text style={[styles.message, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
            One-time setup. On Google, allow{' '}
            <Text style={{ fontWeight: '800', color: theme.text }}>
              Read, compose, and send emails
            </Text>{' '}
            (includes trash / remove) plus{' '}
            <Text style={{ fontWeight: '800', color: theme.text }}>View your email messages</Text>.
          </Text>

          <View style={[styles.trustBox, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <Text style={[styles.trustTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>
              Your inbox stays safe
            </Text>
            <Text style={[styles.trustBody, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
              We never delete without your OK. Small batches only. Revoke access anytime in Google Account settings.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onConnect}
            disabled={connecting}
            style={[styles.btn, { backgroundColor: primaryBtn.bg, opacity: connecting ? 0.65 : 1 }]}
          >
            <Text style={[styles.btnTxt, { color: primaryBtn.text, fontFamily: fonts.titleFont }]}>
              {connecting ? 'Opening Google…' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.75} onPress={onClose} disabled={connecting} style={styles.skipBtn}>
            <Text style={[styles.skipTxt, { color: theme.textMuted, fontFamily: fonts.bodyFont }]}>Not now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  backdropInner: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26 },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  message: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 21, marginTop: 10 },
  trustBox: {
    width: '100%',
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  trustTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  trustBody: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  btn: {
    marginTop: 22,
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnTxt: { fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  skipBtn: { marginTop: 12, paddingVertical: 6 },
  skipTxt: { fontSize: 13, fontWeight: '700' },
});
