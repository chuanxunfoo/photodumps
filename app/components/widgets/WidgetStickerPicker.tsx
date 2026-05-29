import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SavedSticker } from '../../_lib/stickerStudio/types';

const COLS = 4;
const GAP = 10;
const PAD = 16;
const { width: SW } = Dimensions.get('window');
const TILE = Math.floor((SW - PAD * 2 - GAP * (COLS - 1)) / COLS);

type Props = {
  visible: boolean;
  stickers: SavedSticker[];
  maxPick: number;
  selectedIds: string[];
  onClose: () => void;
  onToggle: (sticker: SavedSticker, selected: boolean) => void;
};

export function WidgetStickerPicker({
  visible,
  stickers,
  maxPick,
  selectedIds,
  onClose,
  onToggle,
}: Props) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (visible) setHint('');
  }, [visible]);

  const toggle = (s: SavedSticker) => {
    const on = selected.has(s.id);
    if (!on && selected.size >= maxPick) {
      setHint(`Max ${maxPick} stickers on this widget`);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setHint('');
    void Haptics.selectionAsync();
    onToggle(s, !on);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={st.root} edges={['top', 'bottom']}>
        <View style={st.bar}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={st.barDone}>Done</Text>
          </TouchableOpacity>
          <Text style={st.barTitle}>Add stickers</Text>
          <View style={st.barSpacer} />
        </View>

        <Text style={st.sub}>
          Tap to add or remove · {selected.size}/{maxPick} on widget
        </Text>
        {hint ? <Text style={st.hint}>{hint}</Text> : null}

        {stickers.length === 0 ? (
          <View style={st.empty}>
            <Text style={st.emptyTxt}>Make stickers in Sticker Studio first ✿</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={st.grid} showsVerticalScrollIndicator={false}>
            {stickers.map(s => {
              const on = selected.has(s.id);
              return (
                <Pressable key={s.id} onPress={() => toggle(s)} style={st.tileWrap}>
                  <View style={[st.tile, on && st.tileOn]}>
                    <Image source={{ uri: s.uri }} style={[st.thumb, !on && st.thumbOff]} contentFit="contain" />
                    {on && (
                      <View style={st.check}>
                        <Text style={st.checkMark}>✓</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf8f5' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  barDone: { fontSize: 16, fontWeight: '700', color: '#b07a9a', minWidth: 48 },
  barTitle: { fontSize: 16, fontWeight: '700', color: '#4a4258' },
  barSpacer: { minWidth: 48 },
  sub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9a8fa8',
    textAlign: 'center',
    paddingHorizontal: PAD,
    paddingTop: 10,
  },
  hint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c792c6',
    textAlign: 'center',
    paddingTop: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, padding: PAD, paddingBottom: 24 },
  tileWrap: { width: TILE },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(199,146,198,0.2)',
  },
  tileOn: { borderColor: '#c792c6' },
  thumb: { width: '100%', height: '100%' },
  thumbOff: { opacity: 0.55 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c792c6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt: { fontSize: 15, color: '#9a8fa8', textAlign: 'center' },
});
