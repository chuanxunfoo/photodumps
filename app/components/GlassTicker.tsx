import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, View } from 'react-native';

const { width: W } = Dimensions.get('window');

type Props = {
  text: string;
  hues?: [string, string, string];
  speed?: number;
  height?: number;
  fontSize?: number;
};

export function GlassTicker({
  text,
  hues = ['#FF0055', '#7C3AED', '#00E5FF'],
  speed = 10000,
  height = 32,
  fontSize = 11,
}: Props) {
  const scroll = useRef(new Animated.Value(0)).current;
  const hue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      scroll.setValue(0);
      Animated.timing(scroll, {
        toValue: -W,
        duration: speed,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => run());
    };
    run();
    return () => scroll.stopAnimation();
  }, [scroll, speed]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(hue, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [hue]);

  const overlayOp = hue.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.55, 0.2, 0.45, 0.55] });

  const full = `${text}   ◆   ${text}   ◆   ${text}   ◆   `;

  const inner = (
    <View style={st.inner}>
      <LinearGradient colors={[hues[0], hues[1], hues[2]]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayOp }]}>
        <LinearGradient colors={[hues[2], hues[0], hues[1]]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <LinearGradient
        colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={st.topSheen} />
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: scroll }] }}>
        {[0, 1, 2, 3].map(i => (
          <Text key={i} style={[st.txt, { fontSize }]}>{full}</Text>
        ))}
      </Animated.View>
    </View>
  );

  return (
    <View style={[st.wrap, { height }]}>
      {Platform.OS === 'web' ? (
        <View style={[st.blurFallback, StyleSheet.absoluteFill]}>{inner}</View>
      ) : (
        <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill}>
          {inner}
        </BlurView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginHorizontal: 14,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  blurFallback: { backgroundColor: 'rgba(18,18,28,0.82)' },
  inner: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  txt: {
    color: 'rgba(255,255,255,0.96)',
    fontWeight: '800',
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    fontFamily: Platform.select({
      ios: 'Avenir Next Condensed',
      android: 'sans-serif-condensed',
      default: 'System',
    }),
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
