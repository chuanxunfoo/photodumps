import { Image } from 'expo-image';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

// App mark — source may include padding; we zoom slightly so the blue squircle fills the frame.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BRAND = require('../assets/brand-icon.png');

type Props = { size?: number; style?: ViewStyle };

export function BrandMark({ size = 38, style }: Props) {
  const r = size * 0.26;
  const zoom = 1.2;
  const inner = size * zoom;
  const off = (inner - size) / 2;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: r }, style]}>
      <Image
        source={BRAND}
        accessibilityLabel="photodumps"
        style={{
          width: inner,
          height: inner,
          marginLeft: -off,
          marginTop: -off,
          borderRadius: r * zoom,
        }}
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 60, 160, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
});
