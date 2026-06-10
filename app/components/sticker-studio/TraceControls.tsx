import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  TRACE_COLOR_PRESETS,
  TRACE_STYLE_OPTIONS,
  TRACE_WIDTH_MAX,
  TRACE_WIDTH_MIN,
} from '../../_lib/stickerStudio/frameStroke';
import type { TraceSettings, TraceStyle } from '../../_lib/stickerStudio/types';

type Props = {
  trace: TraceSettings;
  onChange: (next: TraceSettings) => void;
  theme: {
    text: string;
    textSub: string;
    textMuted: string;
    accent: string;
    border: string;
    bg2: string;
    bg3: string;
    isDark: boolean;
  };
};

const WIDTH_MIN = 2;
const WIDTH_MAX = 24;

export function TraceControls({ trace, onChange, theme }: Props) {
  const setStyle = (style: TraceStyle) => {
    void Haptics.selectionAsync();
    const next: TraceSettings = { ...trace, style };
    if (style === 'chalk-plus' && trace.color === '#FFFFFF') {
      next.color = '#FFB3C8';
    }
    if (style === 'toon' && trace.color === '#FFB3C8') {
      next.color = '#FFFFFF';
    }
    if (style === 'none') {
      next.width = 0;
    } else if (trace.width < TRACE_WIDTH_MIN) {
      next.width = 9;
    }
    onChange(next);
  };

  const setColor = (color: string) => {
    void Haptics.selectionAsync();
    onChange({ ...trace, color });
  };

  const hasTrace = trace.style !== 'none';

  return (
    <View style={st.root}>
      <Text style={[st.sectionLbl, { color: theme.textMuted }]}>TRACE STYLE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={st.styleRow}
      >
        {TRACE_STYLE_OPTIONS.map(opt => {
          const selected = trace.style === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setStyle(opt.id)}
              style={[st.styleChip, { borderColor: selected ? '#FFD54F' : theme.border }, selected && st.styleChipOn]}
            >
              <Text style={[st.styleChipLbl, { color: selected ? theme.accent : theme.textSub }]}>{opt.label}</Text>
              <Text style={[st.styleChipHint, { color: theme.textMuted }]} numberOfLines={2}>
                {opt.hint}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          void Haptics.selectionAsync();
          onChange({ ...trace, dashWrap: !trace.dashWrap });
        }}
        style={[
          st.dashToggle,
          { borderColor: trace.dashWrap ? '#FFD54F' : theme.border },
          trace.dashWrap && st.dashToggleOn,
        ]}
      >
        <Text style={[st.dashToggleLbl, { color: trace.dashWrap ? theme.accent : theme.textSub }]}>
          {trace.dashWrap ? 'Dash wrap on' : '+ Dash wrap'}
        </Text>
        <Text style={[st.dashToggleHint, { color: theme.textMuted }]}>
          Dashed ring around shape — independent of trace style
        </Text>
      </TouchableOpacity>

      {hasTrace && (
        <>
          <Text style={[st.sectionLbl, { color: theme.textMuted, marginTop: 14 }]}>TRACE COLOUR</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={st.colorRow}
          >
            {TRACE_COLOR_PRESETS.map(p => {
              const selected = trace.color.toUpperCase() === p.color.toUpperCase();
              const isLight =
                p.color === '#FFFFFF' ||
                p.color === '#FFF8E7' ||
                p.color === '#FFF4A3' ||
                p.color === '#FFEC8A' ||
                p.color === '#E8D4FF' ||
                p.color === '#B8E8FF' ||
                p.color === '#C8E6C9';
              return (
                <TouchableOpacity key={p.color} onPress={() => setColor(p.color)} style={st.colorWrap}>
                  <View
                    style={[
                      st.colorDot,
                      { backgroundColor: p.color },
                      isLight && { borderWidth: 1, borderColor: theme.border },
                      selected && st.colorDotOn,
                    ]}
                  />
                  <Text style={[st.colorLbl, { color: selected ? theme.accent : theme.textMuted }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={st.sliderHead}>
            <Text style={[st.sectionLbl, { color: theme.textMuted, marginTop: 0 }]}>THICKNESS</Text>
            <Text style={[st.widthVal, { color: theme.text }]}>{Math.round(trace.width)}px</Text>
          </View>
          <Slider
            style={st.slider}
            minimumValue={TRACE_WIDTH_MIN}
            maximumValue={TRACE_WIDTH_MAX}
            step={1}
            value={trace.width}
            onValueChange={v => {
              const width = Math.round(v);
              onChange({ ...trace, width });
            }}
            onSlidingComplete={v => {
              onChange({ ...trace, width: Math.round(v) });
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            minimumTrackTintColor="#FF0055"
            maximumTrackTintColor={theme.bg3}
            thumbTintColor="#FFD54F"
          />
          <View style={st.sliderEnds}>
            <Text style={[st.sliderEnd, { color: theme.textMuted }]}>Hairline</Text>
            <Text style={[st.sliderEnd, { color: theme.textMuted }]}>Extra bold</Text>
          </View>
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { width: '100%', paddingHorizontal: 16 },
  sectionLbl: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 8 },
  styleRow: { gap: 8, paddingRight: 8 },
  styleChip: {
    width: 88,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  styleChipOn: { backgroundColor: 'rgba(255,107,157,0.18)', borderColor: '#FF8EC7' },
  styleChipLbl: { fontSize: 12, fontWeight: '900' },
  styleChipHint: { fontSize: 9, textAlign: 'center', marginTop: 4, lineHeight: 12, fontWeight: '600' },
  colorRow: { gap: 14, paddingRight: 8, paddingBottom: 4 },
  colorWrap: { alignItems: 'center', gap: 4 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotOn: { borderWidth: 3, borderColor: '#FFD54F', transform: [{ scale: 1.08 }] },
  colorLbl: { fontSize: 9, fontWeight: '700' },
  sliderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  widthVal: { fontSize: 13, fontWeight: '800' },
  slider: { width: '100%', height: 36, marginTop: 2 },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  sliderEnd: { fontSize: 10, fontWeight: '600' },
  dashToggle: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dashToggleOn: { backgroundColor: 'rgba(255,213,79,0.14)', borderColor: '#FFD54F' },
  dashToggleLbl: { fontSize: 12, fontWeight: '900' },
  dashToggleHint: { fontSize: 9, marginTop: 4, lineHeight: 12, fontWeight: '600' },
});
