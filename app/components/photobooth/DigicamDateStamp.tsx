import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { CameraRigId } from '../../_lib/photobooth/types';
import { VINTAGE_DATE_RIGS } from '../../_lib/photobooth/types';

const RIG_FONT: Record<string, string | undefined> = {
  sony: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  canon: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fuji: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  leica: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
};

function formatStamp(d: Date, rigId: CameraRigId): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (rigId === 'leica') return `${yy}.${mo}.${dd}  ${hh}:${mm}`;
  if (rigId === 'canon') return `'${yy} ${mo} ${dd}  ${hh}:${mm}`;
  return `${yy} ${mo} ${dd}  ${hh}:${mm}`;
}

type Props = {
  rigId: CameraRigId;
  capturedAt?: number;
};

export function DigicamDateStamp({ rigId, capturedAt }: Props) {
  const label = useMemo(
    () => formatStamp(new Date(capturedAt ?? Date.now()), rigId),
    [rigId, capturedAt],
  );

  if (!VINTAGE_DATE_RIGS.includes(rigId)) return null;

  return (
    <View pointerEvents="none" style={st.wrap}>
      <Text style={[st.txt, { fontFamily: RIG_FONT[rigId] }]}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  txt: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
