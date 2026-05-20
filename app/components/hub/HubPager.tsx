import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../(tabs)/ThemeContext';

export type HubPagerHandle = {
  scrollToIndex: (index: number, animated?: boolean) => void;
};

type Props = {
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
};

export const HubPager = forwardRef<HubPagerHandle, Props>(function HubPager(
  { initialIndex = 0, onIndexChange, children },
  ref,
) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(winW || Dimensions.get('window').width);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);

  const clampIndex = (i: number) => Math.max(0, Math.min(2, i));

  const commitIndex = useCallback((i: number) => {
    const clamped = clampIndex(i);
    setIndex(clamped);
    onIndexChange?.(clamped);
    return clamped;
  }, [onIndexChange]);

  const scrollToIndex = useCallback((i: number, animated = true) => {
    const clamped = commitIndex(i);
    scrollRef.current?.scrollTo({ x: clamped * pageWidth, animated });
  }, [commitIndex, pageWidth]);

  useImperativeHandle(ref, () => ({ scrollToIndex }), [scrollToIndex]);

  const syncIndexFromOffset = (x: number) => {
    if (pageWidth <= 0) return;
    commitIndex(Math.round(x / pageWidth));
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncIndexFromOffset(e.nativeEvent.contentOffset.x);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const i = clampIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
    if (i !== index) setIndex(i);
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - pageWidth) > 1) {
          requestAnimationFrame(() => setPageWidth(w));
        }
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        bounces={false}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        contentOffset={{ x: initialIndex * pageWidth, y: 0 }}
      >
        {children.map((child, i) => (
          <View key={i} style={[styles.page, { width: pageWidth }]} collapsable={false}>
            {child}
          </View>
        ))}
      </ScrollView>
      <View style={[styles.dots, { bottom: Math.max(insets.bottom, 8) + 6 }]} pointerEvents="none">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? theme.accent : theme.border,
                width: i === index ? 18 : 6,
                opacity: i === index ? 1 : 0.55,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  page: { flex: 1 },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: { height: 6, borderRadius: 3 },
});
