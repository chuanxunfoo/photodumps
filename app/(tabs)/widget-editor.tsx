/**
 * Widget editor — create or re-edit saved widgets.
 */

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, ImagePlus, Type } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadStickers } from '../_lib/stickerStudio/storage';
import type { PlacedCutout, SavedSticker } from '../_lib/stickerStudio/types';
import { captureWidgetPng } from '../_lib/widgets/captureWidget';
import {
  DEFAULT_CAPTION_COLOR,
  DEFAULT_CAPTION_FONT,
  DEFAULT_CAPTION_SLANT,
  DEFAULT_CAPTION_WEIGHT,
} from '../_lib/widgets/captionPresets';
import { randomFreePosition } from '../_lib/widgets/placement';
import { getActiveWidgetId, getWidgetById, saveWidget, setActiveWidgetId, updateWidget } from '../_lib/widgets/storage';
import {
  getWidgetTemplate,
  templateImage,
} from '../_lib/widgets/templates';
import type { WidgetCaption, WidgetPlacedSticker } from '../_lib/widgets/types';
import type { WidgetFamily } from '../_lib/widgets/widgetSizes';
import { familyAspect, WIDGET_FAMILIES } from '../_lib/widgets/widgetSizes';
import { AppHeader } from '../components/AppHeader';
import { DraggableCutout } from '../components/sticker-studio/DraggableCutout';
import { DraggableCaption } from '../components/widgets/DraggableCaption';
import { WidgetCaptionModal } from '../components/widgets/WidgetCaptionModal';
import { WidgetStickerPicker } from '../components/widgets/WidgetStickerPicker';
import { getLocaleUi } from '../_lib/localeUi';
import { useRequireProFeature } from '../_lib/useRequireProFeature';
import { useTheme } from './ThemeContext';

const { width: SW } = Dimensions.get('window');
const CANVAS_W = SW - 28;
const STICKER_BASE = 88;

function routeParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  const v = Array.isArray(value) ? value[0] : value;
  const t = v?.trim();
  return t && t.length > 0 ? t : undefined;
}

function blankCanvas() {
  return {
    placed: [] as WidgetPlacedSticker[],
    caption: null as WidgetCaption | null,
    selectedKey: null as string | null,
    captionSelected: false,
  };
}

export default function WidgetEditorScreen() {
  const proAllowed = useRequireProFeature();
  const router = useRouter();
  const params = useLocalSearchParams<{
    templateId?: string;
    family?: string;
    widgetId?: string;
    mode?: string;
    session?: string;
  }>();
  const routeWidgetId = routeParam(params.widgetId);
  const routeTemplateId = routeParam(params.templateId);
  const routeFamily = routeParam(params.family) as WidgetFamily | undefined;
  const routeSession = routeParam(params.session);
  const isEditMode =
    routeParam(params.mode) === 'edit' || Boolean(routeWidgetId);

  const { theme, language } = useTheme();
  const u = getLocaleUi(language);
  const alertCopyRef = useRef({ title: u.widgetSaveFailedTitle, notFound: u.templateNotFound });
  alertCopyRef.current = { title: u.widgetSaveFailedTitle, notFound: u.templateNotFound };

  const [loading, setLoading] = useState(isEditMode);
  const [editId, setEditId] = useState<string | null>(isEditMode ? routeWidgetId ?? null : null);
  const [templateId, setTemplateId] = useState(routeTemplateId ?? '');
  const [family, setFamily] = useState<WidgetFamily>(routeFamily ?? 'medium');

  const template = getWidgetTemplate(templateId);
  const aspect = template ? familyAspect(family) : 1;
  const canvasH = Math.round(CANVAS_W / aspect);
  const templateSrc = template ? templateImage(template, family) : null;

  const [library, setLibrary] = useState<SavedSticker[]>([]);
  const [placed, setPlaced] = useState<WidgetPlacedSticker[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [caption, setCaption] = useState<WidgetCaption | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [captionSelected, setCaptionSelected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [captureClean, setCaptureClean] = useState(false);

  const exportRef = useRef<View>(null);
  const loadGen = useRef(0);

  const selectedStickerIds = useMemo(() => placed.map(p => p.stickerId), [placed]);

  React.useEffect(() => {
    void loadStickers().then(setLibrary);
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !routeWidgetId) return;

    const gen = ++loadGen.current;
    setLoading(true);
    void getWidgetById(routeWidgetId).then(w => {
      if (gen !== loadGen.current) return;
      if (!w) {
        Alert.alert(alertCopyRef.current.title, alertCopyRef.current.notFound);
        router.back();
        return;
      }
      setEditId(w.id);
      setTemplateId(w.templateId);
      setFamily(w.family ?? 'medium');
      setPlaced(Array.isArray(w.stickers) ? w.stickers : []);
      setCaption(w.caption ?? null);
      setSelectedKey(null);
      setCaptionSelected(false);
      setLoading(false);
    });
  }, [isEditMode, routeWidgetId]);

  React.useEffect(() => {
    if (isEditMode) return;

    const blank = blankCanvas();
    setEditId(null);
    setPlaced(blank.placed);
    setCaption(blank.caption);
    setSelectedKey(blank.selectedKey);
    setCaptionSelected(blank.captionSelected);
    if (routeTemplateId) setTemplateId(routeTemplateId);
    if (routeFamily) setFamily(routeFamily);
    setLoading(false);
  }, [isEditMode, routeSession, routeTemplateId, routeFamily]);

  const onStickerToggle = useCallback(
    (sticker: SavedSticker, selected: boolean) => {
      if (!template) return;
      if (selected) {
        setPlaced(prev => {
          if (prev.some(p => p.stickerId === sticker.id)) return prev;
          if (prev.length >= template.maxStickers) return prev;
          const pos = randomFreePosition(
            CANVAS_W,
            canvasH,
            STICKER_BASE,
            prev.length,
            template.maxStickers,
          );
          return [
            ...prev,
            {
              key: `ws_${Date.now()}_${sticker.id}`,
              stickerId: sticker.id,
              uri: sticker.uri,
              x: pos.x,
              y: pos.y,
              scale: 1,
              rotation: 0,
            },
          ];
        });
      } else {
        setPlaced(prev => {
          const removedKey = prev.find(p => p.stickerId === sticker.id)?.key;
          if (removedKey) {
            setSelectedKey(sk => (sk === removedKey ? null : sk));
          }
          return prev.filter(p => p.stickerId !== sticker.id);
        });
      }
    },
    [canvasH, template],
  );

  const onStickerChange = useCallback((key: string, patch: Partial<PlacedCutout>) => {
    setPlaced(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)));
  }, []);

  const persist = async () => {
    if (!template) {
      Alert.alert(u.widgetSaveFailedTitle, u.templateNotFound);
      return;
    }
    if (!exportRef.current) {
      Alert.alert(u.widgetSaveFailedTitle, u.widgetSaveFailedMsg);
      return;
    }
    if (!isEditMode && placed.length === 0) return;

    setSaving(true);
    setCaptureClean(true);
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise(r => setTimeout(r, 80));
    try {
      const tmpUri = await captureWidgetPng(exportRef);
      const payload = {
        templateId: template.id,
        family,
        kind: template.kind,
        stickers: placed,
        caption: caption ?? undefined,
      };
      const hadActive = await getActiveWidgetId();
      if (isEditMode && editId) {
        await updateWidget(editId, payload, tmpUri);
      } else {
        const created = await saveWidget(payload, tmpUri);
        if (!hadActive) await setActiveWidgetId(created.id);
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!hadActive && !isEditMode) {
        Alert.alert(u.widgetActiveTitle, u.widgetActiveMsg);
      }
      router.replace('/widgets');
    } catch (e) {
      const detail = e instanceof Error ? e.message : '';
      if (__DEV__) console.warn('widget persist failed:', detail || e);
      const hint =
        detail === 'NO_VIEW' || detail === 'CAPTURE_EMPTY'
          ? 'Could not capture the canvas. Try again.'
          : detail === 'NOT_FOUND'
            ? 'This widget was removed. Go back and create a new one.'
            : detail === 'PREVIEW_WRITE_FAILED' || detail === 'NO_DOCUMENTS'
              ? 'Could not write the preview image.'
              : u.widgetSaveFailedMsg;
      Alert.alert(u.widgetSaveFailedTitle, hint);
    } finally {
      setCaptureClean(false);
      setSaving(false);
    }
  };

  if (!proAllowed) return null;

  if (loading) {
    return (
      <View style={[st.root, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!template || !templateSrc) {
    return (
      <View style={[st.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={st.flex}>
          <AppHeader variant="detail" onBack={() => router.back()} subtitle={u.widgetsHeader} />
          <Text style={{ color: theme.text, padding: 24 }}>{u.templateNotFound}</Text>
        </SafeAreaView>
      </View>
    );
  }

  const familyLabel = WIDGET_FAMILIES[family].label;
  const canSave = isEditMode || placed.length > 0;

  return (
    <>
      <GestureHandlerRootView style={[st.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={st.flex} edges={['top']}>
          <AppHeader variant="detail" onBack={() => router.replace('/widgets')} subtitle={`${template.name} · ${familyLabel}`} />

          <View style={st.body}>
            <View style={st.canvasWrap}>
              <View style={st.sizeTag}>
                <Text style={st.sizeTagTxt}>
                  {isEditMode ? 'Editing' : 'New'} · {familyLabel} widget
                </Text>
              </View>

              <View
                style={[
                  st.previewFrame,
                  st.previewFrameCutout,
                  { width: CANVAS_W + 16, height: canvasH + 16 },
                ]}
              >
                <View style={[st.checker, { width: CANVAS_W, height: canvasH }]} />

                <View
                  ref={exportRef}
                  collapsable={false}
                  style={[st.canvas, { width: CANVAS_W, height: canvasH, backgroundColor: 'transparent' }]}
                >
                  {template.kind === 'full' && (
                    <Image
                      source={templateSrc}
                      style={st.templateBg}
                      contentFit="contain"
                      pointerEvents="none"
                    />
                  )}

                  {template.kind === 'cutout' && (
                    <Image
                      source={templateSrc}
                      style={st.templateBg}
                      contentFit="contain"
                      pointerEvents="none"
                    />
                  )}

                  {placed.map(p => (
                    <DraggableCutout
                      key={p.key}
                      item={p}
                      boundW={CANVAS_W}
                      boundH={canvasH}
                      baseSize={STICKER_BASE}
                      selected={selectedKey === p.key}
                      hideChrome={captureClean}
                      onSelect={() => {
                        setSelectedKey(p.key);
                        setCaptionSelected(false);
                      }}
                      onRemove={() => {
                        setPlaced(prev => prev.filter(x => x.key !== p.key));
                        if (selectedKey === p.key) setSelectedKey(null);
                      }}
                      onChange={onStickerChange}
                    />
                  ))}

                  {caption?.text ? (
                    <DraggableCaption
                      caption={caption}
                      canvasW={CANVAS_W}
                      canvasH={canvasH}
                      hideChrome={captureClean}
                      selected={captionSelected}
                      onSelect={() => {
                        setCaptionSelected(true);
                        setSelectedKey(null);
                      }}
                      onRemove={() => {
                        setCaption(null);
                        setCaptionSelected(false);
                      }}
                      onChange={patch => setCaption(prev => (prev ? { ...prev, ...patch } : prev))}
                    />
                  ) : null}
                </View>
              </View>

              <Text style={st.canvasHint}>
                Drag stickers · pinch to resize · tap Caption for text
              </Text>
            </View>

            <View style={st.toolbar}>
              <TouchableOpacity style={st.toolBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.88}>
                <ImagePlus size={18} color="#6b6178" />
                <Text style={st.toolTxt}>{u.widgetStickers}</Text>
                {placed.length > 0 && (
                  <View style={[st.badge, { backgroundColor: theme.accent }]}>
                    <Text style={st.badgeTxt}>{placed.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              {template.captionEnabled && (
                <TouchableOpacity
                  style={st.toolBtn}
                  onPress={() => {
                    setCaptionOpen(true);
                    setSelectedKey(null);
                  }}
                  activeOpacity={0.88}
                >
                  <Type size={18} color="#6b6178" />
                  <Text style={st.toolTxt}>{u.widgetCaption}</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[st.saveRow, { backgroundColor: theme.accent }, (!canSave || saving) && st.saveRowDisabled]}
              onPress={() => void persist()}
              disabled={!canSave || saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Bookmark size={20} color="#fff" />
                  <Text style={st.saveRowTxt}>{isEditMode ? u.widgetUpdate : u.widgetSave}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={st.help}>{u.widgetHelp}</Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>

      <WidgetStickerPicker
        visible={pickerOpen}
        stickers={library}
        maxPick={template.maxStickers}
        selectedIds={selectedStickerIds}
        onClose={() => setPickerOpen(false)}
        onToggle={onStickerToggle}
      />

      <WidgetCaptionModal
        visible={captionOpen}
        initial={caption}
        labels={{
          title: u.captionModalTitle,
          cancel: u.captionCancel,
          done: u.captionDone,
          fonts: u.captionFonts,
          colors: u.captionColors,
          size: u.captionSize,
          weight: u.captionWeight,
          slant: u.captionSlant,
        }}
        onClose={() => setCaptionOpen(false)}
        onSave={next => {
          setCaptionOpen(false);
          if (!next) {
            setCaption(null);
            setCaptionSelected(false);
            return;
          }
          setCaption({
            ...next,
            nx: caption?.nx ?? 0.5,
            ny: caption?.ny ?? 0.88,
            fontSize: next.fontSize ?? 15,
            fontId: next.fontId ?? DEFAULT_CAPTION_FONT,
            colorId: next.colorId ?? DEFAULT_CAPTION_COLOR,
            fontWeight: next.fontWeight ?? DEFAULT_CAPTION_WEIGHT,
            fontSlant: next.fontSlant ?? DEFAULT_CAPTION_SLANT,
          });
          setCaptionSelected(true);
          setSelectedKey(null);
        }}
      />
    </>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { flex: 1, paddingBottom: 20 },
  canvasWrap: { alignItems: 'center', paddingVertical: 10 },
  sizeTag: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(199,146,198,0.18)',
  },
  sizeTagTxt: { fontSize: 11, fontWeight: '700', color: '#9a7a9a', letterSpacing: 0.6 },
  previewFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.22)',
  },
  previewFrameCutout: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  checker: {
    position: 'absolute',
    borderRadius: 12,
    opacity: 0.35,
    backgroundColor: '#eee',
  },
  canvas: { borderRadius: 12, overflow: 'hidden' },
  templateBg: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  canvasHint: {
    fontSize: 11,
    color: '#9a8fa8',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginTop: 4 },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(199,146,198,0.25)',
  },
  toolTxt: { fontSize: 13, fontWeight: '600', color: '#6b6178' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveRowDisabled: { opacity: 0.45 },
  saveRowTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  help: { fontSize: 12, lineHeight: 18, paddingHorizontal: 22, marginTop: 12, textAlign: 'center', color: '#9a8fa8' },
});
