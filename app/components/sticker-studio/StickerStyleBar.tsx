import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  TRACE_COLOR_PRESETS,
  TRACE_WIDTH_MAX,
  TRACE_WIDTH_MIN,
  getTraceRenderParams,
} from '../../_lib/stickerStudio/traceRenderer';
import type { TraceSettings, TraceStyle } from '../../_lib/stickerStudio/types';

const STYLE_PRESETS: {
  style: TraceStyle;
  color: string;
  width: number;
  label: string;
}[] = [
  { style: 'chalk', color: '#FFFFFF', width: 10, label: 'White' },
  { style: 'chalk', color: '#FFD54F', width: 12, label: 'Gold' },
  { style: 'chalk-plus', color: '#FFB3C8', width: 9, label: 'Pink' },
  { style: 'glow', color: '#FFFFFF', width: 8, label: 'Glow' },
  { style: 'toon', color: '#FFFFFF', width: 9, label: 'Toon' },
  { style: 'none', color: '#FFFFFF', width: 0, label: 'None' },
];

/** Symmetric sticker blob — outline preview matches real trace better than a “bunny”. */
const SILHOUETTE =
  'M32 10 C20 10 12 18 12 30 C12 40 16 48 22 52 L32 58 L42 52 C48 48 52 40 52 30 C52 18 44 10 32 10 Z';

type ThemeSlice = {
  text: string;
  textSub: string;
  accent: string;
  border: string;
  bg2: string;
  bg3: string;
  isDark: boolean;
};

type Props = {
  trace: TraceSettings;
  onChange: (t: TraceSettings) => void;
  theme: ThemeSlice;
};

function TracePreviewIcon({ trace, selected, theme }: { trace: TraceSettings; selected: boolean; theme: ThemeSlice }) {
  const params = getTraceRenderParams(trace);
  const strokeW = trace.style === 'none' ? 0 : Math.max(1.5, trace.width * 0.45);
  const fill = theme.isDark ? '#3a3a44' : '#d4d4dc';

  return (
    <View
      style={[
        pv.wrap,
        { backgroundColor: theme.bg2, borderColor: theme.border },
        selected && { borderColor: theme.accent, backgroundColor: theme.isDark ? '#1f1f28' : '#f0f0f5' },
      ]}
    >
      <Svg width={52} height={52} viewBox="0 0 64 64">
        {params && trace.style === 'glow' ? (
          <>
            <Path d={SILHOUETTE} fill={fill} stroke={trace.color} strokeWidth={strokeW + 4} opacity={0.35} />
            <Path d={SILHOUETTE} fill={fill} stroke={trace.color} strokeWidth={strokeW} strokeLinejoin="round" />
          </>
        ) : (
          <Path
            d={SILHOUETTE}
            fill={fill}
            stroke={trace.style === 'none' ? 'transparent' : trace.color}
            strokeWidth={strokeW}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </Svg>
    </View>
  );
}

export function StickerStyleBar({ trace, onChange, theme }: Props) {
  const applyPreset = (p: (typeof STYLE_PRESETS)[0]) => {
    void Haptics.selectionAsync();
    onChange({ style: p.style, color: p.color, width: p.width });
  };

  const isPreset = (p: (typeof STYLE_PRESETS)[0]) =>
    trace.style === p.style &&
    trace.color.toUpperCase() === p.color.toUpperCase() &&
    trace.width === p.width;

  return (
    <View style={st.root}>
      <Text style={[st.lbl, { color: theme.textSub }]}>Outline style</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.styleRow}>
        {STYLE_PRESETS.map(p => (
          <TouchableOpacity key={`${p.style}-${p.color}-${p.width}`} onPress={() => applyPreset(p)} activeOpacity={0.85}>
            <TracePreviewIcon trace={p} selected={isPreset(p)} theme={theme} />
            <Text style={[st.presetLbl, { color: theme.textSub }, isPreset(p) && { color: theme.accent, fontWeight: '800' }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[st.lbl, { color: theme.textSub }]}>Colour</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.colorRow}>
        {TRACE_COLOR_PRESETS.slice(0, 12).map(p => {
          const on = trace.color.toUpperCase() === p.color.toUpperCase();
          const light =
            p.color === '#FFFFFF' ||
            p.color === '#FFF8E7' ||
            p.color === '#FFF4A3' ||
            p.color === '#FFEC8A';
          return (
            <TouchableOpacity
              key={p.color}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange({ ...trace, color: p.color });
              }}
              style={[
                st.colorDot,
                { backgroundColor: p.color },
                light && { borderWidth: 1, borderColor: theme.border },
                on && { borderColor: theme.accent, borderWidth: 2.5 },
              ]}
            />
          );
        })}
      </ScrollView>

      {trace.style !== 'none' && (
        <View style={st.sliderRow}>
          <Text style={[st.sliderLbl, { color: theme.textSub }]}>Thickness</Text>
          <Slider
            style={st.slider}
            minimumValue={TRACE_WIDTH_MIN}
            maximumValue={TRACE_WIDTH_MAX}
            step={1}
            value={trace.width}
            onValueChange={v => onChange({ ...trace, width: Math.round(v) })}
            minimumTrackTintColor={theme.accent}
            maximumTrackTintColor={theme.bg3}
            thumbTintColor={theme.accent}
          />
          <Text style={[st.sliderVal, { color: theme.text }]}>{Math.round(trace.width)}</Text>
        </View>
      )}
    </View>
  );
}

const pv = StyleSheet.create({
  wrap: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

const st = StyleSheet.create({
  root: { gap: 8 },
  lbl: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginLeft: 2 },
  styleRow: { gap: 10, paddingVertical: 2 },
  presetLbl: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 4, width: 58 },
  colorRow: { gap: 8, paddingVertical: 2 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sliderLbl: { fontSize: 11, fontWeight: '700', width: 68 },
  slider: { flex: 1, height: 28 },
  sliderVal: { fontSize: 12, fontWeight: '800', width: 22, textAlign: 'right' },
});
