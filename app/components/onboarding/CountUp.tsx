import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, type TextStyle } from 'react-native';

type Props = {
  to: number;
  active: boolean;
  style?: TextStyle;
  suffix?: string;
  decimals?: number;
  duration?: number;
  delay?: number;
  useGrouping?: boolean;
};

export function CountUpText({
  to,
  active,
  style,
  suffix = '',
  decimals = 0,
  duration = 2400,
  delay = 0,
  useGrouping = true,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [label, setLabel] = useState(format(0, decimals, useGrouping));

  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      setLabel(format(0, decimals, useGrouping));
      return;
    }
    anim.setValue(0);
    const sub = anim.addListener(({ value }) => {
      setLabel(format(value, decimals, useGrouping));
    });
    Animated.timing(anim, {
      toValue: to,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(sub);
    };
  }, [active, anim, decimals, delay, duration, to, useGrouping]);

  return (
    <Text style={style}>
      {label}
      {suffix}
    </Text>
  );
}

function format(value: number, decimals: number, useGrouping: boolean) {
  if (decimals > 0) {
    const fixed = value.toFixed(decimals);
    if (!useGrouping) return fixed;
    const [intPart, decPart] = fixed.split('.');
    return `${Number(intPart).toLocaleString('en-US')}.${decPart}`;
  }
  const rounded = Math.round(value);
  return useGrouping ? rounded.toLocaleString('en-US') : String(rounded);
}
