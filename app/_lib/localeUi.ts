import type { LanguageId } from '../(tabs)/ThemeContext';
import { normalizeLanguage } from './i18n/supported';
import { UI_ES_EXTRA, UI_FR, UI_JA, UI_KO, UI_ZH } from './i18n/localeUiLang';

/** Extra UI strings (merged app-wide). */
export type LocaleUi = {
  settingsTitle: string;
  settingsSubtitle: string;
  settingsAccount: string;
  settingsUpgrade: string;
  settingsSignOut: string;
  settingsUserId: string;
  settingsEmail: string;
  settingsUsername: string;
  settingsPlanAdmin: string;
  settingsPlanPro: string;
  settingsPlanHobby: string;
  settingsSwipesHint: string;
  settingsUnlimited: string;
  faqScreenTitle: string;
  faqScreenLead: string;
  notificationsTitle: string;
  notificationsSubtitle: string;
  notificationsMaster: string;
  notificationsMasterHint: string;
  notificationsReminders: string;
  notificationsRemindersHint: string;
  notificationsDigest: string;
  notificationsDigestHint: string;
  notificationsStreak: string;
  notificationsStreakHint: string;
  notificationsSupercut: string;
  notificationsSupercutHint: string;
  supercutTitle: string;
  supercutSubtitle: string;
  supercutScan: string;
  supercutRun: string;
  supercutAnalyzing: string;
  supercutEmpty: string;
  supercutConfirmTitle: string;
  supercutConfirmMsg: string;
  insightsTitle: string;
  insightsSession: string;
  insightsAllTime: string;
  insightsItems: string;
  insightsBytes: string;
  insightsNewSession: string;
  insightsLibrary: string;
  insightsStorageReclaimed: string;
  insightsAccountTotals: string;
  insightsDeletedCount: string;
  insightsDeletedSpace: string;
  insightsBreakdown: string;
  insightsPhotos: string;
  insightsScreenshots: string;
  insightsVideos: string;
  insightsLivePhotos: string;
  insightsLibraryPulse: string;
  insightsEmptyHint: string;
  insightsAllMedia: string;
  dumpQueuePhotos: string;
  hubFeatures: string;
  hubGenerals: string;
  hubUpgrade: string;
  hubSignedIn: string;
  widgetsTitle: string;
  widgetsHint: string;
  widgetsNote: string;
  widgetsHeader: string;
  widgetsMySection: string;
  widgetsCreateSection: string;
  widgetsEmpty: string;
  widgetsUntitled: string;
  widgetOnHome: string;
  widgetDeleteTitle: string;
  widgetDeleteMsg: string;
  widgetDeleteConfirm: string;
  widgetActiveTitle: string;
  widgetActiveMsg: string;
  widgetStickers: string;
  widgetCaption: string;
  widgetSave: string;
  widgetHelp: string;
  captionModalTitle: string;
  captionPlaceholder: string;
  captionCancel: string;
  captionDone: string;
  captionFonts: string;
  captionColors: string;
  captionSize: string;
  widgetPermTitle: string;
  widgetPermMsg: string;
  widgetSavedTitle: string;
  widgetSavedMsg: string;
  widgetSaveFailedTitle: string;
  widgetSaveFailedMsg: string;
  templateNotFound: string;
  stickerStudioSubtitle: string;
  collageSubtitle: string;
  langModalTitle: string;
  langModalHint: string;
  langIncluded: string;
  langPro: string;
};

const EN: LocaleUi = {
  settingsTitle: 'SETTINGS',
  settingsSubtitle: 'Account & plan',
  settingsAccount: 'ACCOUNT',
  settingsUpgrade: 'Upgrade to Pro',
  settingsSignOut: 'Sign out',
  settingsUserId: 'User ID',
  settingsEmail: 'Email',
  settingsUsername: 'Username',
  settingsPlanAdmin: 'Admin',
  settingsPlanPro: 'Pro',
  settingsPlanHobby: 'Hobby',
  settingsSwipesHint: 'swipes left this week',
  settingsUnlimited: 'Unlimited swipes',
  faqScreenTitle: 'FAQ',
  faqScreenLead: 'Quick answers about swiping, Pro, themes, languages, and safety.',
  notificationsTitle: 'NOTIFICATIONS',
  notificationsSubtitle: 'Reminders & nudges — you stay in control.',
  notificationsMaster: 'Allow notifications',
  notificationsMasterHint: 'Master switch. When off, no alerts are scheduled.',
  notificationsReminders: 'Cleanup reminders',
  notificationsRemindersHint: 'Gentle nudges to review your camera roll.',
  notificationsDigest: 'Weekly digest',
  notificationsDigestHint: 'One summary of space saved and streaks.',
  notificationsStreak: 'Streak protection',
  notificationsStreakHint: 'Ping before you break a cleanup streak.',
  notificationsSupercut: 'Supercut ready',
  notificationsSupercutHint: 'When an AI batch scan finishes or needs you.',
  supercutTitle: 'SUPERCUT',
  supercutSubtitle: 'One-tap AI batch cleaning',
  supercutScan: 'ANALYSE LIBRARY',
  supercutRun: 'RUN SUPERCUT',
  supercutAnalyzing: 'Scanning your library…',
  supercutEmpty: 'Nothing obvious to clean right now.',
  supercutConfirmTitle: 'Run Supercut?',
  supercutConfirmMsg: 'This will permanently delete the selected items from your device. Continue?',
  insightsTitle: 'MY STATS',
  insightsSession: 'This session',
  insightsAllTime: 'All time',
  insightsItems: 'items cleared',
  insightsBytes: 'storage freed',
  insightsNewSession: 'New session',
  insightsLibrary: 'Library scan',
  insightsStorageReclaimed: 'STORAGE RECLAIMED',
  insightsAccountTotals: 'ACCOUNT TOTALS',
  insightsDeletedCount: 'items deleted',
  insightsDeletedSpace: 'space cleared',
  insightsBreakdown: 'GALLERY BREAKDOWN',
  insightsPhotos: 'Photos',
  insightsScreenshots: 'Screenshots',
  insightsVideos: 'Videos',
  insightsLivePhotos: 'Live Photos',
  insightsLibraryPulse: 'LIBRARY PULSE',
  insightsEmptyHint: 'Sign in, then delete from Swipe or Supercut — every removal through photodumps counts toward your totals.',
  insightsAllMedia: 'ALL MEDIA',
  dumpQueuePhotos: 'photos',
  hubFeatures: 'Features',
  hubGenerals: 'Generals',
  hubUpgrade: 'UPGRADE',
  hubSignedIn: 'Signed in',
  widgetsTitle: 'Widget maker',
  widgetsHint: 'Save designs in My widgets. To pick one on your home screen: add the Dumplt widget, then long-press it → Edit → Choose design.',
  widgetsNote:
    'After saving in the app, open Dumplt once so designs sync. Then long-press the home screen widget → Edit → Choose design lists your saved templates.',
  widgetsHeader: 'Widgets',
  widgetsMySection: 'MY WIDGETS',
  widgetsCreateSection: 'NEW TEMPLATE',
  widgetsEmpty: 'No saved widgets yet. Pick a template below to create one.',
  widgetsUntitled: 'Widget',
  widgetOnHome: 'Home',
  widgetDeleteTitle: 'Delete widget?',
  widgetDeleteMsg: 'This removes the design from your library.',
  widgetDeleteConfirm: 'Delete',
  widgetActiveTitle: 'Set for home screen',
  widgetActiveMsg:
    'Synced to your home screen widget. Long-press the Dumplt widget on your home screen → Edit → Choose design to pick this template (or another saved one).',
  widgetStickers: 'Stickers',
  widgetCaption: 'Caption',
  widgetSave: 'Save',
  widgetHelp: 'Drag stickers in the zone, add a caption (resize in Caption), drag text to the bottom, then Save.',
  captionModalTitle: 'Caption',
  captionPlaceholder: 'Write a short line…',
  captionCancel: 'Cancel',
  captionDone: 'Done',
  captionFonts: 'Font',
  captionColors: 'Color',
  widgetPermTitle: 'Permission needed',
  widgetPermMsg: 'Allow photo library access to save your widget.',
  widgetSavedTitle: 'Saved',
  widgetSavedMsg: 'Saved in My widgets and set for your home screen. Add the Dumplt widget on iOS after installing your latest build.',
  widgetSaveFailedTitle: 'Save failed',
  widgetSaveFailedMsg: 'Could not save this widget. Try again.',
  templateNotFound: 'Template not found.',
  stickerStudioSubtitle: 'Sticker studio',
  collageSubtitle: 'Collage',
  langModalTitle: 'LANGUAGES',
  langModalHint: 'English is included on Hobby. Every other language unlocks with Pro.',
  langIncluded: 'INCLUDED',
  langPro: 'PRO LANGUAGES',
};

const MS: Partial<LocaleUi> = {
  settingsTitle: 'TETAPAN',
  settingsSubtitle: 'Akaun & pelan',
  settingsAccount: 'AKAUN',
  settingsUpgrade: 'Naik taraf ke Pro',
  settingsSignOut: 'Log keluar',
  settingsUserId: 'ID Pengguna',
  settingsEmail: 'E-mel',
  settingsUsername: 'Nama pengguna',
  settingsSwipesHint: 'swipe percuma minggu ini',
  settingsUnlimited: 'Swipe tanpa had',
  faqScreenTitle: 'SOAL LAZIM',
  faqScreenLead: 'Jawapan ringkas tentang swipe, Pro, tema, bahasa, dan keselamatan.',
  notificationsTitle: 'PEMBERITAHUAN',
  notificationsSubtitle: 'Peringatan — anda kawal.',
  notificationsMaster: 'Benarkan pemberitahuan',
  notificationsMasterHint: 'Suis utama. Tutup = tiada amaran dijadualkan.',
  notificationsReminders: 'Peringatan bersih',
  notificationsRemindersHint: 'Ingatkan semak galeri.',
  notificationsDigest: 'Ringkasan mingguan',
  notificationsDigestHint: 'Ringkasan ruang dijimatkan.',
  notificationsStreak: 'Perlindungan streak',
  notificationsStreakHint: 'Maklum sebelum streak putus.',
  notificationsSupercut: 'Supercut siap',
  notificationsSupercutHint: 'Imbasan AI siap atau perlu anda.',
  supercutTitle: 'SUPERCUT',
  supercutSubtitle: 'Pembersihan kumpulan satu ketik',
  supercutScan: 'IMBAS PERPUSTAKAAN',
  supercutRun: 'JALAN SUPERCUT',
  supercutAnalyzing: 'Mengimbas perpustakaan…',
  supercutEmpty: 'Tiada yang jelas untuk dibersihkan.',
  supercutConfirmTitle: 'Jalankan Supercut?',
  supercutConfirmMsg: 'Ini akan memadam item dipilih secara kekal. Teruskan?',
  insightsTitle: 'STATISTIK SAYA',
  insightsSession: 'Sesi ini',
  insightsAllTime: 'Sepanjang masa',
  insightsItems: 'item dibuang',
  insightsBytes: 'storan dibebaskan',
  insightsNewSession: 'Sesi baharu',
  insightsLibrary: 'Imbasan pustaka',
  insightsStorageReclaimed: 'STORAN DIJIMATKAN',
  insightsAccountTotals: 'JUMLAH AKAUN',
  insightsDeletedCount: 'item dipadam',
  insightsDeletedSpace: 'ruang dibebaskan',
  insightsBreakdown: 'PECAHAN GALERI',
  insightsPhotos: 'Foto',
  insightsScreenshots: 'Tangkapan skrin',
  insightsVideos: 'Video',
  insightsLivePhotos: 'Foto Live',
  insightsLibraryPulse: 'DENYUT GALERI',
  insightsEmptyHint: 'Log masuk, kemudian padam dari Swipe atau Supercut — setiap pemadaman dikira.',
  insightsAllMedia: 'SEMUA MEDIA',
  dumpQueuePhotos: 'foto',
};

const ES: Partial<LocaleUi> = {
  settingsTitle: 'AJUSTES',
  settingsUnlimited: 'Swipes ilimitados',
  settingsSubtitle: 'Cuenta y plan',
  settingsAccount: 'CUENTA',
  settingsUpgrade: 'Mejorar a Pro',
  settingsSignOut: 'Cerrar sesión',
  faqScreenTitle: 'PREGUNTAS',
  faqScreenLead: 'Respuestas rápidas sobre deslizar, Pro, temas e idiomas.',
  notificationsTitle: 'NOTIFICACIONES',
  notificationsSubtitle: 'Recordatorios — tú mandas.',
  notificationsMaster: 'Permitir notificaciones',
  supercutTitle: 'SUPERCUT',
  supercutScan: 'ANALIZAR BIBLIOTECA',
  supercutRun: 'EJECUTAR SUPERCUT',
  insightsTitle: 'MIS ESTADÍSTICAS',
  insightsSession: 'Esta sesión',
  insightsAllTime: 'En total',
  insightsStorageReclaimed: 'ALMACENAMIENTO RECUPERADO',
  insightsAccountTotals: 'TOTALES DE CUENTA',
  insightsDeletedCount: 'elementos eliminados',
  insightsDeletedSpace: 'espacio liberado',
  insightsBreakdown: 'DESGLOSE DE GALERÍA',
  insightsPhotos: 'Fotos',
  insightsScreenshots: 'Capturas',
  insightsVideos: 'Videos',
  insightsLivePhotos: 'Fotos en vivo',
  insightsLibraryPulse: 'PULSO DE GALERÍA',
  insightsEmptyHint: 'Inicia sesión y elimina desde Swipe o Supercut — cada borrado cuenta en tus totales.',
  insightsAllMedia: 'TODO EL CONTENIDO',
};

const overrides: Partial<Record<LanguageId, Partial<LocaleUi>>> = {
  es: { ...ES, ...UI_ES_EXTRA },
  fr: UI_FR,
  ja: UI_JA,
  ko: UI_KO,
  zh: UI_ZH,
};

export function getLocaleUi(lang: LanguageId): LocaleUi {
  const id = normalizeLanguage(lang);
  return { ...EN, ...(overrides[id] ?? {}) };
}
