/**
 * Rate photodumps: smooth drag — mood crossfades between emoji states.
 */
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { MinimalBackButton } from '../components/MinimalBackButton';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { submitAppRating } from './supabase';
import { useTheme } from './ThemeContext';

const MOODS = ['😠', '😕', '😐', '🙂', '😄', '🤩'] as const;
const THUMB = 44;
const H_PAD = 8;

function MoodEmojiLayer({
  progress,
  index,
  fontSize,
  emoji,
}: {
  progress: SharedValue<number>;
  index: number;
  fontSize: number;
  emoji: string;
}) {
  const animated = useAnimatedStyle(() => {
    const n = MOODS.length;
    const t = progress.value * (n - 1);
    const i = Math.floor(t);
    const f = t - i;
    let opacity = 0;
    if (index === i) opacity = 1 - f;
    else if (index === i + 1) opacity = f;
    return { opacity, position: 'absolute' as const };
  });
  return (
    <Animated.Text style={[{ fontSize, lineHeight: fontSize * 1.05 }, animated]}>
      {emoji}
    </Animated.Text>
  );
}

function MoodStack({
  progress,
  fontSize,
  style,
}: {
  progress: SharedValue<number>;
  fontSize: number;
  style?: object;
}) {
  return (
    <View style={[{ width: fontSize * 1.2, height: fontSize * 1.15, alignItems: 'center', justifyContent: 'center' }, style]}>
      {MOODS.map((m, index) => (
        <MoodEmojiLayer key={m} progress={progress} index={index} fontSize={fontSize} emoji={m} />
      ))}
    </View>
  );
}

export default function ExploreRateScreen() {
  const { theme } = useTheme();
  const goBack = useExploreAwareBack();
  const progress = useSharedValue(0.65);
  const startP = useSharedValue(0);
  const trackWidth = useSharedValue(280);
  const ratingRef = useRef(0.65);
  const [labelPos, setLabelPos] = useState(0.65);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const syncLabel = useCallback((p: number) => {
    ratingRef.current = p;
    setLabelPos(p);
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      startP.value = progress.value;
    })
    .onUpdate((e) => {
      const r = Math.max(1, trackWidth.value - THUMB - H_PAD);
      progress.value = clamp(startP.value + e.translationX / r, 0, 1);
    })
    .onEnd(() => {
      runOnJS(syncLabel)(progress.value);
    });

  const thumbStyle = useAnimatedStyle(() => {
    const tw = trackWidth.value;
    const rng = Math.max(0, tw - THUMB - H_PAD);
    return {
      transform: [{ translateX: progress.value * rng }],
    };
  });

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidth.value = w;
  };

  const moodCaption =
    labelPos < 0.2 ? 'Ouch — we want to fix that'
      : labelPos < 0.45 ? 'Room to grow'
        : labelPos < 0.7 ? 'Pretty solid'
          : labelPos < 0.88 ? 'You love us!'
            : 'Main character energy';

  const send = async () => {
    if (submitting) return;
    setSubmitting(true);
    const ver = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
    const res = await submitAppRating({
      rating: ratingRef.current,
      comment: comment.trim() || null,
      platform: Platform.OS,
      appVersion: String(ver),
    });
    setSubmitting(false);
    if (res.ok) {
      setSent(true);
    } else {
      Alert.alert('Could not save', res.error ?? 'Try again later.');
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={s.top}>
            <MinimalBackButton onPress={goBack} color={theme.textSub} style={s.backSlot} />
            <Text style={[s.title, { color: theme.text }]}>Rate photodumps</Text>
            <View style={s.backSlot} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 22, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[s.sub, { color: theme.textSub }]}>
              Drag the smiley along the rainbow bar — from grumpy to absolutely glowing. Optional note below!
            </Text>

            <View style={[s.faceCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              <MoodStack progress={progress} fontSize={64} />
              <Text style={[s.moodLabel, { color: theme.textMuted }]}>{moodCaption}</Text>
            </View>

            <Text style={[s.label, { color: theme.text }]}>Slide your happiness</Text>
            <GestureDetector gesture={pan}>
              <View style={[s.trackWrap, { borderColor: theme.border }]} onLayout={onTrackLayout}>
                <LinearGradient
                  colors={[theme.danger + 'AA', theme.accent + 'DD', '#00FFA3']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View style={[s.thumb, thumbStyle]}>
                  <MoodStack progress={progress} fontSize={26} />
                </Animated.View>
              </View>
            </GestureDetector>
            <View style={s.rowEnds}>
              <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700' }}>grumpy</Text>
              <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700' }}>ecstatic</Text>
            </View>

            <Text style={[s.label, { color: theme.text, marginTop: 22 }]}>Anything else? (optional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Feature wish, bug, or just vibes…"
              placeholderTextColor={theme.textMuted}
              multiline
              editable={!sent}
              style={[s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
            />

            {sent ? (
              <View style={[s.thanks, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                <Text style={[s.thanksTxt, { color: theme.text }]}>Thank you — we read every single one.</Text>
              </View>
            ) : (
              <TouchableOpacity activeOpacity={0.9} onPress={() => void send()} disabled={submitting} style={{ marginTop: 18 }}>
                <LinearGradient colors={[theme.accent, theme.accent + 'AA']} style={s.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {submitting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={s.ctaTxt}>Send my rating</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  backSlot: { width: 36 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  sub: { fontSize: 14, lineHeight: 21, fontWeight: '600', marginBottom: 20 },
  faceCard: { alignItems: 'center', paddingVertical: 22, borderRadius: 22, borderWidth: 1, marginBottom: 24 },
  moodLabel: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  trackWrap: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  thumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: 'rgba(255,255,255,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
  },
  rowEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  input: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  thanks: { marginTop: 18, padding: 16, borderRadius: 16, borderWidth: 1 },
  thanksTxt: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  cta: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  ctaTxt: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
