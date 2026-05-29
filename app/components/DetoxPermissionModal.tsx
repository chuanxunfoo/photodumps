import { Lock, Mail, ShieldCheck } from 'lucide-react-native';
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

type Props = {
  visible: boolean;
  connecting: boolean;
  onConnect: () => void;
  onClose: () => void;
  theme: ThemeColors;
  fonts: ReturnType<typeof resolveTypeface>;
};

export function DetoxPermissionModal({
  visible,
  connecting,
  onConnect,
  onClose,
  theme,
  fonts,
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

          <Text style={[styles.eyebrow, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>
            ONE-TIME SETUP
          </Text>
          <Text style={[styles.title, { color: theme.text, fontFamily: fonts.titleFont }]}>
            Connect Gmail securely
          </Text>
          <Text style={[styles.message, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
            We only ask once. On Google’s screen, check both read access and{' '}
            <Text style={{ fontWeight: '800' }}>Manage your mail</Text> — that second one is required to delete batches
            you confirm.
          </Text>

          <View style={styles.points}>
            <View style={styles.pointRow}>
              <ShieldCheck size={16} color="#6B9BD1" strokeWidth={2.2} />
              <Text style={[styles.pointText, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                Read-only scan to measure real storage per email
              </Text>
            </View>
            <View style={styles.pointRow}>
              <Lock size={16} color="#7EB09B" strokeWidth={2.2} />
              <Text style={[styles.pointText, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                Delete only after you confirm each small batch
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onConnect}
            disabled={connecting}
            style={[styles.btn, { backgroundColor: theme.text, opacity: connecting ? 0.65 : 1 }]}
          >
            <Text style={[styles.btnTxt, { fontFamily: fonts.titleFont }]}>
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
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2.4, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  message: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 21, marginTop: 10 },
  points: { width: '100%', marginTop: 18, gap: 10 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pointText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  btn: {
    marginTop: 22,
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  skipBtn: { marginTop: 12, paddingVertical: 6 },
  skipTxt: { fontSize: 13, fontWeight: '700' },
});
