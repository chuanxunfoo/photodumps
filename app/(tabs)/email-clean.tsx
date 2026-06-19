import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import {
  AlertCircle, CheckCircle2, Crown, MailWarning, ShieldAlert, Sparkles, Trash2, Wind,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { connectGmailAccount, getWebGmailRedirectUri, hasGmailConnection, hasGmailModifyPermission } from '../_lib/gmailConnect';
import { recordEmailDetoxCleanup } from '../_lib/emailDetoxStats';
import { cleanupGmailDetox, GMAIL_DETOX_BATCH_SIZE, previewGmailDetoxBatch, scanGmailDetox, type DetoxGroupKey, type GmailDetoxBatchPreview, type GmailDetoxGroup } from '../_lib/gmailDetox';
import {
  clearGmailDetoxReady,
  clearOAuthRedirectMarker,
  consumeGmailOAuthReturn,
  isGmailDetoxReady,
  markGmailDetoxReady,
  allowPermissionPromptAgain,
  markGmailPendingAction,
  markGmailOAuthResume,
  shouldBlockAutoPermissionPrompt,
  type GmailOAuthReturnPayload,
  type GmailPendingAction,
} from '../_lib/gmailDetoxSetup';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { dangerButtonColors, primaryButtonColors, secondaryButtonColors } from '../_lib/buttonContrast';
import { DetoxPermissionModal } from '../components/DetoxPermissionModal';
import { DetoxSuccessModal, type DetoxSuccessKind } from '../components/DetoxSuccessModal';
import { MinimalBackButton } from '../components/MinimalBackButton';
import { resolveTypeface, useTheme } from './ThemeContext';

const { height: SCREEN_H } = Dimensions.get('window');
const CIRCLE_SIZE = 196;
const STROKE = 14;
const RADIUS = (CIRCLE_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const DASH = 10;
const GAP = 9;
const DASH_PATTERN = `${DASH} ${GAP}`;

type QueueItem = {
  key: DetoxGroupKey;
  label: string;
  bytes: number;
  count: number;
  capped: boolean;
  status: 'idle' | 'scanning' | 'ready' | 'removed';
};

const FALLBACK_GROUPS: QueueItem[] = [
  { key: 'spam_phishing', label: 'Spam & phishing', bytes: 0, count: 0, capped: false, status: 'idle' },
  { key: 'promo_ads', label: 'Promotions & ads', bytes: 0, count: 0, capped: false, status: 'idle' },
  { key: 'newsletter', label: 'Newsletter backlog', bytes: 0, count: 0, capped: false, status: 'idle' },
  { key: 'social_digest', label: 'Social digests', bytes: 0, count: 0, capped: false, status: 'idle' },
  { key: 'stale_threads', label: 'Stale threads', bytes: 0, count: 0, capped: false, status: 'idle' },
  { key: 'attachments_large', label: 'Large attachments', bytes: 0, count: 0, capped: false, status: 'idle' },
  { key: 'old_messages', label: 'Messages 2+ years old', bytes: 0, count: 0, capped: false, status: 'idle' },
];

const GROUP_PALETTE: Record<DetoxGroupKey, { tint: string; bg: string }> = {
  spam_phishing: { tint: '#E07A5F', bg: 'rgba(224,122,95,0.12)' },
  promo_ads: { tint: '#D4A853', bg: 'rgba(212,168,83,0.12)' },
  newsletter: { tint: '#6B9BD1', bg: 'rgba(107,155,209,0.12)' },
  social_digest: { tint: '#7EB09B', bg: 'rgba(126,176,155,0.12)' },
  stale_threads: { tint: '#9A8C98', bg: 'rgba(154,140,152,0.12)' },
  attachments_large: { tint: '#C17C74', bg: 'rgba(193,124,116,0.12)' },
  old_messages: { tint: '#8B95A8', bg: 'rgba(139,149,168,0.12)' },
};

function groupIcon(key: DetoxGroupKey): React.ReactNode {
  const tint = GROUP_PALETTE[key].tint;
  switch (key) {
    case 'spam_phishing':
      return <ShieldAlert size={15} color={tint} strokeWidth={2.2} />;
    case 'promo_ads':
      return <Sparkles size={15} color={tint} strokeWidth={2.2} />;
    case 'newsletter':
      return <MailWarning size={15} color={tint} strokeWidth={2.2} />;
    case 'social_digest':
      return <Wind size={15} color={tint} strokeWidth={2.2} />;
    case 'stale_threads':
      return <MailWarning size={15} color={tint} strokeWidth={2.2} />;
    case 'attachments_large':
      return <Sparkles size={15} color={tint} strokeWidth={2.2} />;
    default:
      return <ShieldAlert size={15} color={tint} strokeWidth={2.2} />;
  }
}

function formatStorage(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function isScopeError(msg: string): boolean {
  return (
    msg === 'GMAIL_SETUP_REQUIRED' ||
    /insufficient authentication scopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT|delete permission missing|GMAIL_MODIFY_REQUIRED|gmail\.modify/i.test(msg)
  );
}

function isReconnectError(msg: string): boolean {
  return (
    msg === 'GMAIL_RECONNECT_REQUIRED' ||
    /invalid_grant|expired or revoked|GMAIL_RECONNECT_REQUIRED/i.test(msg)
  );
}

function handleScopeFailure(
  uid: string,
  setters: {
    setErrorText: (v: string | null) => void;
    setGmailReady: (v: boolean) => void;
    setNeedsDeleteSetup: (v: boolean) => void;
    setInfoText: (v: string | null) => void;
  },
): void {
  setters.setErrorText(null);
  setters.setNeedsDeleteSetup(true);
  setters.setGmailReady(false);
  if (uid) void clearGmailDetoxReady(uid);
  setters.setInfoText(null);
}

function formatCount(count: number, capped: boolean): string {
  if (count <= 0) return '0';
  return capped ? `${count.toLocaleString()}+` : count.toLocaleString();
}

function toQueue(groups: GmailDetoxGroup[]): QueueItem[] {
  const map = new Map(groups.map((g) => [g.key, g]));
  return FALLBACK_GROUPS.map((base) => {
    const g = map.get(base.key);
    const count = Number(g?.count ?? 0);
    return {
      ...base,
      label: g?.label ?? base.label,
      bytes: Number(g?.bytes ?? 0),
      count,
      capped: Boolean(g?.capped),
      status: count > 0 ? 'ready' : 'idle',
    };
  });
}

function DustParticles({ active }: { active: boolean }) {
  const particles = useRef(
    Array.from({ length: 10 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      o: new Animated.Value(0),
      s: new Animated.Value(0.4),
    })),
  ).current;

  useEffect(() => {
    if (!active) {
      particles.forEach((p) => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.o.setValue(0);
        p.s.setValue(0.4);
      });
      return;
    }

    const loops = particles.map((p, i) => {
      const driftX = 18 + (i % 4) * 10;
      const driftY = -6 - (i % 3) * 8;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 90),
          Animated.parallel([
            Animated.timing(p.o, { toValue: 0.85, duration: 120, useNativeDriver: true }),
            Animated.timing(p.s, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.timing(p.x, { toValue: driftX, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(p.y, { toValue: driftY, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(p.o, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.timing(p.s, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(p.x, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );
    });

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, particles]);

  if (!active) return null;

  const colors = ['#FFD4A8', '#FFE8C8', '#C4B5A0', '#FFF0DC', '#E8D4BC'];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: CIRCLE_SIZE / 2 - 4 + (i % 3) * 6 - 6,
            top: CIRCLE_SIZE / 2 + 18 + (i % 2) * 4,
            width: 5 + (i % 3),
            height: 5 + (i % 2),
            borderRadius: 3,
            backgroundColor: colors[i % colors.length],
            opacity: p.o,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.s }],
          }}
        />
      ))}
    </View>
  );
}

function ConfirmCleanupModal({
  visible,
  onClose,
  onConfirm,
  queue,
  batchPreview,
  loading,
  theme,
  fonts,
  secondaryBtn,
  dangerBtn,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  queue: QueueItem[];
  batchPreview: GmailDetoxBatchPreview | null;
  loading: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
  fonts: ReturnType<typeof resolveTypeface>;
  secondaryBtn: ReturnType<typeof secondaryButtonColors>;
  dangerBtn: ReturnType<typeof dangerButtonColors>;
}) {
  const slide = useRef(new Animated.Value(SCREEN_H)).current;
  const removable = queue.filter((q) => q.count > 0);
  const batchCount = batchPreview?.batchCount ?? 0;
  const batchBytes = batchPreview?.batchBytes ?? 0;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : SCREEN_H,
      friction: 14,
      tension: 68,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            s.modalSheet,
            {
              backgroundColor: theme.bg,
              borderColor: theme.border,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={[s.modalHandle, { backgroundColor: theme.border }]} />
          <View style={s.modalHeader}>
            <View style={[s.modalIconWrap, { backgroundColor: theme.danger + '22' }]}>
              <Trash2 size={22} color={theme.danger} />
            </View>
            <Text style={[s.modalTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>
              Delete this batch?
            </Text>
            <Text style={[s.modalSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
              {loading
                ? 'Checking batch size…'
                : batchCount > 0
                  ? `${batchCount} email${batchCount === 1 ? '' : 's'} · ${formatStorage(batchBytes)} will be removed.`
                  : 'Nothing to delete right now.'}
            </Text>
            {!loading && batchPreview && batchPreview.remainingCount > 0 && (
              <View style={[s.batchPill, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                <Sparkles size={12} color={theme.textSub} />
                <Text style={[s.batchPillText, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                  {batchPreview.remainingCount.toLocaleString()} more after this batch
                </Text>
              </View>
            )}
          </View>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.28 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            <Text style={[s.modalListHint, { color: theme.textMuted, fontFamily: fonts.bodyFont }]}>
              Categories found (this batch picks from the safest first):
            </Text>
            {removable.map((item) => (
              <View
                key={item.key}
                style={[s.modalRow, { backgroundColor: theme.bg2, borderColor: theme.border }]}
              >
                <Text style={[s.modalRowLabel, { color: theme.text, fontFamily: fonts.bodyFont }]} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={[s.modalRowVal, { color: theme.text, fontFamily: fonts.bodyFont }]}>
                  {formatCount(item.count, item.capped)} · {formatStorage(item.bytes)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={s.modalActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={[s.modalCancel, { backgroundColor: secondaryBtn.bg, borderColor: secondaryBtn.border }]}
            >
              <Text style={[s.modalCancelTxt, { color: secondaryBtn.text, fontFamily: fonts.bodyFont }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} onPress={onConfirm} disabled={loading || batchCount <= 0} style={{ flex: 1, opacity: loading || batchCount <= 0 ? 0.5 : 1 }}>
              <View style={[s.modalConfirm, { backgroundColor: dangerBtn.bg }]}>
                <Trash2 size={16} color={dangerBtn.text} />
                <Text style={[s.modalConfirmTxt, { color: dangerBtn.text, fontFamily: fonts.titleFont }]}>
                  {loading ? 'Loading…' : `Delete ${batchCount} email${batchCount === 1 ? '' : 's'}`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function EmailCleanScreen() {
  const insets = useSafeAreaInsets();
  const goBack = useExploreAwareBack('features');
  const { theme, isPro, isAdmin, openSubscription, user } = useTheme();
  const fonts = resolveTypeface(theme);
  const isPaid = isPro || isAdmin;

  const [phase, setPhase] = useState<'idle' | 'scanning' | 'result' | 'cleaning' | 'done'>('idle');
  const [queue, setQueue] = useState<QueueItem[]>(FALLBACK_GROUPS);
  const [totalBytes, setTotalBytes] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [mailboxMessagesTotal, setMailboxMessagesTotal] = useState(0);
  const [scanDepthPerGroup, setScanDepthPerGroup] = useState(60);
  const [cleanupBatchMax, setCleanupBatchMax] = useState(GMAIL_DETOX_BATCH_SIZE);
  const [nextBatch, setNextBatch] = useState<GmailDetoxBatchPreview>({ batchCount: 0, batchBytes: 0, remainingCount: 0 });
  const [deleteCandidateIds, setDeleteCandidateIds] = useState<string[]>([]);
  const [confirmPreview, setConfirmPreview] = useState<GmailDetoxBatchPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lastBatchDeleted, setLastBatchDeleted] = useState(0);
  const [lastBatchBytes, setLastBatchBytes] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [oauthConnecting, setOauthConnecting] = useState(false);
  const [gmailReady, setGmailReady] = useState(false);
  const [needsDeleteSetup, setNeedsDeleteSetup] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [successModal, setSuccessModal] = useState<{
    kind: DetoxSuccessKind;
    title: string;
    message: string;
    detail?: string;
  } | null>(null);

  const progress = useRef(new Animated.Value(0)).current;
  const broomX = useRef(new Animated.Value(0)).current;
  const broomTilt = useRef(new Animated.Value(0)).current;
  const scanTicker = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const pendingAfterOAuth = useRef<GmailPendingAction>('scan');
  const startGoogleOAuthRef = useRef<(action?: GmailPendingAction) => void>(() => {});

  const animatedOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRC, 0],
  });

  const isAnimating = phase === 'scanning' || phase === 'cleaning';
  const removableCount = queue.filter((q) => q.count > 0).length;
  const removedQueue = queue.filter((q) => q.status === 'removed').length;

  const progressPctLabel = useMemo(() => {
    if (phase === 'done') return 100;
    if (phase === 'result') return 100;
    if (phase === 'cleaning') {
      const total = removableCount || queue.length;
      return total ? Math.round((removedQueue / total) * 100) : progressPct;
    }
    if (phase === 'scanning') {
      return Math.max(progressPct, Math.round((processedCount / FALLBACK_GROUPS.length) * 100));
    }
    return 0;
  }, [phase, progressPct, processedCount, removableCount, removedQueue, queue.length]);

  const applyScanResult = useCallback(async (res: {
    groups: GmailDetoxGroup[];
    totalBytes: number;
    totalMessages: number;
    mailboxMessagesTotal: number;
    scanDepthPerGroup: number;
    cleanupBatchMax: number;
    nextBatch: GmailDetoxBatchPreview;
    canDelete: boolean;
    deleteCandidateIds: string[];
  }) => {
    setQueue(toQueue(res.groups));
    setTotalBytes(res.totalBytes);
    setTotalMessages(res.totalMessages);
    setMailboxMessagesTotal(res.mailboxMessagesTotal);
    setScanDepthPerGroup(res.scanDepthPerGroup);
    setCleanupBatchMax(res.cleanupBatchMax);
    setNextBatch(res.nextBatch);
    setDeleteCandidateIds(res.deleteCandidateIds);

    const uid = user?.uid ?? '';
    let canClean = res.canDelete;
    if (!canClean) canClean = await hasGmailModifyPermission();
    if (!canClean && uid) canClean = await isGmailDetoxReady(uid);

    setNeedsDeleteSetup(!canClean);
    setGmailReady(canClean);
    if (canClean) {
      setErrorText(null);
      setInfoText(null);
      if (uid) await markGmailDetoxReady(uid);
    }
  }, [user?.uid]);

  const refreshScanInBackground = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const scan = await scanGmailDetox();
    if (scan.ok) await applyScanResult(scan);
  }, [applyScanResult]);

  const gmailRedirectUri = useMemo(() => getWebGmailRedirectUri(), []);

  const showSuccess = useCallback((payload: NonNullable<typeof successModal>) => {
    setSuccessModal(payload);
    setInfoText(null);
  }, []);

  const stopScanTicker = useCallback(() => {
    if (scanTicker.current) {
      clearInterval(scanTicker.current);
      scanTicker.current = null;
    }
  }, []);

  const startBroom = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(broomX, { toValue: 1, duration: 780, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(broomX, { toValue: 0, duration: 780, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(broomTilt, { toValue: 1, duration: 390, useNativeDriver: true }),
        Animated.timing(broomTilt, { toValue: 0, duration: 390, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [broomTilt, broomX, pulse]);

  const runScanOnly = useCallback(async () => {
    setErrorText(null);
    setInfoText(null);
    setNeedsConnect(false);
    setProcessedCount(0);
    progress.setValue(0);
    broomX.setValue(0);
    broomTilt.setValue(0);

    setPhase('scanning');
    setQueue(FALLBACK_GROUPS.map((g) => ({ ...g, status: 'scanning' as const })));
    startBroom();

    Animated.timing(progress, {
      toValue: 0.72,
      duration: 5000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    stopScanTicker();
    let idx = 0;
    scanTicker.current = setInterval(() => {
      idx += 1;
      setProcessedCount((n) => Math.max(n, Math.min(FALLBACK_GROUPS.length - 1, idx)));
    }, 1200);

    const res = await scanGmailDetox();
    stopScanTicker();
    if (!res.ok) {
      progress.stopAnimation();
      broomX.stopAnimation();
      broomTilt.stopAnimation();
      pulse.stopAnimation();
      setPhase('idle');
      setQueue(FALLBACK_GROUPS);
      if (isReconnectError(res.error)) {
        const uid = user?.uid ?? '';
        if (uid) void clearGmailDetoxReady(uid);
        setGmailReady(false);
        setNeedsDeleteSetup(false);
        setNeedsConnect(true);
        setInfoText(null);
        setErrorText('Your Google connection expired. Tap Grant Gmail access below.');
        allowPermissionPromptAgain();
        pendingAfterOAuth.current = 'scan';
        startGoogleOAuthRef.current('scan');
        return;
      }
      if (isScopeError(res.error)) {
        handleScopeFailure(user?.uid ?? '', {
          setErrorText,
          setGmailReady,
          setNeedsDeleteSetup,
          setInfoText,
        });
        allowPermissionPromptAgain();
        pendingAfterOAuth.current = 'clean';
        startGoogleOAuthRef.current('clean');
        return;
      }
      setErrorText(res.error);
      setNeedsConnect(/google identity not connected|refresh token missing|grant gmail access/i.test(res.error));
      return;
    }

    await applyScanResult(res);
    setLastBatchDeleted(0);
    setLastBatchBytes(0);
    setProcessedCount(FALLBACK_GROUPS.length);

    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start(() => setPhase('result'));
  }, [applyScanResult, broomTilt, broomX, progress, pulse, startBroom, stopScanTicker, user?.uid]);

  const beginScan = useCallback(async () => {
    const uid = user?.uid ?? '';
    let linked = await hasGmailConnection();
    const ready = uid ? await isGmailDetoxReady(uid) : false;
    setGmailReady(ready);
    setInfoText(null);

    if (!linked && (await shouldBlockAutoPermissionPrompt())) {
      await new Promise((r) => setTimeout(r, 800));
      linked = await hasGmailConnection();
    }

    if (!linked) {
      startGoogleOAuthRef.current('scan');
      return;
    }

    const modifyOk = await hasGmailModifyPermission();
    if (!modifyOk) {
      setNeedsDeleteSetup(true);
      setGmailReady(false);
      startGoogleOAuthRef.current('clean');
      return;
    }

    await clearOAuthRedirectMarker();
    await runScanOnly();
  }, [runScanOnly, user?.uid]);

  const openPermissionForClean = useCallback(async () => {
    startGoogleOAuthRef.current('clean');
  }, []);

  const runCleanup = useCallback(async () => {
    setConfirmOpen(false);
    setPhase('cleaning');
    setProcessedCount(0);
    progress.setValue(0);
    startBroom();

    const selected = queue.filter((q) => q.count > 0).map((q) => q.key);
    if (!selected.length) {
      setInfoText('No removable inbox candidates were found in this scan.');
      setPhase('result');
      return;
    }

    Animated.timing(progress, {
      toValue: 0.85,
      duration: 2500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const res = await cleanupGmailDetox(selected, deleteCandidateIds);
    if (!res.ok) {
      progress.stopAnimation();
      broomX.stopAnimation();
      broomTilt.stopAnimation();
      pulse.stopAnimation();
      setPhase('result');
      setQueue((prev) => prev.map((q) => (q.count > 0 ? { ...q, status: 'ready' as const } : q)));
      if (isScopeError(res.error)) {
        handleScopeFailure(user?.uid ?? '', {
          setErrorText,
          setGmailReady,
          setNeedsDeleteSetup,
          setInfoText,
        });
      } else {
        setErrorText(res.error);
      }
      return;
    }

    if (res.deletedCount <= 0) {
      progress.stopAnimation();
      broomX.stopAnimation();
      broomTilt.stopAnimation();
      pulse.stopAnimation();
      setPhase('result');
      setErrorText('Gmail did not remove any messages this batch. Tap Scan again to refresh the list.');
      return;
    }

    setDeleteCandidateIds((ids) => ids.slice(res.deletedCount));
    setQueue((prev) => {
      let left = res.deletedCount;
      return prev.map((item) => {
        if (left <= 0 || item.count <= 0) return item;
        const drop = Math.min(item.count, left);
        left -= drop;
        const nextCount = item.count - drop;
        return {
          ...item,
          count: nextCount,
          bytes: nextCount > 0 ? Math.max(0, item.bytes - Math.round(item.bytes * (drop / item.count))) : 0,
          status: nextCount > 0 ? ('ready' as const) : ('removed' as const),
        };
      });
    });

    setNeedsDeleteSetup(false);
    setGmailReady(true);
    setLastBatchDeleted(res.deletedCount);
    setLastBatchBytes(res.deletedBytes);
    const remainingAfter = Math.max(0, totalMessages - res.deletedCount);
    const nextBatchEstimate: GmailDetoxBatchPreview = {
      batchCount: Math.min(cleanupBatchMax, remainingAfter),
      batchBytes: remainingAfter > 0
        ? Math.round(Math.max(0, totalBytes - res.deletedBytes) * Math.min(cleanupBatchMax, remainingAfter) / remainingAfter)
        : 0,
      remainingCount: Math.max(0, remainingAfter - cleanupBatchMax),
    };
    setNextBatch(nextBatchEstimate);
    setTotalBytes(Math.max(0, totalBytes - res.deletedBytes));
    setTotalMessages(remainingAfter);

    void recordEmailDetoxCleanup({
      userId: user?.uid ?? '',
      deletedCount: res.deletedCount,
      deletedBytes: res.deletedBytes,
    });

    Animated.timing(progress, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    const stillQueued = remainingAfter > 0;
    setPhase(stillQueued ? 'result' : 'done');

    showSuccess({
      kind: 'cleanup',
      title: 'Emails deleted successfully',
      message: `${res.deletedCount} email${res.deletedCount === 1 ? '' : 's'} removed · ${formatStorage(res.deletedBytes)} freed from Gmail.`,
      detail: stillQueued
        ? `About ${remainingAfter.toLocaleString()} left in this scan. Tap Delete again for the next batch of up to ${cleanupBatchMax}. Saved to My Stats.`
        : 'These categories look clean for now. Saved to My Stats.',
    });

    void refreshScanInBackground();
  }, [cleanupBatchMax, deleteCandidateIds, progress, pulse, queue, refreshScanInBackground, showSuccess, startBroom, totalBytes, totalMessages, user?.uid, broomTilt, broomX]);

  const requestCleanupConfirmationInternal = useCallback(async () => {
    const removable = queue.filter((q) => q.count > 0);
    if (!removable.length) {
      setInfoText('Nothing to clean — your inbox looks clear for these categories.');
      return;
    }

    setConfirmOpen(true);
    setConfirmPreview(null);
    setPreviewLoading(true);

    const groupKeys = removable.map((q) => q.key);
    const ids = deleteCandidateIds.slice(0, cleanupBatchMax);
    if (ids.length > 0) {
      const totalRemovable = removable.reduce((sum, q) => sum + q.count, 0);
      setConfirmPreview({
        batchCount: ids.length,
        batchBytes: nextBatch.batchBytes,
        remainingCount: Math.max(0, totalRemovable - ids.length),
      });
      setPreviewLoading(false);
      const preview = await previewGmailDetoxBatch(groupKeys, ids);
      if (preview.ok && preview.batchCount > 0) {
        setConfirmPreview({
          batchCount: preview.batchCount,
          batchBytes: preview.batchBytes,
          remainingCount: Math.max(0, totalRemovable - preview.batchCount),
        });
        return;
      }
      if (!preview.ok) {
        setConfirmOpen(false);
        setErrorText(preview.error);
        return;
      }
    }

    const preview = await previewGmailDetoxBatch(groupKeys);
    setPreviewLoading(false);
    if (!preview.ok) {
      setConfirmOpen(false);
      if (isScopeError(preview.error)) {
        handleScopeFailure(user?.uid ?? '', {
          setErrorText,
          setGmailReady,
          setNeedsDeleteSetup,
          setInfoText,
        });
      } else {
        setErrorText(preview.error);
      }
      return;
    }
    if (preview.batchCount <= 0) {
      setConfirmOpen(false);
      setInfoText('No emails ready to delete right now. Rescan to refresh.');
      return;
    }
    const totalRemovable = removable.reduce((sum, q) => sum + q.count, 0);
    setConfirmPreview({
      batchCount: preview.batchCount,
      batchBytes: preview.batchBytes,
      remainingCount: Math.max(0, totalRemovable - preview.batchCount),
    });
  }, [cleanupBatchMax, deleteCandidateIds, nextBatch.batchBytes, queue, user?.uid]);

  const requestCleanupConfirmation = useCallback(async () => {
    if (!isPaid) {
      openSubscription();
      return;
    }

    const uid = user?.uid ?? '';
    const linked = await hasGmailConnection();
    const modifyOk = await hasGmailModifyPermission();
    const ready = uid ? (await isGmailDetoxReady(uid)) || modifyOk : false;
    setGmailReady(ready);
    if (!ready) {
      if (!linked) {
        openPermissionForClean();
        return;
      }
      setNeedsDeleteSetup(true);
      setInfoText('On Google, allow “Read, compose, and send emails” — tap Finish Google setup below.');
      return;
    }

    await requestCleanupConfirmationInternal();
  }, [isPaid, openPermissionForClean, openSubscription, requestCleanupConfirmationInternal, user?.uid]);

  const handleOAuthReturn = useCallback(
    async (payload: GmailOAuthReturnPayload) => {
      const uid = user?.uid ?? '';
      pendingAfterOAuth.current = payload.pending;
      setErrorText(null);
      setPermissionOpen(false);
      await clearOAuthRedirectMarker();

      const modifyOk = payload.hasModify || (await hasGmailModifyPermission());
      if (modifyOk && uid) {
        await markGmailDetoxReady(uid);
        setGmailReady(true);
        setNeedsDeleteSetup(false);
        setInfoText(null);
        showSuccess({
          kind: 'permission',
          title: 'Gmail connected',
          message: 'You’re all set. Scan your inbox and confirm each small cleanup batch.',
        });
      } else {
        setGmailReady(false);
        setNeedsDeleteSetup(true);
        setInfoText(
          'Google did not grant full Gmail access. Remove photodumps from Google permissions, then tap Finish Google setup and allow “Read, compose, and send emails”.',
        );
      }

      if (payload.pending === 'clean' && modifyOk) {
        void requestCleanupConfirmationInternal();
        return;
      }
      if (totalMessages > 0 && phase === 'result') return;
      await runScanOnly();
    },
    [phase, requestCleanupConfirmationInternal, runScanOnly, showSuccess, totalMessages, user?.uid],
  );

  const syncGmailAccessState = useCallback(async () => {
    const uid = user?.uid ?? '';
    if (!uid) return;
    const linked = await hasGmailConnection();
    if (!linked) {
      setGmailReady(false);
      setNeedsDeleteSetup(false);
      setNeedsConnect(true);
      return;
    }
    const modifyOk = await hasGmailModifyPermission();
    const ready = await isGmailDetoxReady(uid);
    const canClean = modifyOk || ready;
    if (modifyOk) await markGmailDetoxReady(uid);
    setGmailReady(canClean);
    setNeedsDeleteSetup(!canClean);
    if (canClean) setInfoText(null);
  }, [user?.uid]);

  const handlePermissionConnect = useCallback(async () => {
    await allowPermissionPromptAgain();
    setOauthConnecting(true);
    setErrorText(null);
    setInfoText(null);
    const action = pendingAfterOAuth.current;
    await markGmailOAuthResume(action);
    await markGmailPendingAction(action);

    const res = await connectGmailAccount({
      promptConsent: action === 'clean' || needsDeleteSetup || !(await hasGmailConnection()),
    });
    setOauthConnecting(false);

    if (!res.ok) {
      if (res.error === 'Redirecting to Google…') {
        setPermissionOpen(false);
        setNeedsConnect(true);
        return;
      }
      const payload = await consumeGmailOAuthReturn();
      if (payload) {
        await handleOAuthReturn(payload);
        return;
      }
      const modifyOk = await hasGmailModifyPermission();
      if (modifyOk) {
        setPermissionOpen(false);
        setNeedsDeleteSetup(false);
        setGmailReady(true);
        setInfoText(null);
        if (action === 'clean') void requestCleanupConfirmationInternal();
        return;
      }
      if (/cancelled|did not complete/i.test(res.error)) {
        setPermissionOpen(false);
        setNeedsConnect(true);
        setErrorText('Google sign-in was cancelled. Tap Grant Gmail access to try again.');
        return;
      }
      setErrorText(res.error);
      setNeedsConnect(/access blocked|verification|cancelled|redirect_uri/i.test(res.error));
      if (/redirect_uri/i.test(res.error)) {
        setErrorText(
          `${res.error}\n\nCopy this EXACT redirect URI into Google Cloud → Credentials → Web client:\n${gmailRedirectUri}`,
        );
      }
      return;
    }

    setPermissionOpen(false);
    const uid = user?.uid ?? '';
    const canClean = res.hasModify || (await hasGmailModifyPermission());
    if (canClean && uid) {
      await markGmailDetoxReady(uid);
      setGmailReady(true);
      setNeedsDeleteSetup(false);
      setInfoText(null);
      showSuccess({
        kind: 'permission',
        title: 'Gmail connected',
        message: 'You’re all set. We won’t ask for Google access again — just scan, confirm, and delete small batches.',
      });
    } else {
      setErrorText('Google did not grant compose/send access. Allow every Gmail box on the Google screen, then try again.');
      return;
    }

    if (action === 'clean') {
      void requestCleanupConfirmationInternal();
      return;
    }
    if (totalMessages > 0 && phase === 'result') return;
    await runScanOnly();
  }, [gmailRedirectUri, handleOAuthReturn, needsDeleteSetup, phase, requestCleanupConfirmationInternal, runScanOnly, showSuccess, totalMessages, user?.uid]);

  startGoogleOAuthRef.current = (action: GmailPendingAction = 'scan') => {
    pendingAfterOAuth.current = action;
    setPermissionOpen(false);
    void handlePermissionConnect();
  };

  useEffect(() => {
    void syncGmailAccessState();
  }, [syncGmailAccessState]);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setProgressPct(Math.round(value * 100)));
    return () => progress.removeListener(id);
  }, [progress]);

  useFocusEffect(
    useCallback(() => {
      void syncGmailAccessState();
      void (async () => {
        const payload = await consumeGmailOAuthReturn();
        if (!payload) return;
        await handleOAuthReturn(payload);
      })();
      return () => stopScanTicker();
    }, [handleOAuthReturn, stopScanTicker, syncGmailAccessState]),
  );

  const broomTx = broomX.interpolate({ inputRange: [0, 1], outputRange: [-22, 22] });
  const broomRz = broomTilt.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '10deg'] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const batchPreviewCount = nextBatch.batchCount;
  const batchPreviewBytes = nextBatch.batchBytes;
  const primaryBtn = useMemo(() => primaryButtonColors(theme), [theme]);
  const secondaryBtn = useMemo(() => secondaryButtonColors(theme), [theme]);
  const dangerBtn = useMemo(() => dangerButtonColors(theme), [theme]);

  const ctaLabel =
    phase === 'idle'
      ? 'Scan emails'
      : phase === 'scanning'
        ? 'Scanning…'
        : phase === 'result'
          ? needsDeleteSetup
            ? 'Finish Google setup'
            : isPaid
            ? batchPreviewCount > 0
              ? `Delete ${batchPreviewCount} emails`
              : 'Scan again'
            : 'Unlock Pro to delete'
          : phase === 'cleaning'
            ? 'Deleting…'
          : phase === 'done'
            ? 'Scan again'
            : 'Done';

  const ctaOnPress =
    phase === 'idle' || phase === 'done'
      ? beginScan
      : phase === 'result'
        ? needsDeleteSetup
          ? () => startGoogleOAuthRef.current('clean')
          : batchPreviewCount > 0
            ? requestCleanupConfirmation
            : beginScan
        : undefined;

  const showGoogleAction =
    needsConnect || needsDeleteSetup;

  const stickyLabel = showGoogleAction
    ? oauthConnecting
      ? 'Opening Google…'
      : 'Grant Gmail access'
    : ctaLabel;

  const stickyOnPress = showGoogleAction
    ? () => startGoogleOAuthRef.current(needsDeleteSetup ? 'clean' : 'scan')
    : ctaOnPress ?? beginScan;

  const stickyDisabled =
    oauthConnecting || phase === 'scanning' || phase === 'cleaning' || (!showGoogleAction && !stickyOnPress);

  const renderPrimaryCta = (marginTop = 20) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={ctaOnPress}
      disabled={phase === 'scanning' || phase === 'cleaning' || !ctaOnPress}
      style={{ marginHorizontal: 20, marginTop }}
    >
      <View style={[s.cta, { backgroundColor: primaryBtn.bg }, (phase === 'scanning' || phase === 'cleaning') && { opacity: 0.7 }]}>
        <Text style={[s.ctaText, { color: primaryBtn.text, fontFamily: fonts.titleFont }]}>{ctaLabel}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bg, theme.bg2, theme.bg3]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.nav}>
          <MinimalBackButton onPress={goBack} color={theme.textSub} size={24} />
          <Text style={[s.navTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>email clean</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 108 }} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <LinearGradient colors={[theme.bg2, theme.bg3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.kickerPill}>
              <Sparkles size={11} color={theme.textSub} />
              <Text style={[s.kicker, { color: theme.textSub, fontFamily: fonts.titleFont }]}>email clean</Text>
              {!isPaid && (
                <View style={s.kickerPro}>
                  <Crown size={9} color="#1A1000" />
                  <Text style={s.kickerProTxt}>PRO</Text>
                </View>
              )}
            </LinearGradient>
            <Text style={[s.title, { color: theme.text, fontFamily: fonts.titleFont }]}>
              Reclaim your Gmail storage
            </Text>
          </View>

          <View style={[s.centerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <LinearGradient
              colors={[theme.accentSoft, 'transparent']}
              style={s.centerGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <Animated.View style={[s.progressWrap, { transform: [{ scale: glowScale }] }]}>
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                <Defs>
                  <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={theme.text} />
                    <Stop offset="100%" stopColor={theme.textSub} />
                  </SvgGradient>
                </Defs>
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={RADIUS}
                  stroke={theme.border}
                  strokeWidth={STROKE}
                  strokeDasharray={DASH_PATTERN}
                  strokeLinecap="round"
                  fill="transparent"
                  opacity={0.55}
                />
                <AnimatedCircle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#ringGrad)"
                  strokeWidth={STROKE}
                  strokeDasharray={DASH_PATTERN}
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDashoffset={animatedOffset as unknown as number}
                  transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                />
              </Svg>
              <DustParticles active={isAnimating} />
              <Animated.View style={[s.broomWrap, { transform: [{ translateX: broomTx }, { rotate: broomRz }] }]}>
                <Text style={s.broom}>🧹</Text>
              </Animated.View>
              {phase !== 'idle' && (
                <View style={[s.pctBadge, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
                  <Text style={[s.pctText, { color: theme.text }]}>{progressPctLabel}%</Text>
                </View>
              )}
            </Animated.View>

            {phase === 'scanning' ? (
              <>
                <Text style={[s.scanText, { color: theme.text, fontFamily: fonts.titleFont }]}>Scanning Gmail…</Text>
                <Text style={[s.scanSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                  Category {processedCount}/{FALLBACK_GROUPS.length}
                </Text>
              </>
            ) : phase === 'result' ? (
              <>
                <Text style={[s.resultMain, { color: theme.text, fontFamily: fonts.titleFont }]}>
                  Next batch: {formatStorage(nextBatch.batchBytes)}
                </Text>
                <Text style={[s.scanSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                  {nextBatch.batchCount} ready now
                  {nextBatch.remainingCount > 0 ? ` · ${nextBatch.remainingCount} more later` : ''}
                </Text>
                <View style={[s.reviewBanner, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                  <CheckCircle2 size={14} color={theme.textSub} />
                  <Text style={[s.reviewNote, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                    Nothing deleted yet — review below
                  </Text>
                </View>
              </>
            ) : phase === 'cleaning' ? (
              <>
                <Text style={[s.scanText, { color: theme.text, fontFamily: fonts.titleFont }]}>Deleting…</Text>
                <Text style={[s.scanSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                  Up to {cleanupBatchMax} emails
                </Text>
              </>
            ) : phase === 'done' ? (
              <View style={s.doneCol}>
                <View style={s.doneRow}>
                  <CheckCircle2 size={20} color={theme.success} />
                  <Text style={[s.doneText, { color: theme.text, fontFamily: fonts.bodyFont }]}>
                    Done — inbox is cleaner
                  </Text>
                </View>
                {lastBatchDeleted > 0 && (
                  <Text style={[s.scanSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                    Last batch: {lastBatchDeleted} email{lastBatchDeleted === 1 ? '' : 's'} · {formatStorage(lastBatchBytes)}
                  </Text>
                )}
              </View>
            ) : (
              <>
                <Text style={[s.scanText, { color: theme.text, fontFamily: fonts.titleFont }]}>
                  {showGoogleAction ? 'Gmail access needed' : 'Ready to scan'}
                </Text>
                <Text style={[s.scanSub, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                  {showGoogleAction
                    ? 'Tap Grant Gmail access below — Google will ask you to allow email cleanup (one time).'
                    : 'Scan your inbox, then delete small batches you confirm.'}
                </Text>
              </>
            )}
          </View>

          {needsDeleteSetup && phase === 'result' && (
            <View style={[s.setupCard, { marginHorizontal: 20, marginTop: 14, borderColor: theme.border, backgroundColor: theme.bg2, flexDirection: 'row' }]}>
              <MailWarning size={18} color="#D4A853" />
              <View style={{ flex: 1 }}>
                <Text style={[s.setupTitle, { color: theme.text, fontFamily: fonts.titleFont }]}>
                  Gmail delete access required
                </Text>
                <Text style={[s.setupBody, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
                  Tap Grant Gmail access below. On Google’s screen, allow “Read, compose, and send emails”.
                </Text>
              </View>
            </View>
          )}

          {!!errorText && !isScopeError(errorText) && (
            <View style={[s.errorCard, { borderColor: theme.danger + '55', backgroundColor: theme.danger + '12' }]}>
              <AlertCircle size={16} color={theme.danger} />
              <Text style={[s.errorText, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{errorText}</Text>
            </View>
          )}

          {!!infoText && (
            <View style={[s.infoCard, { borderColor: theme.accent + '44', backgroundColor: theme.accentSoft }]}>
              <Sparkles size={16} color={theme.accent} />
              <Text style={[s.errorText, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{infoText}</Text>
            </View>
          )}

          <View style={s.statsHead}>
            <Text style={[s.statsTitle, { color: theme.textMuted, fontFamily: fonts.titleFont }]}>CATEGORIES</Text>
            <Text style={[s.statsHint, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>
              {phase === 'result' ? `${removableCount} ready to clean` : 'Live scan results'}
            </Text>
          </View>

          <View style={s.statsList}>
            {queue.map((item) => (
              <StatRow
                key={item.key}
                icon={groupIcon(item.key)}
                iconBg={GROUP_PALETTE[item.key].bg}
                label={item.label}
                value={`${formatStorage(item.bytes)} · ${formatCount(item.count, item.capped)} msgs`}
                state={item.status}
                theme={theme}
                fonts={fonts}
              />
            ))}
          </View>

          {phase !== 'idle' && !showGoogleAction ? renderPrimaryCta(20) : null}

          {!isPaid && (
            <Text style={[s.lockNote, { color: theme.textMuted, fontFamily: fonts.bodyFont }]}>
              Scanning is free. Pro unlocks delete ({cleanupBatchMax} emails per batch).
            </Text>
          )}
        </ScrollView>

        <View style={[s.stickyFooter, { paddingBottom: insets.bottom + 10, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={stickyOnPress}
            disabled={stickyDisabled}
          >
            <View style={[s.cta, { backgroundColor: primaryBtn.bg }, stickyDisabled && { opacity: 0.65 }]}>
              {oauthConnecting ? (
                <ActivityIndicator color={primaryBtn.text} />
              ) : (
                <Text style={[s.ctaText, { color: primaryBtn.text, fontFamily: fonts.titleFont }]}>
                  {stickyLabel}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <DetoxPermissionModal
        visible={permissionOpen}
        connecting={oauthConnecting}
        primaryBtn={primaryBtn}
        onConnect={() => void handlePermissionConnect()}
        onClose={() => setPermissionOpen(false)}
        theme={theme}
        fonts={fonts}
      />

      <ConfirmCleanupModal
        visible={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmPreview(null);
        }}
        onConfirm={() => void runCleanup()}
        queue={queue}
        batchPreview={confirmPreview}
        loading={previewLoading}
        theme={theme}
        fonts={fonts}
        secondaryBtn={secondaryBtn}
        dangerBtn={dangerBtn}
      />

      <DetoxSuccessModal
        visible={successModal != null}
        kind={successModal?.kind ?? 'cleanup'}
        title={successModal?.title ?? ''}
        message={successModal?.message ?? ''}
        detail={successModal?.detail}
        onClose={() => setSuccessModal(null)}
        theme={theme}
        fonts={fonts}
      />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function StatRow({
  icon,
  iconBg,
  label,
  value,
  state,
  theme,
  fonts,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  state?: QueueItem['status'];
  theme: ReturnType<typeof useTheme>['theme'];
  fonts: ReturnType<typeof resolveTypeface>;
}) {
  const pill =
    state === 'removed'
      ? { bg: theme.success + '28', text: 'Removed', color: theme.success }
      : state === 'ready'
        ? { bg: theme.bg3, text: 'Ready', color: theme.text }
        : state === 'scanning'
          ? { bg: theme.bg3, text: 'Scanning', color: theme.textSub }
          : null;

  return (
    <View style={[s.row, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.rowLabel, { color: theme.text, fontFamily: fonts.bodyFont }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[s.rowVal, { color: theme.textSub, fontFamily: fonts.bodyFont }]}>{value}</Text>
      </View>
      {pill ? (
        <View style={[s.statePill, { backgroundColor: pill.bg }]}>
          <Text style={[s.statePillText, { color: pill.color, fontFamily: fonts.titleFont }]}>{pill.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  navTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },
  hero: { paddingHorizontal: 20, paddingTop: 6, gap: 10 },
  kickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 2.2 },
  kickerPro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FFD700',
  },
  kickerProTxt: { color: '#1A1000', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  centerCard: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  centerGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  progressWrap: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, alignItems: 'center', justifyContent: 'center' },
  broomWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  broom: { fontSize: 48 },
  pctBadge: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pctText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  scanText: { marginTop: 10, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  scanSub: { marginTop: 6, fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
  scanFine: { marginTop: 4, fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  resultMain: { marginTop: 10, fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  reviewBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  reviewNote: { fontSize: 12, fontWeight: '800' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneCol: { marginTop: 10, alignItems: 'center', gap: 6 },
  doneText: { fontSize: 15, fontWeight: '800' },
  setupCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  setupTitle: { fontSize: 14, fontWeight: '900', marginBottom: 4 },
  setupBody: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  errorCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 19 },
  hintCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  hintMono: { fontSize: 10, fontWeight: '700', lineHeight: 15 },
  statsHead: { marginHorizontal: 20, marginTop: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  statsTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2.4 },
  statsHint: { fontSize: 12, fontWeight: '600' },
  statsList: { marginHorizontal: 20, marginTop: 10, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '800' },
  rowVal: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  statePill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statePillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  cta: { borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  ctaText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  connectBtn: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  connectBtnSolid: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  connectText: { fontSize: 13, fontWeight: '900' },
  connectTextSolid: { color: '#fff', fontSize: 13, fontWeight: '900' },
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scopeHint: { marginTop: 8, fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  lockNote: { marginTop: 12, fontSize: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: 28, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingBottom: 28,
    maxHeight: SCREEN_H * 0.82,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, alignItems: 'center', gap: 8 },
  modalIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  modalSub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  batchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  batchPillText: { fontSize: 11, fontWeight: '800' },
  modalListHint: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalRowLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  modalRowVal: { fontSize: 12, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 18 },
  modalCancel: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  modalCancelTxt: { fontSize: 14, fontWeight: '800' },
  modalConfirm: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  modalConfirmTxt: { fontSize: 14, fontWeight: '900' },
});
