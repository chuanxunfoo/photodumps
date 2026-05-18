/**
 * FAQ — expandable cards, gradients, motion.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronLeft, HelpCircle, Sparkles } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { getFaqHero, getFaqItems } from '../_lib/localeContent';
import { getLocaleUi } from '../_lib/localeUi';
import { useTheme } from './ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function FaqRow({
  item,
  index,
  open,
  onToggle,
  theme,
  accent,
}: {
  item: { q: string; a: string };
  index: number;
  open: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  accent: string;
}) {
  const rotate = useRef(new Animated.Value(open ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.spring(rotate, { toValue: open ? 1 : 0, useNativeDriver: true, friction: 9 }).start();
  }, [open, rotate]);
  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onToggle} style={[s.rowWrap, { borderColor: theme.border }]}>
      <LinearGradient
        colors={open ? [accent + '22', theme.bg2] : [theme.bg2, theme.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.rowInner}
      >
        <View style={s.rowTop}>
          <View style={[s.qBadge, { backgroundColor: accent + '33' }]}>
            <Text style={[s.qBadgeTxt, { color: accent }]}>{String(index + 1).padStart(2, '0')}</Text>
          </View>
          <Text style={[s.q, { color: theme.text, flex: 1 }]}>{item.q}</Text>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <ChevronDown size={22} color={theme.textSub} />
          </Animated.View>
        </View>
        {open ? (
          <View style={s.aWrap}>
            <View style={[s.aRule, { backgroundColor: theme.border }]} />
            <Text style={[s.a, { color: theme.textSub }]}>{item.a}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function ExploreFaqScreen() {
  const { theme, language } = useTheme();
  const u = getLocaleUi(language);
  const faqHero = getFaqHero(language);
  const faqItems = getFaqItems(language);
  const goBack = useExploreAwareBack();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIdx((prev) => (prev === i ? null : i));
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg, '#1a0a2e', theme.bg]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={goBack} style={[s.back, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <ChevronLeft size={22} color={theme.textSub} />
          </TouchableOpacity>
          <Text style={[s.title, { color: theme.text }]}>{u.faqScreenTitle}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#4c1d95', '#be123c', '#f59e0b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
            <HelpCircle size={28} color="#fff" />
            <Text style={s.heroTitle}>{faqHero.heroTitle}</Text>
            <Text style={s.heroSub}>{u.faqScreenLead}</Text>
            <View style={s.heroSpark}>
              <Sparkles size={16} color="#FDE68A" />
              <Text style={s.heroSparkTxt}>{faqHero.heroTap}</Text>
            </View>
          </LinearGradient>

          {faqItems.map((item, i) => (
            <FaqRow
              key={i}
              item={item}
              index={i}
              open={openIdx === i}
              onToggle={() => toggle(i)}
              theme={theme}
              accent={theme.accent}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  back: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  hero: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    gap: 8,
  },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: '600', lineHeight: 21 },
  heroSpark: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  heroSparkTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  rowWrap: { borderRadius: 20, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  rowInner: { padding: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qBadgeTxt: { fontSize: 13, fontWeight: '900' },
  q: { fontSize: 15, fontWeight: '900', lineHeight: 21 },
  aWrap: { marginTop: 12 },
  aRule: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  a: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
});
