/**
 * Widget editor — create or re-edit saved widgets.
 */

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, ImagePlus, Type } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
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
import { getWidgetById, saveWidget, updateWidget } from '../_lib/widgets/storage';
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
import { useTheme } from './ThemeContext';

const { width: SW } = Dimensions.get('window');
const CANVAS_W = SW - 28;
const STICKER_BASE = 88;

export default function WidgetEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string; family?: string; widgetId?: string }>();
  const { theme, language } = useTheme();
  const u = getLocaleUi(language);

  const [loading, setLoading] = useState(!!params.widgetId);
  const [editId, setEditId] = useState<string | null>(params.widgetId ?? null);
  const [templateId, setTemplateId] = useState(params.templateId ?? '');
  const [family, setFamily] = useState<WidgetFamily>(
    (params.family as WidgetFamily) ?? 'medium',
  );

  const template = getWidgetTemplate(templateId);
  const aspect = template ? familyAspect(family) : 1;
  const canvasH = Math.round(CANVAS_W / aspect);
  const templateSrc = template ? templateImage(template, family) : null;
  const isCutout = template?.kind === 'cutout';

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

  const selectedStickerIds = useMemo(() => placed.map(p => p.stickerId), [placed]);

  React.useEffect(() => {
    void loadStickers().then(setLibrary);
  }, []);

  React.useEffect(() => {
    if (!params.widgetId) return;
    void getWidgetById(params.widgetId).then(w => {
      if (!w) {
        Alert.alert(u.widgetSaveFailedTitle, u.templateNotFound);
        router.back();
        return;
      }
      setEditId(w.id);
      setTemplateId(w.templateId);
      setFamily(w.family ?? 'medium');
      setPlaced(w.stickers);
      setCaption(w.caption ?? null);
      setLoading(false);
    });
  }, [params.widgetId, router, u]);

  React.useEffect(() => {
    if (params.templateId && params.family) {
      setTemplateId(params.templateId);
      setFamily(params.family as WidgetFamily);
    }
  }, [params.templateId, params.family]);

  const onPickDone = useCallback(
    (picked: SavedSticker[]) => {
      setPickerOpen(false);
      const pickedIds = new Set(picked.map(p => p.id));

      setPlaced(prev => {
        const kept = prev.filter(p => pickedIds.has(p.stickerId));
        const newcomers = picked.filter(s => !prev.some(p => p.stickerId === s.id));
        const startIdx = kept.length;
        const added: WidgetPlacedSticker[] = newcomers.map((s, i) => {
          const pos = randomFreePosition(
            CANVAS_W,
            canvasH,
            STICKER_BASE,
            startIdx + i,
            Math.max(picked.length, 1),
          );
          return {
            key: `ws_${Date.now()}_${i}`,
            stickerId: s.id,
            uri: s.uri,
            x: pos.x,
            y: pos.y,
            scale: 1,
            rotation: 0,
          };
        });
        return [...kept, ...added];
      });

      if (picked.length > 0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [canvasH],
  );

  const onStickerChange = useCallback((key: string, patch: Partial<PlacedCutout>) => {
    setPlaced(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)));
  }, []);

  const persist = async () => {
    if (!exportRef.current || !template) return;
    setSaving(true);
    setCaptureClean(true);
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    try {
      const tmpUri = await captureWidgetPng(exportRef, isCutout);
      const payload = {
        templateId: template.id,
        family,
        kind: template.kind,
        stickers: placed,
        caption: caption ?? undefined,
      };
      if (editId) await updateWidget(editId, payload, tmpUri);
      else await saveWidget(payload, tmpUri);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/widgets');
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'NOT_FOUND'
          ? u.templateNotFound
          : u.widgetSaveFailedMsg;
      Alert.alert(u.widgetSaveFailedTitle, msg);
    } finally {
      setCaptureClean(false);
      setSaving(false);
    }
  };

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

  return (
    <>
      <GestureHandlerRootView style={[st.root, { backgroundColor: '#faf7f4' }]}>
        <SafeAreaView style={st.flex} edges={['top']}>
          <AppHeader variant="detail" onBack={() => router.back()} subtitle={`${template.name} · ${familyLabel}`} />

          <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={st.canvasWrap}>
              <View style={[st.sizeTag]}>
                <Text style={st.sizeTagTxt}>{familyLabel} widget</Text>
              </View>

              <View
                style={[
                  st.previewFrame,
                  { width: CANVAS_W + 16, height: canvasH + 16 },
                  isCutout && st.previewFrameCutout,
                ]}
              >
                <View style={[st.checker, { width: CANVAS_W, height: canvasH }]} />

                <View
                  ref={exportRef}
                  collapsable={false}
                  style={[st.canvas, { width: CANVAS_W, height: canvasH, backgroundColor: isCutout ? 'transparent' : undefined }]}
                >
                  {template.kind === 'full' ? (
                    <Image source={templateSrc} style={st.templateBg} contentFit="cover" />
                  ) : (
                    <LinearGradient
                      colors={['rgba(253,248,245,0)', 'rgba(253,248,245,0)']}
                      style={st.templateBg}
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

                  {template.kind === 'cutout' && (
                    <Image source={templateSrc} style={[st.templateBg, st.cutoutOverlay]} contentFit="cover" />
                  )}

                  {caption?.text && (
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
                  )}
                </View>
              </View>
            </View>

            <View style={st.toolbar}>
              <TouchableOpacity style={st.toolBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.88}>
                <ImagePlus size={18} color="#6b6178" />
                <Text style={st.toolTxt}>{u.widgetStickers}</Text>
              </TouchableOpacity>
              {template.captionEnabled && (
                <TouchableOpacity style={st.toolBtn} onPress={() => setCaptionOpen(true)} activeOpacity={0.88}>
                  <Type size={18} color="#6b6178" />
                  <Text style={st.toolTxt}>{u.widgetCaption}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[st.toolBtn, st.toolPrimary]}
                onPress={() => void persist()}
                disabled={saving || placed.length === 0}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Bookmark size={18} color="#fff" />
                    <Text style={st.toolPrimaryTxt}>{editId ? u.widgetUpdate : u.widgetSave}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={st.help}>{u.widgetHelp}</Text>
          </ScrollView>
        </SafeAreaView>
      </GestureHandlerRootView>

      <WidgetStickerPicker
        visible={pickerOpen}
        stickers={library}
        maxPick={template.maxStickers}
        initialSelectedIds={selectedStickerIds}
        onClose={() => setPickerOpen(false)}
        onDone={onPickDone}
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
  scroll: { paddingBottom: 36 },
  canvasWrap: { alignItems: 'center', paddingVertical: 14 },
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
  templateBg: { ...StyleSheet.absoluteFillObject },
  cutoutOverlay: { zIndex: 18 },
  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginTop: 8 },
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
  toolPrimary: { backgroundColor: '#c792c6', borderColor: '#c792c6' },
  toolPrimaryTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  help: { fontSize: 12, lineHeight: 18, paddingHorizontal: 22, marginTop: 12, textAlign: 'center', color: '#9a8fa8' },
});
