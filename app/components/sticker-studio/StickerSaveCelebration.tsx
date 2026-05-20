import { LinearGradient } from 'expo-linear-gradient';
import { Layers, Sparkles, Sticker } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  onDone: () => void;
  onCollage: () => void;
  onAnother: () => void;
};

export function StickerSaveCelebration({ visible, onDone, onCollage, onAnother }: Props) {
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    } else {
      scale.setValue(0.85);
    }
  }, [scale, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={st.backdrop}>
        <Animated.View style={[st.card, { transform: [{ scale }] }]}>
          <LinearGradient colors={['#FF6B9D', '#BF5AF2']} style={st.icon}>
            <Sparkles size={32} color="#fff" />
          </LinearGradient>
          <Text style={st.title}>Sticker saved!</Text>
          <Text style={st.sub}>It’s in your studio gallery ✨</Text>

          <TouchableOpacity style={st.btnWrap} onPress={onCollage}>
            <LinearGradient colors={['#3d5afe', '#00bcd4']} style={st.btn}>
              <Layers size={18} color="#fff" />
              <Text style={st.btnTxt}>Use in collage</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={st.ghost} onPress={onAnother}>
            <Sticker size={16} color="#FF8EC7" />
            <Text style={st.ghostTxt}>Make another</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onDone}>
            <Text style={st.done}>Back to studio</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1c1228',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 6, marginBottom: 20 },
  btnWrap: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ghost: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  ghostTxt: { color: '#FF8EC7', fontWeight: '800', fontSize: 14 },
  done: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '700', marginTop: 8 },
});
