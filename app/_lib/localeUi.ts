import type { LanguageId } from '../(tabs)/ThemeContext';

/** Extra UI strings (merged app-wide). Non-English fall back to English until translated. */
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

const overrides: Partial<Record<LanguageId, Partial<LocaleUi>>> = { ms: MS, es: ES };

export function getLocaleUi(lang: LanguageId): LocaleUi {
  return { ...EN, ...(overrides[lang] ?? {}) };
}
