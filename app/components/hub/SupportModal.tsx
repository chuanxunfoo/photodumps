import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { ExploreCopy } from '../../_lib/localeContent';
import { openEmailSupport, openInstagramSupport } from '../../_lib/supportLinks';
import { resolveTypeface, useTheme } from '../../(tabs)/ThemeContext';
import { exploreModalStyles } from './exploreUi';

const { height } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  copy: ExploreCopy;
};

export function SupportModal({ visible, onClose, copy }: Props) {
  const { theme } = useTheme();
  const fonts = resolveTypeface(theme);
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : height, friction: 14, useNativeDriver: true }).start();
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={[exploreModalStyles.sheet, styles.sheet, { backgroundColor: theme.bg, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.sheetHead}>
              <View style={[exploreModalStyles.handle, { backgroundColor: theme.border }]} />
              <TouchableOpacity onPress={onClose} style={styles.closeHit} accessibilityLabel="Close">
                <X size={20} color={theme.textSub} />
              </TouchableOpacity>
            </View>
            <Text style={[exploreModalStyles.title, { color: theme.text }]}>{copy.supportModalTitle}</Text>
            <Text style={[styles.hint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{copy.supportModalHint}</Text>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => { onClose(); void openInstagramSupport(); }}
              style={[styles.option, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
            >
              <LinearGradient colors={['#F58529', '#DD2A7B', '#8134AF']} style={styles.iconWell} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="logo-instagram" size={24} color="#FFF" />
              </LinearGradient>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>{copy.supportIgTitle}</Text>
                <Text style={[styles.optionSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{copy.supportIgSub}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => { onClose(); void openEmailSupport(); }}
              style={[styles.option, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
            >
              <LinearGradient colors={['#EA4335', '#FBBC05']} style={styles.iconWell} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Mail size={22} color="#FFF" />
              </LinearGradient>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>{copy.supportEmailTitle}</Text>
                <Text style={[styles.optionSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{copy.supportEmailSub}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[exploreModalStyles.closeBtn, { backgroundColor: theme.bg3, marginTop: 8 }]} onPress={onClose}>
              <Text style={[exploreModalStyles.closeTxt, { color: theme.text }]}>CLOSE</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { paddingBottom: 28 },
  sheetHead: { alignItems: 'center', paddingTop: 4 },
  closeHit: { position: 'absolute', right: 16, top: 10, padding: 8 },
  hint: { fontSize: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24, marginBottom: 16, lineHeight: 17 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  iconWell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 16, fontWeight: '900' },
  optionSub: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
