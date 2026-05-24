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
  DEFAULT_CAPTION_COLOR,
  DEFAULT_CAPTION_FONT,
  captionTextStyle,
  type CaptionColorId,
  type CaptionFontId,
} from '../../_lib/widgets/captionPresets';
import type { WidgetCaption } from '../../_lib/widgets/types';

const MIN_SIZE = 11;
const MAX_SIZE = 28;

type Labels = {
  title: string;
  placeholder: string;
  cancel: string;
  done: string;
  fonts: string;
  colors: string;
  size: string;
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

  useEffect(() => {
    if (!visible) return;
    setText(initial?.text ?? '');
    setFontId(initial?.fontId ?? DEFAULT_CAPTION_FONT);
    setColorId(initial?.colorId ?? DEFAULT_CAPTION_COLOR);
    setFontSize(initial?.fontSize ?? 15);
  }, [visible, initial?.text, initial?.fontId, initial?.colorId, initial?.fontSize]);

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onSave(null);
      return;
    }
    onSave({
      text: trimmed,
      nx: initial?.nx ?? 0.5,
      ny: initial?.ny ?? 0.88,
      fontSize: Math.round(fontSize),
      fontId,
      colorId,
    });
  };

  const previewStyle = captionTextStyle(fontId, colorId, Math.round(fontSize));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
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

        <ScrollView
          contentContainerStyle={st.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={st.previewLbl}>Preview</Text>
          <View style={st.previewBox}>
            <Text style={[st.previewTxt, previewStyle]} numberOfLines={3}>
              {text.trim() || labels.placeholder}
            </Text>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={labels.placeholder}
            placeholderTextColor="#999"
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
            minimumTrackTintColor="#3d3428"
            maximumTrackTintColor="rgba(0,0,0,0.12)"
            thumbTintColor="#3d3428"
          />

          <Text style={st.sectionLbl}>{labels.fonts}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.pillRow}>
            {CAPTION_FONT_IDS.map(id => (
              <TouchableOpacity
                key={id}
                style={[st.pill, fontId === id && st.pillOn]}
                onPress={() => setFontId(id)}
                activeOpacity={0.88}
              >
                <Text style={[st.pillTxt, captionTextStyle(id, 'ink', 13), fontId === id && st.pillTxtOn]}>
                  {id}
                </Text>
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
                  id === 'cream' && st.swatchBorder,
                ]}
                onPress={() => setColorId(id)}
                activeOpacity={0.88}
              />
            ))}
          </View>

          <Text style={st.hint}>Drag the text on the template to move it. Tap the trash icon to remove.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf6ee' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  barGhost: { fontSize: 15, fontWeight: '600', color: '#666' },
  barTitle: { fontSize: 16, fontWeight: '700', color: '#2a2418' },
  barDone: { fontSize: 15, fontWeight: '700', color: '#3d3428' },
  body: { padding: 18, paddingBottom: 32, gap: 10 },
  previewLbl: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#6b5f4a',
  },
  previewBox: {
    minHeight: 56,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(60,50,35,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTxt: { textAlign: 'center' },
  input: {
    minHeight: 88,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
    textAlignVertical: 'top',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sizeVal: { fontSize: 14, fontWeight: '800', color: '#3d3428' },
  slider: { width: '100%', height: 36 },
  sectionLbl: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#6b5f4a',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6b5f4a',
    marginTop: 8,
    textAlign: 'center',
  },
  pillRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  pillOn: { backgroundColor: '#3d3428' },
  pillTxt: { textTransform: 'capitalize' },
  pillTxtOn: { color: '#fff' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchOn: { borderWidth: 3, borderColor: '#3d3428' },
  swatchBorder: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
});
