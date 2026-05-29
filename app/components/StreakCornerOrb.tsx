import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadStreakState } from '../_lib/streakLogic';

function shouldHideStreakOrb(pathname: string): boolean {
  const p = pathname || '';
  if (p.includes('/streak')) return true;
  if (p.includes('/auth')) return true;
  if (p.includes('/onboarding')) return true;
  return false;
}

/** Compact top-right chip — flame + count, does not reserve a full row. */
export function StreakCornerOrb() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void loadStreakState().then((s) => setCount(Math.max(0, s.current)));
  }, [pathname]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (shouldHideStreakOrb(pathname)) return null;

  const top = insets.top + (Platform.OS === 'ios' ? 4 : 8);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.anchor, { top, right: Math.max(10, insets.right + 2) }]}
    >
      <Pressable
        onPress={() => router.push('/streak')}
        accessibilityRole="button"
        accessibilityLabel="View streak"
        style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <LinearGradient
            colors={['#FF6B2C', '#FF0055', '#FF9F43']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chip}
          >
            <View style={styles.flameWrap}>
              <Flame size={17} color="#FFFFFF" strokeWidth={2.4} fill="rgba(255,255,255,0.22)" />
            </View>
            <Text style={styles.count}>{count > 99 ? '99+' : count}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 20000,
    elevation: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 11,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.42)',
    shadowColor: '#FF2200',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  flameWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    minWidth: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
});
