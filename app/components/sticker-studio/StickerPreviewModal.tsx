import { LinearGradient } from 'expo-linear-gradient';
import { Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { SavedSticker } from '../../_lib/stickerStudio/types';

const { width: SW } = Dimensions.get('window');
const PREVIEW = Math.min(SW - 56, 280);

type Props = {
  visible: boolean;
  sticker: SavedSticker | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUseInCollage?: (sticker: SavedSticker) => void;
  titleFont?: string;
};

export function StickerPreviewModal({
  visible,
  sticker,
  onClose,
  onDelete,
  onUseInCollage,
  titleFont,
}: Props) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.92);
      opacity.setValue(0);
    }
  }, [opacity, scale, visible]);

  if (!sticker) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <Animated.View style={[st.card, { opacity, transform: [{ scale }] }]}>
            <TouchableOpacity style={st.close} onPress={onClose} hitSlop={12}>
              <X size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <View style={st.previewFrame}>
              <View style={st.checker} />
              <Image source={{ uri: sticker.uri }} style={st.previewImg} resizeMode="contain" />
            </View>

            <Text style={[st.title, titleFont ? { fontFamily: titleFont } : undefined]}>Your sticker</Text>

            <View style={st.actions}>
              {onUseInCollage ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => onUseInCollage(sticker)} style={st.actionWrap}>
                  <LinearGradient colors={['#3d5afe', '#00bcd4']} style={st.actionBtn}>
                    <Text style={st.actionTxt}>Use in collage</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
              {onDelete ? (
                <TouchableOpacity
                  style={st.deleteBtn}
                  onPress={() => {
                    onClose();
                    onDelete(sticker.id);
                  }}
                >
                  <Trash2 size={16} color="#FF0055" />
                  <Text style={st.deleteTxt}>Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: PREVIEW + 40,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: '#14141c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  close: { position: 'absolute', top: 12, right: 12, zIndex: 2 },
  previewFrame: {
    width: PREVIEW,
    height: PREVIEW,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e1e26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checker: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2a2a34',
    opacity: 0.5,
  },
  previewImg: { width: '94%', height: '94%' },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 14 },
  actions: { width: '100%', marginTop: 14, gap: 10, alignItems: 'center' },
  actionWrap: { width: '100%' },
  actionBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  deleteTxt: { color: '#FF0055', fontWeight: '700', fontSize: 13 },
});
