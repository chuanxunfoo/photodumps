import {
  BarChart2, Camera, Crown, Layers2, LayoutGrid, MailWarning, Scissors, Sticker, Zap,
} from 'lucide-react-native';
import React, { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { hubPush, type HubChildRoute } from '../../_lib/exploreBack';
import {
  canCreateSticker,
  hasVideoTrimTrial,
} from '../../_lib/hobbyFeatureAccess';
import { getExploreCopy } from '../../_lib/localeContent';
import { getLocaleUi } from '../../_lib/localeUi';
import { resolveTypeface, useTheme } from '../../(tabs)/ThemeContext';
import { HubPageChrome } from './HubPageChrome';
import { HubNavRow } from './exploreUi';
import { hubPageStyles as es } from './hubPageStyles';

type Props = { active?: boolean };

export default function HubFeaturesPage({ active = false }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isPro, isAdmin, openSubscription, themeId, language, user } = useTheme();
  const ex = getExploreCopy(language);
  const u = getLocaleUi(language);
  const fonts = resolveTypeface(theme);
  const HUB_SLOT_BASE = 9;
  const isPaid = isPro || isAdmin;

  const openSubPage = useCallback(() => {
    try {
      router.push('/subscription');
    } catch {
      setTimeout(() => router.push('/subscription'), 50);
    }
  }, []);

  const gatePro = (fn: () => void) => {
    if (!isPaid) {
      openSubscription();
      return;
    }
    fn();
  };

  const go = (pathname: HubChildRoute) => () => hubPush(pathname, 'features');

  const onVideoTrim = async () => {
    if (isPaid) {
      go('/explore-trim')();
      return;
    }
    const uid = user?.uid;
    if (!uid) {
      openSubscription();
      return;
    }
    if (await hasVideoTrimTrial(uid)) {
      go('/explore-trim')();
      return;
    }
    openSubscription();
  };

  const onStickerStudio = async () => {
    if (isPaid) {
      go('/sticker-studio')();
      return;
    }
    const uid = user?.uid;
    if (!uid) {
      openSubscription();
      return;
    }
    if (await canCreateSticker(uid)) {
      go('/sticker-studio')();
      return;
    }
    openSubscription();
  };

  const ic = () => '#FFFFFF';

  return (
    <View style={[es.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <HubPageChrome active={active} sectionLabel={u.hubFeatures}>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 40 }}
          >
            <View style={es.sectionHead}>
              <Text style={[es.sectionTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>{ex.sectionPro}</Text>
              <Text style={[es.galleryHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{ex.sectionProHint}</Text>
            </View>
            <View style={es.section}>
              <HubNavRow theme={theme} themeId={themeId} slot={HUB_SLOT_BASE} fonts={fonts} title={ex.subscribe} subtitle={isPro ? ex.subscribeSubManage : ex.subscribeSubUpgrade} icon={<Crown size={22} color={ic(HUB_SLOT_BASE)} />} onPress={() => { if (isPaid) openSubPage(); else openSubscription(); }} />
              <HubNavRow theme={theme} themeId={themeId} slot={HUB_SLOT_BASE + 1} fonts={fonts} title={ex.duplicates} subtitle={ex.duplicatesSub} proLock={!isPaid} icon={<Layers2 size={22} color={ic(HUB_SLOT_BASE + 1)} />} onPress={() => gatePro(go('/duplicates'))} />
              <HubNavRow theme={theme} themeId={themeId} slot={HUB_SLOT_BASE + 2} fonts={fonts} title={ex.videoTrim} subtitle={ex.videoTrimSub} icon={<Scissors size={22} color={ic(HUB_SLOT_BASE + 2)} />} onPress={() => void onVideoTrim()} />
              <HubNavRow theme={theme} themeId={themeId} slot={HUB_SLOT_BASE + 3} fonts={fonts} title={ex.supercut} subtitle={ex.supercutSub} proLock={!isPaid} icon={<Zap size={22} color={ic(HUB_SLOT_BASE + 3)} />} onPress={() => gatePro(go('/supercut'))} />
              <HubNavRow theme={theme} themeId={themeId} slot={HUB_SLOT_BASE + 4} fonts={fonts} title={ex.myStats} subtitle={ex.myStatsSub} icon={<BarChart2 size={22} color={ic(HUB_SLOT_BASE + 4)} />} onPress={go('/insights')} />
              <HubNavRow theme={theme} themeId={themeId} slot={HUB_SLOT_BASE + 5} fonts={fonts} title={ex.stickerStudio} subtitle={ex.stickerStudioSub} icon={<Sticker size={22} color={ic(HUB_SLOT_BASE + 5)} />} onPress={() => void onStickerStudio()} />
              <HubNavRow theme={theme} themeId={themeId} slot={HUB_SLOT_BASE + 6} fonts={fonts} title={ex.widgets} subtitle={ex.widgetsSub} comingSoon proLock={!isPaid} icon={<LayoutGrid size={22} color={ic(HUB_SLOT_BASE + 6)} />} onPress={() => {}} />
              <HubNavRow theme={theme} themeId={themeId} slot={HUB_SLOT_BASE + 7} fonts={fonts} title={ex.photobooth} subtitle={ex.photoboothSub} proLock={!isPaid} icon={<Camera size={22} color={ic(HUB_SLOT_BASE + 7)} />} onPress={() => gatePro(go('/photobooth'))} />
              <HubNavRow
                theme={theme}
                themeId={themeId}
                slot={HUB_SLOT_BASE + 8}
                fonts={fonts}
                title={ex.emailClean}
                subtitle={ex.emailCleanSub}
                proLock={!isPaid}
                icon={<MailWarning size={22} color={ic(HUB_SLOT_BASE + 8)} />}
                onPress={() => gatePro(go('/email-clean'))}
              />
            </View>
          </ScrollView>
        </HubPageChrome>
      </SafeAreaView>
    </View>
  );
}
