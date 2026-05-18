import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface TickerProps {
  text: string;
  bg: string;
  color: string;
  speed?: number;
  height?: number;
  fontSize?: number;
}

export function Ticker({ text, bg, color, speed = 9000, height = 30, fontSize = 10 }: TickerProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: -width,
        duration: speed,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => run());
    };
    run();
    return () => anim.stopAnimation();
  }, [speed]);

  const full = `${text}   •   ${text}   •   ${text}   •   `;

  return (
    <View style={[styles.wrap, { height, backgroundColor: bg, overflow: 'hidden', justifyContent: 'center' }]}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: anim }] }}>
        {[0, 1, 2, 3].map((i) => (
          <Text key={i} style={[styles.text, { color, fontSize }]}>{full}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  text: { fontWeight: '800', letterSpacing: 1.2 },
});