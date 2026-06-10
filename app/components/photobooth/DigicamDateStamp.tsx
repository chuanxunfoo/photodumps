import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { CameraRigId } from '../../_lib/photobooth/types';
import { VINTAGE_DATE_RIGS } from '../../_lib/photobooth/types';

/** Classic digicam orange stamp — MM.DD.YYYY HH:MM */
function formatStamp(d: Date): string {
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${mo}.${dd}.${yyyy} ${hh}:${mm}`;
}

const LCD_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

type Props = {
  rigId: CameraRigId;
  capturedAt?: number;
};

function StampedDigits({ label }: { label: string }) {
  const stroke = [
    { left: -1, top: 0 },
    { left: 1, top: 0 },
    { left: 0, top: -1 },
    { left: 0, top: 1 },
  ];
  return (
    <View style={st.wrap}>
      {stroke.map((o, i) => (
        <Text
          key={i}
          style={[st.txt, st.stroke, { left: o.left, top: o.top }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ))}
      <Text style={st.txt} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function DigicamDateStamp({ rigId, capturedAt }: Props) {
  const label = useMemo(
    () => formatStamp(new Date(capturedAt ?? Date.now())),
    [capturedAt],
  );

  if (!VINTAGE_DATE_RIGS.includes(rigId)) return null;

  return <StampedDigits label={label} />;
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  txt: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontFamily: LCD_FONT,
    fontVariant: ['tabular-nums'],
  },
  stroke: {
    position: 'absolute',
    color: '#000000',
  },
});
