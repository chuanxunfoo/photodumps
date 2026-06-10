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

/** Heart silhouette — outline wraps the shape cleanly. */
const HEART =
  'M32 54 C32 54 10 36 10 24 C10 14 18 8 26 12 C30 6 34 6 38 12 C46 8 54 14 54 24 C54 36 32 54 32 54 Z';

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
  const strokeW = trace.style === 'none' ? 0 : Math.max(1.8, trace.width * 0.42);
  const fill = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[pv.wrap, selected && pv.wrapOn, { borderColor: selected ? theme.accent : theme.border }]}>
      <Svg width={48} height={48} viewBox="0 0 64 64">
        {params && trace.style === 'glow' ? (
          <>
            <Path d={HEART} fill={fill} stroke={trace.color} strokeWidth={strokeW + 3} opacity={0.35} strokeLinejoin="round" />
            <Path d={HEART} fill={fill} stroke={trace.color} strokeWidth={strokeW} strokeLinejoin="round" strokeLinecap="round" />
          </>
        ) : (
          <Path
            d={HEART}
            fill={fill}
            stroke={trace.style === 'none' ? 'transparent' : trace.color}
            strokeWidth={strokeW}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {trace.dashWrap && (
          <Path
            d={HEART}
            fill="none"
            stroke="#F5D547"
            strokeWidth={Math.max(1.4, strokeW * 0.55)}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="5 4"
          />
        )}
      </Svg>
    </View>
  );
}

export function StickerStyleBar({ trace, onChange, theme }: Props) {
  const applyPreset = (p: (typeof STYLE_PRESETS)[0]) => {
    void Haptics.selectionAsync();
    onChange({ style: p.style, color: p.color, width: p.width, dashWrap: trace.dashWrap });
  };

  const isPreset = (p: (typeof STYLE_PRESETS)[0]) =>
    trace.style === p.style &&
    trace.color.toUpperCase() === p.color.toUpperCase() &&
    trace.width === p.width;

  return (
    <View style={st.panel}>
      <Text style={[st.title, { color: theme.textSub }]}>Outline</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.styleRow}>
        {STYLE_PRESETS.map(p => (
          <TouchableOpacity key={`${p.style}-${p.color}-${p.width}`} onPress={() => applyPreset(p)} activeOpacity={0.88}>
            <TracePreviewIcon trace={{ ...p, dashWrap: trace.dashWrap }} selected={isPreset(p)} theme={theme} />
            <Text style={[st.presetLbl, { color: theme.textSub }, isPreset(p) && { color: theme.accent }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          void Haptics.selectionAsync();
          onChange({ ...trace, dashWrap: !trace.dashWrap });
        }}
        style={[
          st.dashToggle,
          { borderColor: trace.dashWrap ? theme.accent : theme.border },
          trace.dashWrap && { backgroundColor: 'rgba(245,213,71,0.12)' },
        ]}
      >
        <Text style={[st.dashToggleLbl, { color: trace.dashWrap ? theme.accent : theme.textSub }]}>
          {trace.dashWrap ? 'Dash wrap on' : '+ Dash wrap'}
        </Text>
        <Text style={[st.dashToggleHint, { color: theme.textSub }]}>
          Extra dashed ring — separate from outline style
        </Text>
      </TouchableOpacity>

      <Text style={[st.title, { color: theme.textSub, marginTop: 4 }]}>Colour</Text>
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
                on && st.colorDotOn,
              ]}
            />
          );
        })}
      </ScrollView>

      {trace.style !== 'none' && (
        <View style={st.sliderRow}>
          <Text style={[st.sliderLbl, { color: theme.textSub }]}>Weight</Text>
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
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  wrapOn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});

const st = StyleSheet.create({
  panel: { gap: 5 },
  title: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  styleRow: { gap: 8, paddingVertical: 2 },
  presetLbl: { fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 4, width: 54 },
  colorRow: { gap: 8, paddingVertical: 2 },
  colorDot: { width: 26, height: 26, borderRadius: 13 },
  colorDotOn: { borderWidth: 2.5, borderColor: '#F5D547', transform: [{ scale: 1.08 }] },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sliderLbl: { fontSize: 11, fontWeight: '600', width: 52 },
  slider: { flex: 1, height: 28 },
  sliderVal: { fontSize: 12, fontWeight: '800', width: 22, textAlign: 'right' },
  dashToggle: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  dashToggleLbl: { fontSize: 12, fontWeight: '800' },
  dashToggleHint: { fontSize: 9, fontWeight: '600', marginTop: 3, lineHeight: 12 },
});
