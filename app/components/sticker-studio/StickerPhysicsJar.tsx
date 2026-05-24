import { Accelerometer } from 'expo-sensors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Sticker } from 'lucide-react-native';
import type { SavedSticker } from '../../_lib/stickerStudio/types';
import {
  JAR_H,
  STICKER_D,
  STICKERS_PER_JAR,
  chunkStickers,
  spawnBodies,
  stepPhysics,
  type PhysicsBody,
} from './stickerPhysics';

type ThemeSlice = {
  bg2: string;
  bg3: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
};

type Props = {
  stickers: SavedSticker[];
  theme: ThemeSlice;
  onStickerPress: (s: SavedSticker) => void;
};

function PhysicsJarPage({
  stickers,
  theme,
  onStickerPress,
  active,
}: {
  stickers: SavedSticker[];
  theme: ThemeSlice;
  onStickerPress: (s: SavedSticker) => void;
  active: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [bodies, setBodies] = useState<PhysicsBody[]>([]);
  const bodiesRef = useRef<PhysicsBody[]>([]);
  const gravityRef = useRef({ x: 0, y: 280 });
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const stickerMap = useMemo(() => new Map(stickers.map(s => [s.id, s])), [stickers]);

  useEffect(() => {
    bodiesRef.current = bodies;
  }, [bodies]);

  useEffect(() => {
    if (width < 1) return;
    const next = spawnBodies(stickers, width, JAR_H, STICKER_D);
    bodiesRef.current = next;
    setBodies(next);
  }, [stickers, width]);

  useEffect(() => {
    if (!active || width < 1) return;

    let sub: { remove: () => void } | null = null;
    const smooth = { x: 0, y: 0 };

    void (async () => {
      const available = await Accelerometer.isAvailableAsync();
      if (available) {
        Accelerometer.setUpdateInterval(48);
        sub = Accelerometer.addListener(({ x, y }) => {
          smooth.x = smooth.x * 0.82 + x * 0.18;
          smooth.y = smooth.y * 0.82 + y * 0.18;
          gravityRef.current = {
            x: smooth.x * 920,
            y: smooth.y * 720 + 320,
          };
        });
      }
    })();

    const tick = (now: number) => {
      const last = lastRef.current || now;
      const dt = Math.min(0.032, (now - last) / 1000);
      lastRef.current = now;
      const g = gravityRef.current;
      const list = bodiesRef.current.map(b => ({ ...b }));
      stepPhysics(list, width, JAR_H, g.x, g.y, dt);
      bodiesRef.current = list;
      setBodies(list);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      sub?.remove();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, [active, width]);

  return (
    <View
      style={[
        st.jarFrame,
        {
          borderColor: theme.border,
          backgroundColor: theme.bg2,
        },
      ]}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
    >
      {stickers.length === 0 ? (
        <View style={st.empty}>
          <Sticker size={28} color={theme.textMuted} strokeWidth={1.5} />
          <Text style={[st.emptyTxt, { color: theme.textSub }]}>Container is empty</Text>
        </View>
      ) : (
        <View style={st.stage}>
          {bodies.map(b => {
            const sticker = stickerMap.get(b.id);
            if (!sticker) return null;
            const size = b.r * 2;
            return (
              <Pressable
                key={b.id}
                onPress={() => onStickerPress(sticker)}
                style={[
                  st.sticker,
                  {
                    left: b.x - b.r,
                    top: b.y - b.r,
                    width: size,
                    height: size,
                    transform: [{ rotate: `${b.rotation}deg` }],
                  },
                ]}
              >
                <Image source={{ uri: b.uri }} style={st.stickerImg} resizeMode="contain" />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const FALLBACK_W = Dimensions.get('window').width - 36;

export function StickerPhysicsJar({ stickers, theme, onStickerPress }: Props) {
  const pages = useMemo(() => chunkStickers(stickers, STICKERS_PER_JAR), [stickers]);
  const [page, setPage] = useState(0);
  const [jarW, setJarW] = useState(FALLBACK_W);
  const pageW = jarW > 0 ? jarW : FALLBACK_W;

  useEffect(() => {
    setPage(0);
  }, [stickers]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      setPage(Math.round(x / pageW));
    },
    [pageW],
  );

  const multi = pages.length > 1;

  return (
    <View style={st.wrap} onLayout={e => setJarW(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={st.pager}
      >
        {pages.map((pageStickers, i) => (
          <View key={`jar-${i}`} style={[st.page, { width: pageW }]}>
            <PhysicsJarPage
              stickers={pageStickers}
              theme={theme}
              onStickerPress={onStickerPress}
              active={page === i}
            />
            {multi && (
              <Text style={[st.pageLbl, { color: theme.textMuted }]}>
                Jar {i + 1} · {pageStickers.length}/{STICKERS_PER_JAR}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
      {multi && (
        <View style={st.dots}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={[
                st.dot,
                {
                  backgroundColor: i === page ? theme.accent : theme.border,
                  width: i === page ? 16 : 6,
                },
              ]}
            />
          ))}
          <Text style={[st.swipeHint, { color: theme.textMuted }]}>Swipe for next jar</Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginBottom: 14 },
  pager: { flexGrow: 0 },
  page: {},
  pageLbl: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  jarFrame: {
    height: JAR_H,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  stage: {
    flex: 1,
    position: 'relative',
  },
  sticker: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  stickerImg: {
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTxt: { fontSize: 14, fontWeight: '700' },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  swipeHint: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
});
