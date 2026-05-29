import { CheckCircle2, Mail } from 'lucide-react-native';
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

export type DetoxSuccessKind = 'permission' | 'cleanup';

type Props = {
  visible: boolean;
  kind: DetoxSuccessKind;
  title: string;
  message: string;
  detail?: string;
  onClose: () => void;
  theme: ThemeColors;
  fonts: ReturnType<typeof resolveTypeface>;
};

export function DetoxSuccessModal({
  visible,
  kind,
  title,
  message,
  detail,
  onClose,
  theme,
  fonts,
}: Props) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.88);
      opacity.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, scale]);

  const Icon = kind === 'permission' ? Mail : CheckCircle2;
  const iconColor = kind === 'permission' ? theme.accent : theme.success;
  const ringBg = kind === 'permission' ? theme.accentSoft : theme.success + '22';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
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
          <View style={[styles.iconRing, { backgroundColor: ringBg, borderColor: iconColor + '44' }]}>
            <Icon size={32} color={iconColor} strokeWidth={2.2} />
          </View>
          <Text style={[styles.title, { color: theme.text, fontFamily: fonts.titleFont }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{message}</Text>
          {!!detail && (
            <Text style={[styles.detail, { color: theme.textMuted, fontFamily: fonts.bodyFont }]}>{detail}</Text>
          )}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onClose}
            style={[styles.btn, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.btnTxt, { fontFamily: fonts.titleFont }]}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  backdropInner: { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  message: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 21, marginTop: 8 },
  detail: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 10, lineHeight: 18 },
  btn: {
    marginTop: 22,
    width: '100%',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
});
