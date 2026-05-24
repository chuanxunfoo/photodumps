/**
 * Widget maker — saved designs live in the app; home screen picks them via Dumplt widget (native build).
 */

import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Check, LayoutGrid, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { getLocaleUi } from '../_lib/localeUi';
import {
  deleteWidget,
  getActiveWidgetId,
  loadWidgets,
  setActiveWidgetId,
} from '../_lib/widgets/storage';
import { getWidgetTemplate, WIDGET_TEMPLATES } from '../_lib/widgets/templates';
import type { SavedWidget } from '../_lib/widgets/types';
import { AppHeader } from '../components/AppHeader';
import { resolveTypeface, useTheme } from './ThemeContext';

const { width: SW } = Dimensions.get('window');
const COLS = 2;
const GAP = 12;
const PAD = 18;
const CARD_W = (SW - PAD * 2 - GAP) / COLS;

export default function WidgetsScreen() {
  const goBack = useExploreAwareBack();
  const router = useRouter();
  const { theme, language } = useTheme();
  const u = getLocaleUi(language);
  const fonts = resolveTypeface(theme);

  const [saved, setSaved] = useState<SavedWidget[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void Promise.all([loadWidgets(), getActiveWidgetId()])
      .then(([list, active]) => {
        setSaved(list);
        setActiveId(active);
      })
      .finally(() => setRefreshing(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const confirmDelete = (w: SavedWidget) => {
    Alert.alert(u.widgetDeleteTitle, u.widgetDeleteMsg, [
      { text: u.captionCancel, style: 'cancel' },
      {
        text: u.widgetDeleteConfirm,
        style: 'destructive',
        onPress: () => void deleteWidget(w.id).then(refresh),
      },
    ]);
  };

  const chooseForHome = (w: SavedWidget) => {
    void setActiveWidgetId(w.id).then(() => {
      setActiveId(w.id);
      Alert.alert(u.widgetActiveTitle, u.widgetActiveMsg);
    });
  };

  return (
    <View style={[st.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={st.flex} edges={['top']}>
        <AppHeader variant="detail" onBack={goBack} subtitle={u.widgetsHeader} />
        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
        >
          <Text style={[st.title, { color: theme.text, fontFamily: fonts.titleFont }]}>{u.widgetsTitle}</Text>
          <Text style={[st.hint, { color: theme.textSub }]}>{u.widgetsHint}</Text>

          <Text style={[st.section, { color: theme.textMuted }]}>{u.widgetsMySection}</Text>
          {saved.length === 0 ? (
            <View style={[st.empty, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              <Text style={[st.emptyTxt, { color: theme.textSub }]}>{u.widgetsEmpty}</Text>
            </View>
          ) : (
            <View style={st.grid}>
              {saved.map(w => {
                const tmpl = getWidgetTemplate(w.templateId);
                const isActive = w.id === activeId;
                return (
                  <View key={w.id} style={[st.savedCard, { borderColor: theme.border, backgroundColor: theme.bg2 }]}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => chooseForHome(w)} onLongPress={() => confirmDelete(w)}>
                      <Image source={{ uri: w.previewUri }} style={st.savedImg} contentFit="cover" />
                      {isActive && (
                        <View style={[st.activeBadge, { backgroundColor: theme.accent }]}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                          <Text style={st.activeTxt}>{u.widgetOnHome}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={st.savedMeta}>
                      <Text style={[st.savedLbl, { color: theme.text }]} numberOfLines={1}>
                        {w.caption?.text || tmpl?.name || u.widgetsUntitled}
                      </Text>
                      <TouchableOpacity onPress={() => confirmDelete(w)} hitSlop={10}>
                        <Trash2 size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[st.section, { color: theme.textMuted, marginTop: 20 }]}>{u.widgetsCreateSection}</Text>
          <View style={st.grid}>
            {WIDGET_TEMPLATES.map(t => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.9}
                style={[st.card, { borderColor: theme.border, backgroundColor: theme.bg2 }]}
                onPress={() => router.push({ pathname: '/widget-editor', params: { templateId: t.id } })}
              >
                <View style={st.newBadge}>
                  <Plus size={14} color="#fff" />
                </View>
                <Image source={t.image} style={st.cardImg} contentFit="cover" />
                <Text style={[st.cardLbl, { color: theme.text }]} numberOfLines={1}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[st.note, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <LayoutGrid size={18} color={theme.textMuted} />
            <Text style={[st.noteTxt, { color: theme.textSub }]}>{u.widgetsNote}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: PAD, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  hint: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 10 },
  empty: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyTxt: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  savedCard: {
    width: CARD_W,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  savedImg: { width: CARD_W, height: Math.round(CARD_W * 0.85) },
  activeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  savedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  savedLbl: { flex: 1, fontSize: 12, fontWeight: '700', marginRight: 8 },
  card: {
    width: CARD_W,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImg: { width: CARD_W, height: Math.round(CARD_W * 0.72) },
  cardLbl: { fontSize: 13, fontWeight: '700', padding: 10, textAlign: 'center' },
  note: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  noteTxt: { flex: 1, fontSize: 12, lineHeight: 18 },
});
