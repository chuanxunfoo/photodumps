import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CAPTION_COLOR_IDS,
  CAPTION_COLORS,
  CAPTION_FONT_IDS,
  CAPTION_SLANTS,
  CAPTION_WEIGHTS,
  DEFAULT_CAPTION_COLOR,
  DEFAULT_CAPTION_FONT,
  DEFAULT_CAPTION_SLANT,
  DEFAULT_CAPTION_WEIGHT,
  captionStyleFromWidget,
  type CaptionColorId,
  type CaptionFontId,
} from '../../_lib/widgets/captionPresets';
import type { CaptionSlant, CaptionWeight, WidgetCaption } from '../../_lib/widgets/types';

const MIN_SIZE = 9;
const MAX_SIZE = 36;

type Labels = {
  title: string;
  cancel: string;
  done: string;
  fonts: string;
  colors: string;
  size: string;
  weight: string;
  slant: string;
};

type Props = {
  visible: boolean;
  initial: WidgetCaption | null;
  labels: Labels;
  onClose: () => void;
  onSave: (caption: WidgetCaption | null) => void;
};

export function WidgetCaptionModal({ visible, initial, labels, onClose, onSave }: Props) {
  const [text, setText] = useState('');
  const [fontId, setFontId] = useState<CaptionFontId>(DEFAULT_CAPTION_FONT);
  const [colorId, setColorId] = useState<CaptionColorId>(DEFAULT_CAPTION_COLOR);
  const [fontSize, setFontSize] = useState(15);
  const [fontWeight, setFontWeight] = useState<CaptionWeight>(DEFAULT_CAPTION_WEIGHT);
  const [fontSlant, setFontSlant] = useState<CaptionSlant>(DEFAULT_CAPTION_SLANT);

  useEffect(() => {
    if (!visible) return;
    setText(initial?.text ?? '');
    setFontId(initial?.fontId ?? DEFAULT_CAPTION_FONT);
    setColorId(initial?.colorId ?? DEFAULT_CAPTION_COLOR);
    setFontSize(initial?.fontSize ?? 15);
    setFontWeight(initial?.fontWeight ?? DEFAULT_CAPTION_WEIGHT);
    setFontSlant(initial?.fontSlant ?? DEFAULT_CAPTION_SLANT);
  }, [visible, initial]);

  const draft: WidgetCaption = {
    text: text.trim() || 'caption',
    nx: initial?.nx ?? 0.5,
    ny: initial?.ny ?? 0.88,
    fontSize: Math.round(fontSize),
    fontId,
    colorId,
    fontWeight,
    fontSlant,
  };

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onSave(null);
      return;
    }
    onSave({ ...draft, text: trimmed });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={st.root} edges={['top', 'bottom']}>
        <View style={st.bar}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={st.barGhost}>{labels.cancel}</Text>
          </TouchableOpacity>
          <Text style={st.barTitle}>{labels.title}</Text>
          <TouchableOpacity onPress={save} hitSlop={12}>
            <Text style={st.barDone}>{labels.done}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={st.previewBox}>
            <Text style={captionStyleFromWidget(draft)} numberOfLines={3}>
              {text.trim() || '…'}
            </Text>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder=""
            style={st.input}
            multiline
            maxLength={80}
            autoCorrect
            autoCapitalize="sentences"
            returnKeyType="done"
            blurOnSubmit
          />

          <View style={st.sizeRow}>
            <Text style={st.sectionLbl}>{labels.size}</Text>
            <Text style={st.sizeVal}>{Math.round(fontSize)}</Text>
          </View>
          <Slider
            style={st.slider}
            minimumValue={MIN_SIZE}
            maximumValue={MAX_SIZE}
            step={1}
            value={fontSize}
            onValueChange={setFontSize}
            minimumTrackTintColor="#c792c6"
            maximumTrackTintColor="rgba(0,0,0,0.08)"
            thumbTintColor="#b07a9a"
          />

          <Text style={st.sectionLbl}>{labels.weight}</Text>
          <View style={st.chipRow}>
            {CAPTION_WEIGHTS.map(w => (
              <TouchableOpacity
                key={w}
                style={[st.chip, fontWeight === w && st.chipOn]}
                onPress={() => setFontWeight(w)}
              >
                <Text style={[st.chipTxt, fontWeight === w && st.chipTxtOn]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={st.sectionLbl}>{labels.slant}</Text>
          <View style={st.chipRow}>
            {CAPTION_SLANTS.map(s => (
              <TouchableOpacity
                key={s}
                style={[st.chip, fontSlant === s && st.chipOn]}
                onPress={() => setFontSlant(s)}
              >
                <Text style={[st.chipTxt, fontSlant === s && st.chipTxtOn, s === 'italic' && st.italic]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={st.sectionLbl}>{labels.fonts}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.pillRow}>
            {CAPTION_FONT_IDS.map(id => (
              <TouchableOpacity
                key={id}
                style={[st.pill, fontId === id && st.pillOn]}
                onPress={() => setFontId(id)}
              >
                <Text style={[st.pillTxt, fontId === id && st.pillTxtOn]}>{id}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={st.sectionLbl}>{labels.colors}</Text>
          <View style={st.colorRow}>
            {CAPTION_COLOR_IDS.map(id => (
              <TouchableOpacity
                key={id}
                style={[
                  st.swatch,
                  { backgroundColor: CAPTION_COLORS[id] },
                  colorId === id && st.swatchOn,
                  (id === 'cream' || id === 'butter') && st.swatchBorder,
                ]}
                onPress={() => setColorId(id)}
              />
            ))}
          </View>
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  barGhost: { fontSize: 15, fontWeight: '600', color: '#9a8fa8' },
  barTitle: { fontSize: 16, fontWeight: '700', color: '#4a4258' },
  barDone: { fontSize: 15, fontWeight: '700', color: '#b07a9a' },
  body: { padding: 18, paddingBottom: 32, gap: 10 },
  previewBox: {
    minHeight: 52,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(199,146,198,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 72,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#3d3648',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.2)',
  },
  sizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sizeVal: { fontSize: 14, fontWeight: '800', color: '#b07a9a' },
  slider: { width: '100%', height: 36 },
  sectionLbl: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#9a8fa8',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.25)',
  },
  chipOn: { backgroundColor: '#c792c6', borderColor: '#c792c6' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#6b6178' },
  chipTxtOn: { color: '#fff' },
  italic: { fontStyle: 'italic' },
  pillRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.2)',
  },
  pillOn: { backgroundColor: '#4a4258', borderColor: '#4a4258' },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#6b6178', textTransform: 'capitalize' },
  pillTxtOn: { color: '#fff' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchOn: { borderWidth: 3, borderColor: '#4a4258' },
  swatchBorder: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
});
