/**
 * Widget maker — saved designs + template picker with iOS size filter.
 */

import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { Check, Home, Pencil, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
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
import { getLocaleUi } from '../_lib/localeUi';
import {
  deleteWidget,
  getActiveWidgetId,
  loadWidgets,
  setActiveWidgetId,
} from '../_lib/widgets/storage';
import {
  getWidgetTemplate,
  templateImage,
  templatesForFamily,
} from '../_lib/widgets/templates';
import type { SavedWidget } from '../_lib/widgets/types';
import { familyAspect, WIDGET_FAMILIES, type WidgetFamily } from '../_lib/widgets/widgetSizes';
import { AppHeader } from '../components/AppHeader';
import { resolveTypeface, useTheme } from './ThemeContext';

const { width: SW } = Dimensions.get('window');
const COLS = 2;
const GAP = 12;
const PAD = 18;
const CARD_W = (SW - PAD * 2 - GAP) / COLS;

const SIZE_FILTERS: WidgetFamily[] = ['small', 'medium', 'large'];

export default function WidgetsScreen() {
  const router = useRouter();
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/hub', params: { page: 'features' } });
  }, [router]);
  const { theme, language } = useTheme();
  const u = getLocaleUi(language);
  const fonts = resolveTypeface(theme);

  const [saved, setSaved] = useState<SavedWidget[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sizeFilter, setSizeFilter] = useState<WidgetFamily>('medium');

  const templates = useMemo(() => templatesForFamily(sizeFilter), [sizeFilter]);
  const cardH = Math.round(CARD_W / familyAspect(sizeFilter));

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

  const setHome = (w: SavedWidget) => {
    void setActiveWidgetId(w.id).then(() => {
      setActiveId(w.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(u.widgetActiveTitle, u.widgetActiveMsg);
    });
  };

  const openEdit = (w: SavedWidget) => {
    router.push({
      pathname: '/widget-editor',
      params: {
        mode: 'edit',
        widgetId: w.id,
        templateId: w.templateId,
        family: w.family ?? 'medium',
        session: String(Date.now()),
      },
    });
  };

  const openNew = (templateId: string) => {
    router.push({
      pathname: '/widget-editor',
      params: {
        mode: 'new',
        templateId,
        family: sizeFilter,
        session: String(Date.now()),
      },
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
          <Text style={[st.title, { fontFamily: fonts.titleFont }]}>{u.widgetsTitle}</Text>
          <Text style={st.hint}>{u.widgetsHint}</Text>

          <Text style={st.section}>{u.widgetsMySection}</Text>
          {saved.length === 0 ? (
            <View style={st.empty}>
              <Text style={st.emptyTxt}>{u.widgetsEmpty}</Text>
            </View>
          ) : (
            <View style={st.grid}>
              {saved.map(w => {
                const tmpl = getWidgetTemplate(w.templateId);
                const isActive = w.id === activeId;
                return (
                  <View key={w.id} style={st.savedCard}>
                    <TouchableOpacity activeOpacity={0.92} onPress={() => openEdit(w)} onLongPress={() => confirmDelete(w)}>
                      <Image
                        source={{ uri: w.previewUri }}
                        style={[st.savedImg, { height: cardH * 0.85 }]}
                        contentFit="cover"
                      />
                      {isActive && (
                        <View style={[st.activeBadge, { backgroundColor: theme.accent }]}>
                          <Check size={11} color="#fff" strokeWidth={3} />
                          <Text style={st.activeTxt}>{u.widgetOnHome}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={st.savedMeta}>
                      <Text style={st.savedLbl} numberOfLines={1}>
                        {w.caption?.text || tmpl?.name || u.widgetsUntitled}
                      </Text>
                      <View style={st.savedActions}>
                        <TouchableOpacity onPress={() => openEdit(w)} hitSlop={8}>
                          <Pencil size={15} color="#9a8fa8" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setHome(w)} hitSlop={8}>
                          <Home size={15} color={isActive ? theme.accent : theme.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(w)} hitSlop={8}>
                          <Trash2 size={15} color="#d4a0a8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[st.section, { marginTop: 22 }]}>{u.widgetsCreateSection}</Text>

          <View style={st.filterRow}>
            {SIZE_FILTERS.map(f => {
              const on = sizeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[st.filterPill, on && [st.filterPillOn, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                  onPress={() => setSizeFilter(f)}
                  activeOpacity={0.88}
                >
                  <Text style={[st.filterTxt, on && st.filterTxtOn]}>{WIDGET_FAMILIES[f].label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={st.filterHint}>{u.widgetSizeHint}</Text>

          <View style={st.grid}>
            {templates.map(t => (
              <TouchableOpacity key={`${t.id}-${sizeFilter}`} activeOpacity={0.92} style={st.card} onPress={() => openNew(t.id)}>
                <View style={st.newBadge}>
                  <Plus size={13} color="#fff" />
                </View>
                <Image
                  source={templateImage(t, sizeFilter)}
                  style={[st.cardImg, { height: cardH, backgroundColor: t.kind === 'cutout' ? 'transparent' : undefined }]}
                  contentFit="cover"
                />
                <Text style={st.cardLbl} numberOfLines={1}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={st.note}>
            <Text style={st.noteTxt}>{u.widgetsNote}</Text>
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
  title: { fontSize: 24, fontWeight: '800', marginTop: 8, marginBottom: 4, color: '#4a4258' },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 16, color: '#9a8fa8' },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10, color: '#b07a9a' },
  empty: {
    padding: 22,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.2)',
    marginBottom: 8,
  },
  emptyTxt: { fontSize: 14, lineHeight: 20, textAlign: 'center', color: '#9a8fa8' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  savedCard: {
    width: CARD_W,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.22)',
    overflow: 'hidden',
  },
  savedImg: { width: CARD_W, backgroundColor: 'transparent' },
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
    backgroundColor: '#c792c6',
  },
  activeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  savedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  savedLbl: { flex: 1, fontSize: 12, fontWeight: '700', marginRight: 8, color: '#4a4258' },
  savedActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.25)',
  },
  filterPillOn: { backgroundColor: '#c792c6', borderColor: '#c792c6' },
  filterTxt: { fontSize: 12, fontWeight: '700', color: '#9a8fa8' },
  filterTxtOn: { color: '#fff' },
  filterHint: { fontSize: 11, color: '#b07a9a', marginBottom: 12, lineHeight: 16 },
  card: {
    width: CARD_W,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.22)',
    overflow: 'hidden',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74,66,88,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImg: { width: CARD_W, backgroundColor: 'transparent' },
  cardLbl: { fontSize: 12, fontWeight: '700', padding: 10, textAlign: 'center', color: '#4a4258' },
  note: {
    marginTop: 24,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.18)',
  },
  noteTxt: { fontSize: 12, lineHeight: 18, color: '#9a8fa8' },
});
