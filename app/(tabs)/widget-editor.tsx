/**
 * Decorate a widget template with saved stickers + caption, then save in-app.
 */

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, ImagePlus, Type } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
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
import type { SavedSticker } from '../_lib/stickerStudio/types';
import type { PlacedCutout } from '../_lib/stickerStudio/types';
import { captureWidgetPng } from '../_lib/widgets/captureWidget';
import {
  clampStickerToZones,
  initialStickerPositions,
  randomFreePosition,
} from '../_lib/widgets/placement';
import { saveWidget } from '../_lib/widgets/storage';
import {
  getWidgetTemplate,
  resolveTemplateAspectRatio,
} from '../_lib/widgets/templates';
import type { WidgetCaption, WidgetPlacedSticker } from '../_lib/widgets/types';
import { AppHeader } from '../components/AppHeader';
import { DraggableCutout } from '../components/sticker-studio/DraggableCutout';
import { DraggableCaption } from '../components/widgets/DraggableCaption';
import { WidgetCaptionModal } from '../components/widgets/WidgetCaptionModal';
import { WidgetStickerPicker } from '../components/widgets/WidgetStickerPicker';
import { ZoneOverlay } from '../components/widgets/ZoneOverlay';
import { getLocaleUi } from '../_lib/localeUi';
import { DEFAULT_CAPTION_COLOR, DEFAULT_CAPTION_FONT } from '../_lib/widgets/captionPresets';
import { useTheme } from './ThemeContext';

const { width: SW } = Dimensions.get('window');
const CANVAS_W = SW - 24;
const STICKER_BASE = 88;

export default function WidgetEditorScreen() {
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const template = getWidgetTemplate(templateId ?? '');
  const { theme, language } = useTheme();
  const u = getLocaleUi(language);

  const [aspect, setAspect] = useState(template?.aspectRatio ?? 1.4);
  const [library, setLibrary] = useState<SavedSticker[]>([]);
  const [placed, setPlaced] = useState<WidgetPlacedSticker[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [caption, setCaption] = useState<WidgetCaption | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [captionSelected, setCaptionSelected] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [saving, setSaving] = useState(false);
  const [captureClean, setCaptureClean] = useState(false);

  const canvasH = Math.round(CANVAS_W / aspect);
  const exportRef = useRef<View>(null);

  React.useEffect(() => {
    void loadStickers().then(setLibrary);
  }, []);

  React.useEffect(() => {
    if (template) resolveTemplateAspectRatio(template, setAspect);
  }, [template?.id]);

  if (!template) {
    return (
      <View style={[st.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={st.flex}>
          <AppHeader variant="detail" onBack={() => router.back()} subtitle={u.widgetsHeader} />
          <Text style={{ color: theme.text, padding: 24 }}>{u.templateNotFound}</Text>
        </SafeAreaView>
      </View>
    );
  }

  const onPickDone = useCallback(
    (picked: SavedSticker[]) => {
      setPickerOpen(false);
      if (picked.length === 0) return;
      const positions =
        template.placementMode === 'zones' && template.zones?.length
          ? initialStickerPositions(picked.length, template.zones, CANVAS_W, canvasH, STICKER_BASE)
          : picked.map((_, i) => randomFreePosition(CANVAS_W, canvasH, STICKER_BASE, i, picked.length));

      const next: WidgetPlacedSticker[] = picked.map((s, i) => ({
        key: `ws_${Date.now()}_${i}`,
        stickerId: s.id,
        uri: s.uri,
        x: positions[i]?.x ?? 20,
        y: positions[i]?.y ?? 20,
        scale: 1,
        rotation: 0,
      }));
      setPlaced(next);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [template, canvasH],
  );

  const onStickerChange = useCallback(
    (key: string, patch: Partial<PlacedCutout>) => {
      setPlaced(prev =>
        prev.map(p => {
          if (p.key !== key) return p;
          let x = patch.x ?? p.x;
          let y = patch.y ?? p.y;
          const scale = patch.scale ?? p.scale;
          if (template.placementMode === 'zones' && template.zones?.length) {
            const size = STICKER_BASE * scale;
            const clamped = clampStickerToZones(x, y, size, template.zones, CANVAS_W, canvasH);
            x = clamped.x;
            y = clamped.y;
          }
          return { ...p, ...patch, x, y, scale };
        }),
      );
    },
    [template, canvasH],
  );

  const saveToApp = async () => {
    if (!exportRef.current) return;
    setSaving(true);
    setCaptureClean(true);
    setShowZones(false);
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    try {
      const tmpUri = await captureWidgetPng(exportRef);
      await saveWidget(
        {
          templateId: template.id,
          stickers: placed,
          caption: caption ?? undefined,
        },
        tmpUri,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/widgets');
      Alert.alert(u.widgetSavedTitle, u.widgetSavedMsg);
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'NO_DOCUMENTS'
          ? 'Could not access app storage. Try restarting the app.'
          : e instanceof Error && e.message.startsWith('PREVIEW')
            ? 'Could not save the widget image. Try again.'
            : u.widgetSaveFailedMsg;
      Alert.alert(u.widgetSaveFailedTitle, msg);
    } finally {
      setCaptureClean(false);
      setShowZones(true);
      setSaving(false);
    }
  };

  const onCaptionChange = useCallback((patch: Partial<WidgetCaption>) => {
    setCaption(prev => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <>
      <GestureHandlerRootView style={[st.root, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={st.flex} edges={['top']}>
          <AppHeader variant="detail" onBack={() => router.back()} subtitle={template.name} />

          <ScrollView
            contentContainerStyle={st.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={st.canvasWrap}>
              <View
                ref={exportRef}
                collapsable={false}
                style={[st.canvas, { width: CANVAS_W, height: canvasH }]}
              >
                <Image source={template.image} style={st.templateBg} contentFit="fill" />
                {template.placementMode === 'zones' && template.zones && (
                  <ZoneOverlay
                    zones={template.zones}
                    canvasW={CANVAS_W}
                    canvasH={canvasH}
                    visible={showZones && !captureClean}
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
                    onChange={onCaptionChange}
                  />
                )}
              </View>
            </View>

            <View style={st.toolbar}>
              <TouchableOpacity
                style={[st.toolBtn, { borderColor: theme.border }]}
                onPress={() => setPickerOpen(true)}
                activeOpacity={0.88}
              >
                <ImagePlus size={18} color={theme.text} />
                <Text style={[st.toolTxt, { color: theme.text }]}>{u.widgetStickers}</Text>
              </TouchableOpacity>
              {template.captionEnabled && (
                <TouchableOpacity
                  style={[st.toolBtn, { borderColor: theme.border }]}
                  onPress={() => setCaptionOpen(true)}
                  activeOpacity={0.88}
                >
                  <Type size={18} color={theme.text} />
                  <Text style={[st.toolTxt, { color: theme.text }]}>{u.widgetCaption}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[st.toolBtn, st.toolPrimary, { backgroundColor: theme.accent }]}
                onPress={() => void saveToApp()}
                disabled={saving || placed.length === 0}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Bookmark size={18} color="#fff" />
                    <Text style={st.toolPrimaryTxt}>{u.widgetSave}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[st.help, { color: theme.textMuted }]}>{u.widgetHelp}</Text>
          </ScrollView>
        </SafeAreaView>
      </GestureHandlerRootView>

      <WidgetStickerPicker
        visible={pickerOpen}
        stickers={library}
        maxPick={template.maxStickers}
        onClose={() => setPickerOpen(false)}
        onDone={onPickDone}
      />

      <WidgetCaptionModal
        visible={captionOpen}
        initial={caption}
        labels={{
          title: u.captionModalTitle,
          placeholder: u.captionPlaceholder,
          cancel: u.captionCancel,
          done: u.captionDone,
          fonts: u.captionFonts,
          colors: u.captionColors,
          size: u.captionSize,
        }}
        onClose={() => setCaptionOpen(false)}
        onSave={next => {
          setCaptionOpen(false);
          if (!next) {
            setCaption(null);
            setCaptionSelected(false);
            return;
          }
          const defaultNy = template.id === 'picnic-table' ? 0.32 : 0.88;
          setCaption({
            ...next,
            nx: caption?.nx ?? 0.5,
            ny: caption?.ny ?? defaultNy,
            fontSize: next.fontSize ?? 15,
            fontId: next.fontId ?? DEFAULT_CAPTION_FONT,
            colorId: next.colorId ?? DEFAULT_CAPTION_COLOR,
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
  canvasWrap: { alignItems: 'center', paddingVertical: 12 },
  canvas: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  templateBg: { ...StyleSheet.absoluteFillObject },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  toolTxt: { fontSize: 13, fontWeight: '600' },
  toolPrimary: { borderWidth: 0 },
  toolPrimaryTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  help: { fontSize: 12, lineHeight: 18, paddingHorizontal: 22, marginTop: 12, textAlign: 'center' },
});
