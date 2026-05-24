import { Home } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  onDone: () => void;
  onAnother: () => void;
};

/** Minimal “saved to home” sheet — no heavy gradients. */
export function StickerSaveCelebration({ visible, onDone, onAnother }: Props) {
  const slide = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(40);
      opacity.setValue(0);
    }
  }, [opacity, slide, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onDone}>
      <Pressable style={st.backdrop} onPress={onDone}>
        <Animated.View
          style={[st.sheet, { opacity, transform: [{ translateY: slide }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={st.handle} />
          <View style={st.iconWrap}>
            <Home size={22} color="#F5D547" strokeWidth={2.2} />
          </View>
          <Text style={st.title}>In your sticker home</Text>
          <Text style={st.sub}>Tap the house anytime to see your collection.</Text>

          <TouchableOpacity style={st.primary} onPress={onDone} activeOpacity={0.88}>
            <Text style={st.primaryTxt}>OK</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onAnother} hitSlop={12}>
            <Text style={st.secondary}>New sticker</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#141418',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(245,213,71,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,213,71,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 22,
    maxWidth: 280,
  },
  primary: {
    width: '100%',
    backgroundColor: '#F5D547',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryTxt: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '800',
  },
  secondary: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '600',
  },
});
