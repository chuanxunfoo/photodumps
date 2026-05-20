import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STUDIO_STEPS } from './stickerStudioUi';

type Props = {
  activeIndex: number;
};

export function StickerStepBar({ activeIndex }: Props) {
  return (
    <View style={st.row}>
      {STUDIO_STEPS.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <View key={label} style={st.step}>
            <View
              style={[
                st.dot,
                done && st.dotDone,
                active && st.dotActive,
              ]}
            >
              <Text style={[st.dotTxt, (done || active) && st.dotTxtOn]}>{i + 1}</Text>
            </View>
            <Text style={[st.lbl, active && st.lblActive, done && st.lblDone]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: 'rgba(0,229,255,0.25)', borderColor: '#00E5FF' },
  dotActive: { backgroundColor: '#FF0055', borderColor: '#FF8EC7' },
  dotTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900' },
  dotTxtOn: { color: '#fff' },
  lbl: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  lblActive: { color: '#FF8EC7', fontWeight: '900' },
  lblDone: { color: 'rgba(0,229,255,0.85)' },
});
