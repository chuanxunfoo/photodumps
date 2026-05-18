import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';

const BLUE = '#3B5BFC';

type Props = {
  children: string;
  style?: TextStyle;
  sweepMs?: number;
  idleMs?: number;
};

/** Left-to-right highlight clipped to glyphs — no box around the word. */
export function ShimmerWord({ children, style, sweepMs = 1400, idleMs = 2600 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState({ w: 0, h: 48 });

  useEffect(() => {
    const run = () => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: sweepMs,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();
    };
    run();
    const id = setInterval(run, sweepMs + idleMs);
    return () => clearInterval(id);
  }, [idleMs, progress, sweepMs]);

  const bandW = Math.max(size.w * 0.45, 72);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandW, size.w + bandW],
  });

  const baseStyle: TextStyle = {
    fontSize: 42,
    fontWeight: '800',
    color: BLUE,
    letterSpacing: -2,
    fontFamily: Platform.select({ ios: 'AvenirNext-Heavy', android: 'sans-serif-black', default: undefined }),
    ...style,
  };

  return (
    <View style={styles.wrap}>
      <Text
        style={[baseStyle, styles.sizer]}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (w > 0) setSize({ w, h });
        }}
      >
        {children}
      </Text>

      <Text style={[baseStyle, styles.base]}>{children}</Text>

      {size.w > 0 ? (
        <MaskedView
          style={[styles.overlay, { width: size.w, height: size.h }]}
          maskElement={
            <View style={[styles.maskBox, { width: size.w, height: size.h }]}>
              <Text style={[baseStyle, { color: '#000' }]}>{children}</Text>
            </View>
          }
        >
          <Animated.View style={[styles.band, { width: bandW, height: size.h, transform: [{ translateX }] }]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,1)', 'rgba(255,255,255,0.25)', 'transparent']}
              locations={[0, 0.4, 0.5, 0.6, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </MaskedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', marginBottom: 10 },
  sizer: { position: 'absolute', opacity: 0 },
  base: {
    textShadowColor: 'rgba(107,138,255,0.4)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  overlay: { position: 'absolute', top: 0, left: 0 },
  maskBox: { justifyContent: 'center', alignItems: 'flex-start', backgroundColor: 'transparent' },
  band: { position: 'absolute', top: 0, left: 0 },
});
