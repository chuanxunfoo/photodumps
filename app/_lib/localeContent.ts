import type { LanguageId } from '../(tabs)/ThemeContext';
import { HOBBY_WEEKLY_SWIPES } from './appConfig';
import {
  EXPLORE_FR,
  EXPLORE_JA,
  EXPLORE_KO,
  EXPLORE_ZH,
  patchExploreEs,
} from './i18n/exploreComplete';
import { normalizeLanguage } from './i18n/supported';

export type FaqItem = { q: string; a: string };

export type ExploreCopy = {
  swipesLeftWeek: string;
  sectionEveryone: string;
  sectionEveryoneHint: string;
  sectionPro: string;
  sectionProHint: string;
  sectionProLooks: string;
  sectionProLooksHint: string;
  sectionLegal: string;
  sectionLegalHint: string;
  settings: string;
  settingsSub: string;
  bookmarks: string;
  bookmarksSub: string;
  rateUs: string;
  rateUsSub: string;
  faq: string;
  faqSub: string;
  support: string;
  supportSub: string;
  supportModalTitle: string;
  supportModalHint: string;
  supportIgTitle: string;
  supportIgSub: string;
  supportEmailTitle: string;
  supportEmailSub: string;
  subscribe: string;
  subscribeSubManage: string;
  subscribeSubUpgrade: string;
  spinWheel: string;
  spinWheelSub: string;
  photobooth: string;
  photoboothSub: string;
  stickerStudio: string;
  stickerStudioSub: string;
  widgets: string;
  widgetsSub: string;
  emailClean: string;
  emailCleanSub: string;
  videoTrim: string;
  videoTrimSub: string;
  duplicates: string;
  duplicatesSub: string;
  myStats: string;
  myStatsSub: string;
  supercut: string;
  supercutSub: string;
  appTheme: string;
  appThemeSub: string;
  appIcon: string;
  appIconSub: string;
  languages: string;
  languagesSub: string;
  notifications: string;
  notificationsSub: string;
  terms: string;
  termsSub: string;
  privacy: string;
  privacySub: string;
  footerMadeIn: string;
  footerSub: string;
  footerSubscribe: string;
  footerTerms: string;
  footerRestore: string;
  tickerText: string;
};

export type SubscriptionCopy = {
  ticker: string;
  heroTitle: string;
  heroSub: string;
  rating: string;
  featProTitle: string;
  featHobbyTitle: string;
  callout: string;
  calloutBold: string;
  planHead: string;
  freeSub: string;
  ctaFree: string;
  ctaSubscribe: string;
  trustSecure: string;
  trustCancel: string;
  trustFees: string;
  termsLink: string;
  privacyLink: string;
  restore: string;
  proFeatures: string[];
  hobbyFeatures: string[];
};

export type FaqHeroCopy = {
  heroTitle: string;
  heroTap: string;
};

export type LegalCopy = {
  termsTitle: string;
  privacyTitle: string;
  lastUpdated: string;
};

type Bundle = {
  explore: ExploreCopy;
  subscription: SubscriptionCopy;
  faq: FaqItem[];
  faqHero: FaqHeroCopy;
  legal: LegalCopy;
};

const hobbySwipeLine = (n: number) => `${n} swipes per week`;

const EN: Bundle = {
  explore: {
    swipesLeftWeek: 'swipes left this week',
    sectionEveryone: 'FOR EVERYONE',
    sectionEveryoneHint: 'Core flows and good vibes — no paywall to open these doors.',
    sectionPro: 'PRO UNLOCKS',
    sectionProHint: 'Pro unlocks everything. Hobby gets free stats, one video trim, and two stickers — crown marks Pro-only tools.',
    sectionProLooks: 'PRO LOOKS',
    sectionProLooksHint: 'Six signature skins — typography, chrome, and motion follow your pick. Pro only (Hobby keeps Dark & Light).',
    sectionLegal: 'LEGAL',
    sectionLegalHint: 'Each link sits in its own lane — clear and easy to find.',
    settings: 'settings',
    settingsSub: 'Account, plan & preferences',
    bookmarks: 'bookmarks',
    bookmarksSub: 'Save favourite photos',
    rateUs: 'rate us',
    rateUsSub: 'Drag the smiley — tell us everything',
    faq: 'faq',
    faqSub: 'How swipes, Pro & safety work',
    support: 'support',
    supportSub: 'Instagram DM or email — tap to reach us',
    supportModalTitle: 'HOW CAN WE HELP?',
    supportModalHint: 'Pick how you want to reach us — we read every message.',
    supportIgTitle: 'DM us on Instagram',
    supportIgSub: '@photodumps.app · we usually reply within minutes',
    supportEmailTitle: 'Email support',
    supportEmailSub: 'photodumps.support@gmail.com · 1–2 working days',
    subscribe: 'subscribe',
    subscribeSubManage: 'Manage or restore your plan',
    subscribeSubUpgrade: 'Unlimited swipes + full toolkit',
    spinWheel: 'spin wheel',
    spinWheelSub: 'Win bonus swipes when your week runs low',
    photobooth: 'photobooth',
    photoboothSub: 'Digital cameras & photo strips',
    stickerStudio: 'sticker studio',
    stickerStudioSub: 'AI cutouts · cute frames · collage',
    widgets: 'widgets',
    widgetsSub: 'Home screen templates · your stickers · captions',
    emailClean: 'email clean',
    emailCleanSub: 'Clear spam, promos and old mail in small batches',
    videoTrim: 'video trim',
    videoTrimSub: 'CapCut-style cut · quality export to gallery',
    duplicates: 'duplicates',
    duplicatesSub: 'Burst-style stacks · swipe one set at a time',
    myStats: 'my stats',
    myStatsSub: 'Cleanup history & insights',
    supercut: 'supercut',
    supercutSub: 'AI batch cleaning',
    appTheme: 'app theme',
    appThemeSub: 'Free: Dark & Light · Pro: six signature skins (Y2K, Cyber…)',
    appIcon: 'app icon',
    appIconSub: 'Free: Classic & Stealth · Pro: eight alternate marks',
    languages: 'languages',
    languagesSub: 'Free: All languages',
    notifications: 'notifications',
    notificationsSub: 'Gentle cleanup reminders — free for everyone',
    terms: 'terms of service',
    termsSub: 'The serious-but-readable agreement',
    privacy: 'privacy policy',
    privacySub: 'What we collect & why',
    footerMadeIn: 'made with love in KL',
    footerSub: 'Late-night builds, teh tarik breaks, and the quiet joy of an empty camera roll.',
    footerSubscribe: 'Subscribe',
    footerTerms: 'Terms',
    footerRestore: 'Restore purchases',
    tickerText: 'PHOTODUMPS • EXPLORE • PERSONALIZE • STAY ORGANIZED',
  },
  subscription: {
    ticker: 'UNLOCK PRO  •  UNLIMITED SWIPES  •  AI POWERED  •  ZERO ADS',
    heroTitle: 'PHOTODUMPS PRO',
    heroSub: 'Join 50,000+ users who reclaimed gigabytes of storage — for good.',
    rating: '4.9 · 12,400 ratings',
    featProTitle: 'EVERYTHING UNLOCKED IN PRO',
    featHobbyTitle: 'EVERYTHING UNLOCKED IN HOBBY',
    callout: 'Monthly plan = less than a cup of coffee per day.',
    calloutBold: 'Start free, cancel anytime.',
    planHead: 'CHOOSE YOUR PLAN',
    freeSub: `${HOBBY_WEEKLY_SWIPES} swipes/week · Dark & Light themes · Notifications included`,
    ctaFree: 'CONTINUE WITH HOBBY',
    ctaSubscribe: 'SUBSCRIBE WITH APPLE PAY',
    trustSecure: 'Secure & Encrypted',
    trustCancel: 'Cancel Anytime',
    trustFees: 'No Hidden Fees',
    termsLink: 'Terms of Service',
    privacyLink: 'Privacy Policy',
    restore: 'Restore Purchase',
    proFeatures: [
      'Unlimited swipes — every day, forever',
      'Supercut, Deep Clean & batch delete',
      'Sticker Studio — full unlock',
      'Widgets — full unlock',
      'Photobooth — filters, frames & stickers',
      'Duplicates finder — burst & junk stacks',
      'AI duplicate & blur photo detection',
      'Full storage analytics & history',
      '4 exclusive premium colour themes',
      'Email clean — Gmail spam & promo batches',
      'Priority support · Zero ads, ever',
    ],
    hobbyFeatures: [
      `${HOBBY_WEEKLY_SWIPES} swipes every week — reset each Monday`,
      'Dark & Light colour themes',
      '6 languages included',
      'Settings, FAQ & bookmarks',
      'Notifications & gentle cleanup reminders',
      'Spin wheel for bonus swipes',
      'Swipe, queue & confirm deletions on-device',
      'Sign in to sync stats & streaks across devices',
    ],
  },
  faq: [
    { q: 'What is photodumps?', a: 'photodumps is a swipe-first photo cleaner for your camera roll. Swipe one way to keep a memory, the other to queue it for deletion — fast, tactile, and satisfying.' },
    { q: 'How do swipes and the Hobby plan work?', a: `Hobby includes ${HOBBY_WEEKLY_SWIPES} swipes per week (resets Monday). Use the spin wheel for bonus swipes, or upgrade to Pro for unlimited swipes and the full toolkit.` },
    { q: 'What is Supercut?', a: 'Supercut is the Pro batch assistant: scan for screenshots and duplicate-style shots, then clear them in one confirmed batch — faster than swiping every frame.' },
    { q: 'What are Bookmarks?', a: 'While you swipe, tap the bookmark on a photo to keep it and skip ahead — saved shots collect on the Bookmarks screen in Explore.' },
    { q: 'What is Deep Clean mode?', a: 'Deep Clean scans your entire library with AI-style heuristics, surfaces the largest files first, and lets you review and clear clutter at scale.' },
    { q: 'Which themes are free?', a: 'Dark and Light themes are on Hobby. Four signature Pro colour looks unlock with Pro.' },
    { q: 'Which languages are free?', a: 'Hobby includes six languages.' },
    { q: 'Are notifications free?', a: 'Yes. Cleanup reminders, digests, and streak nudges are available on Hobby — you control each toggle.' },
    { q: 'Will deleting photos free storage immediately?', a: 'Items stay in your delete queue until you confirm on the review screen — you always get a last look before anything is removed.' },
    { q: 'How do I restore a purchase?', a: 'Open Subscribe from Explore and tap Restore Purchase, or use your store account’s subscription settings.' },
  ],
  faqHero: { heroTitle: 'ANSWERS, UNFILTERED', heroTap: 'Tap a card to expand' },
  legal: { termsTitle: 'TERMS OF SERVICE', privacyTitle: 'PRIVACY POLICY', lastUpdated: 'Last updated: May 2026' },
};

const MS: Bundle = {
  explore: {
    ...EN.explore,
    swipesLeftWeek: 'swipe tinggal minggu ini',
    sectionEveryone: 'UNTUK SEMUA',
    sectionEveryoneHint: 'Aliran teras tanpa paywall — buka pintu ini dengan percuma.',
    sectionPro: 'PRO BUKA KUNCI',
    sectionProHint: 'Tema tanda tangan, bahasa tambahan, dan alat kuasa — mahkota menandakan apa Hobby boleh intip sahaja.',
    sectionProLooks: 'GAYA PRO',
    sectionProLooksHint: 'Enam kulit tanda tangan — Pro sahaja (Hobby kekal Gelap & Cerah).',
    sectionLegal: 'UNDANG-UNDANG',
    sectionLegalHint: 'Setiap pautan dalam lorong sendiri — jelas dan mudah dicari.',
    settings: 'tetapan',
    settingsSub: 'Akaun, pelan & keutamaan',
    bookmarks: 'penanda buku',
    bookmarksSub: 'Simpan foto kegemaran',
    rateUs: 'nilaikan kami',
    rateUsSub: 'Seret emoji — beritahu kami semuanya',
    faq: 'soalan lazim',
    faqSub: 'Cara swipe, Pro & keselamatan',
    subscribe: 'langgan',
    subscribeSubManage: 'Urus atau pulihkan pelan',
    subscribeSubUpgrade: 'Swipe tanpa had + toolkit penuh',
    spinWheel: 'roda putar',
    spinWheelSub: 'Menang swipe bonus bila minggu hampir habis',
    notifications: 'pemberitahuan',
    notificationsSub: 'Peringatan bersih lembut — percuma untuk semua',
    terms: 'terma perkhidmatan',
    termsSub: 'Perjanjian yang boleh dibaca',
    privacy: 'dasar privasi',
    privacySub: 'Apa yang kami kumpul & mengapa',
    footerMadeIn: 'dibuat dengan kasih di KL',
    footerSub: 'Kod lewat malam, teh tarik, dan kegembiraan galeri yang ringan.',
    footerSubscribe: 'Langgan',
    footerTerms: 'Terma',
    footerRestore: 'Pulihkan pembelian',
    tickerText: 'PHOTODUMPS • TEROKAI • PERIBADIKAN • KEKAL TERATUR',
    photobooth: 'bilik gambar',
    photoboothSub: 'Penapis, bingkai & pelekat',
    stickerStudio: 'studio pelekat',
    stickerStudioSub: 'Potong AI · bingkai comel · kolaj',
    widgets: 'widget',
    widgetsSub: 'Templat skrin utama · pelekat anda · kapsyen',
    videoTrim: 'potong video',
    videoTrimSub: 'Potong gaya CapCut · eksport ke galeri',
    duplicates: 'pendua',
    duplicatesSub: 'Tindanan burst · swipe satu set',
    myStats: 'statistik saya',
    myStatsSub: 'Sejarah & pandangan bersih',
    supercut: 'supercut',
    supercutSub: 'Pembersihan kelompok AI',
    appTheme: 'tema apl',
    appThemeSub: 'Percuma: Gelap & Cerah · Pro: enam kulit',
    appIcon: 'ikon apl',
    appIconSub: 'Percuma: Classic & Stealth · Pro: lapan ikon',
    languages: 'bahasa',
    languagesSub: 'Percuma: Semua bahasa',
  },
  subscription: {
    ...EN.subscription,
    ticker: 'BUKA PRO  •  SWIPE TANPA HAD  •  AI  •  TIADA IKLAN',
    heroSub: 'Lebih 50,000 pengguna telah membebaskan gigabait storan.',
    featProTitle: 'SEMUA DIBUKA DALAM PRO',
    featHobbyTitle: 'SEMUA DIBUKA DALAM HOBBY',
    callout: 'Pelan bulanan = kurang dari secawan kopi sehari.',
    calloutBold: 'Mula percuma, batal bila-bila masa.',
    planHead: 'PILIH PELAN ANDA',
    freeSub: `${HOBBY_WEEKLY_SWIPES} swipe/minggu · Tema Gelap & Cerah · Pemberitahuan disertakan`,
    ctaFree: 'TERUSKAN DENGAN HOBBY',
    hobbyFeatures: [
      `${HOBBY_WEEKLY_SWIPES} swipe setiap minggu — reset setiap Isnin`,
      'Tema Gelap & Cerah + ikon Classic & Stealth',
      'Antara muka English · Tetapan, FAQ & penanda buku',
      'Pemberitahuan & peringatan bersih',
      'Roda putar untuk swipe bonus',
      'Swipe, gilir & sahkan padam pada peranti',
      'Log masuk untuk segerak statistik & streak',
    ],
    proFeatures: [
      'Swipe tanpa had — setiap hari',
      'Pengesanan pendua & foto kabur AI',
      'Analitik storan & sejarah penuh',
      '9 tema premium eksklusif',
      '10 gaya ikon apl',
      'Semua 13 bahasa dibuka',
      'Supercut, Deep Clean & padam kelompok',
      'Sokongan keutamaan · Tiada iklan',
    ],
  },
  faq: [
    { q: 'Apakah photodumps?', a: 'photodumps ialah pembersih foto berasaskan swipe. Swipe satu arah untuk simpan, arah lain untuk gilir padam — pantas dan memuaskan.' },
    { q: 'Bagaimana swipe dan pelan Hobby berfungsi?', a: `Hobby termasuk ${HOBBY_WEEKLY_SWIPES} swipe seminggu (reset Isnin). Guna roda putar untuk bonus, atau naik taraf ke Pro untuk swipe tanpa had.` },
    { q: 'Apakah Supercut?', a: 'Supercut ialah pembantu kelompok Pro: imbas tangkapan skrin dan pendua, kemudian padam sekali gus selepas pengesahan.' },
    { q: 'Apakah Penanda Buku?', a: 'Ketuk penanda semasa swipe untuk simpan dan langkau — koleksi di skrin Explore.' },
    { q: 'Apakah mod Deep Clean?', a: 'Deep Clean mengimbas seluruh perpustakaan, mengutamakan fail terbesar, dan membolehkan anda bersihkan pada skala besar.' },
    { q: 'Tema dan ikon mana percuma?', a: 'Tema Gelap & Cerah serta ikon Classic & Stealth pada Hobby. Enam gaya Pro dan lapan ikon tambahan dengan Pro.' },
    { q: 'Bahasa mana percuma?', a: 'English disertakan pada Hobby. Semua bahasa lain dengan Pro.' },
    { q: 'Adakah pemberitahuan percuma?', a: 'Ya. Peringatan, ringkasan, dan streak tersedia pada Hobby — anda kawal setiap suis.' },
    { q: 'Adakah padam foto membebaskan storan serta-merta?', a: 'Item kekal dalam giliran sehingga anda sahkan pada skrin semakan.' },
    { q: 'Bagaimana pulihkan pembelian?', a: 'Buka Langgan dari Explore dan ketuk Pulihkan Pembelian, atau guna tetapan langganan kedai anda.' },
  ],
  faqHero: { heroTitle: 'JAWAPAN, TERUS TERANG', heroTap: 'Ketuk kad untuk kembang' },
  legal: { termsTitle: 'TERMA PERKHIDMATAN', privacyTitle: 'DASAR PRIVASI', lastUpdated: 'Kemas kini terakhir: Mei 2026' },
};

const ES: Bundle = {
  explore: {
    ...EN.explore,
    swipesLeftWeek: 'deslizamientos restantes esta semana',
    sectionEveryone: 'PARA TODOS',
    sectionEveryoneHint: 'Flujos esenciales sin paywall en estas puertas.',
    sectionPro: 'PRO DESBLOQUEA',
    sectionProHint: 'Temas exclusivos, idiomas y herramientas potentes.',
    sectionProLooks: 'ESTILOS PRO',
    sectionProLooksHint: 'Seis skins exclusivos — solo Pro (Hobby: Oscuro y Claro).',
    sectionLegal: 'LEGAL',
    settings: 'ajustes',
    settingsSub: 'Cuenta, plan y preferencias',
    bookmarks: 'marcadores',
    bookmarksSub: 'Guarda tus fotos favoritas',
    rateUs: 'valóranos',
    rateUsSub: 'Arrastra el emoji — cuéntanos todo',
    faq: 'preguntas',
    faqSub: 'Deslizamientos, Pro y seguridad',
    subscribe: 'suscribirse',
    subscribeSubManage: 'Gestionar o restaurar plan',
    subscribeSubUpgrade: 'Deslizamientos ilimitados + kit completo',
    spinWheel: 'ruleta',
    spinWheelSub: 'Gana deslizamientos extra cuando se acabe la semana',
    notifications: 'notificaciones',
    notificationsSub: 'Recordatorios suaves — gratis para todos',
    terms: 'términos de servicio',
    privacy: 'política de privacidad',
    footerSubscribe: 'Suscribirse',
    footerTerms: 'Términos',
    footerRestore: 'Restaurar compras',
    tickerText: 'PHOTODUMPS • EXPLORAR • PERSONALIZAR • MANTENTE ORGANIZADO',
    photobooth: 'cabina de fotos',
    photoboothSub: 'Filtros, marcos y stickers',
    videoTrim: 'recortar video',
    videoTrimSub: 'Corte estilo CapCut · exportar a galería',
    duplicates: 'duplicados',
    duplicatesSub: 'Ráfagas · desliza un set a la vez',
    myStats: 'mis estadísticas',
    myStatsSub: 'Historial e insights de limpieza',
    supercut: 'supercut',
    supercutSub: 'Limpieza por lotes con IA',
    appTheme: 'tema de la app',
    appThemeSub: 'Gratis: Oscuro y Claro · Pro: seis skins',
    appIcon: 'icono de la app',
    appIconSub: 'Gratis: Classic y Stealth · Pro: ocho iconos',
    languages: 'idiomas',
    languagesSub: 'Gratis: todos los idiomas',
  },
  subscription: {
    ...EN.subscription,
    heroSub: 'Más de 50.000 usuarios recuperaron gigabytes de almacenamiento.',
    featHobbyTitle: 'TODO DESBLOQUEADO EN HOBBY',
    featProTitle: 'TODO DESBLOQUEADO EN PRO',
    freeSub: `${HOBBY_WEEKLY_SWIPES} desliz./semana · Temas Oscuro y Claro · Notificaciones incluidas`,
    ctaFree: 'CONTINUAR CON HOBBY',
    hobbyFeatures: [
      `${HOBBY_WEEKLY_SWIPES} deslizamientos por semana — reinicio los lunes`,
      'Temas Oscuro y Claro + iconos Classic y Stealth',
      'Interfaz en inglés · Ajustes, FAQ y marcadores',
      'Notificaciones y recordatorios de limpieza',
      'Ruleta de deslizamientos bonus',
      'Desliza, encola y confirma borrados en el dispositivo',
      'Inicia sesión para sincronizar estadísticas',
    ],
  },
  faq: [
    { q: '¿Qué es photodumps?', a: 'photodumps limpia tu carrete con gestos de deslizamiento: un lado para conservar, otro para encolar el borrado.' },
    { q: '¿Cómo funcionan los deslizamientos y Hobby?', a: `Hobby incluye ${HOBBY_WEEKLY_SWIPES} deslizamientos por semana (reinicio los lunes). Usa la ruleta o pasa a Pro para ilimitados.` },
    { q: '¿Qué es Supercut?', a: 'Asistente por lotes Pro: detecta capturas y duplicados y los borra en un solo paso confirmado.' },
    { q: '¿Qué son los marcadores?', a: 'Toca el marcador al deslizar para guardar y saltar — se reúnen en Explorar.' },
    { q: '¿Qué es Deep Clean?', a: 'Escanea toda la biblioteca, prioriza los archivos más grandes y permite limpiar a gran escala.' },
    { q: '¿Temas e iconos gratis?', a: 'Oscuro y Claro + Classic y Stealth en Hobby. Seis looks Pro y ocho iconos con Pro.' },
    { q: '¿Idiomas gratis?', a: 'Inglés en Hobby. El resto con Pro.' },
    { q: '¿Notificaciones gratis?', a: 'Sí. Recordatorios y rachas en Hobby — tú controlas cada interruptor.' },
    { q: '¿Se libera espacio al instante?', a: 'Los elementos permanecen en cola hasta que confirmes en la pantalla de revisión.' },
    { q: '¿Restaurar compra?', a: 'Abre Suscribirse en Explorar y pulsa Restaurar compra.' },
  ],
  faqHero: { heroTitle: 'RESPUESTAS DIRECTAS', heroTap: 'Toca una tarjeta' },
  legal: { termsTitle: 'TÉRMINOS DE SERVICIO', privacyTitle: 'POLÍTICA DE PRIVACIDAD', lastUpdated: 'Última actualización: mayo 2026' },
};

/** Remaining languages: professional summaries aligned with EN. */
function bundleFromEn(partial: DeepPartial<Bundle>): Bundle {
  return {
    explore: { ...EN.explore, ...partial.explore },
    subscription: { ...EN.subscription, ...partial.subscription },
    faq: partial.faq ?? EN.faq,
    faqHero: { ...EN.faqHero, ...partial.faqHero },
    legal: { ...EN.legal, ...partial.legal },
  };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const FR = bundleFromEn({
  explore: {
    swipesLeftWeek: 'glissements restants cette semaine',
    sectionEveryone: 'POUR TOUS',
    sectionEveryoneHint: 'Parcours essentiels sans paywall.',
    sectionPro: 'PRO DÉBLOQUE',
    sectionProHint: 'Thèmes signature, langues et outils pro.',
    settings: 'réglages', settingsSub: 'Compte, forfait et préférences',
    bookmarks: 'signets', bookmarksSub: 'Enregistrez vos photos favorites',
    notifications: 'notifications', notificationsSub: 'Rappels doux — gratuit pour tous',
    faq: 'faq', faqSub: 'Swipes, Pro et sécurité',
    rateUs: 'notez-nous', rateUsSub: 'Glissez l’emoji — dites-nous tout',
    subscribe: "s'abonner", subscribeSubUpgrade: 'Swipes illimités + boîte à outils complète',
    spinWheel: 'roue bonus', spinWheelSub: 'Swipes bonus quand la semaine est basse',
    photobooth: 'photomaton', photoboothSub: 'Filtres, cadres et stickers',
    videoTrim: 'découpe vidéo', videoTrimSub: 'Montage style CapCut · export galerie',
    duplicates: 'doublons', duplicatesSub: 'Rafales · un set à la fois',
    myStats: 'mes stats', myStatsSub: 'Historique et insights',
    supercut: 'supercut', supercutSub: 'Nettoyage par lots IA',
    appTheme: 'thème', appThemeSub: 'Gratuit : Sombre & Clair · Pro : six skins',
    appIcon: 'icône', appIconSub: 'Gratuit : Classic & Stealth · Pro : huit icônes',
    languages: 'langues', languagesSub: 'Gratuit : toutes les langues',
    terms: 'terms of service', termsSub: 'English legal document',
    privacy: 'privacy policy', privacySub: 'English legal document',
    tickerText: 'PHOTODUMPS • EXPLORER • PERSONNALISER • RESTER ORGANISÉ',
    footerRestore: 'Restaurer les achats',
  },
  subscription: {
    featHobbyTitle: 'TOUT DÉBLOQUÉ EN HOBBY',
    ctaFree: 'CONTINUER AVEC HOBBY',
    freeSub: `${HOBBY_WEEKLY_SWIPES} glissements/semaine · Thèmes Sombre & Clair · Notifications incluses`,
  },
  faqHero: { heroTitle: 'RÉPONSES CLAIRES', heroTap: 'Touchez une carte' },
  legal: { termsTitle: "CONDITIONS D'UTILISATION", privacyTitle: 'POLITIQUE DE CONFIDENTIALITÉ', lastUpdated: 'Dernière mise à jour : mai 2026' },
});

const DE = bundleFromEn({
  explore: {
    swipesLeftWeek: 'kostenlose Wischgesten diese Woche',
    sectionEveryone: 'FÜR ALLE',
    sectionPro: 'PRO FREISCHALTUNG',
    settings: 'einstellungen', settingsSub: 'Konto, Plan & Einstellungen',
    bookmarks: 'lesezeichen', bookmarksSub: 'Lieblingsfotos speichern',
    notifications: 'benachrichtigungen', notificationsSub: 'Sanfte Erinnerungen — für alle kostenlos',
    faq: 'faq', faqSub: 'Swipes, Pro & Sicherheit',
    rateUs: 'bewerte uns', rateUsSub: 'Zieh das Emoji — sag uns alles',
    subscribe: 'abonnieren', subscribeSubUpgrade: 'Unbegrenzte Swipes + volles Toolkit',
    spinWheel: 'glücksrad', spinWheelSub: 'Bonus-Swipes wenn die Woche knapp wird',
    photobooth: 'fotobox', photoboothSub: 'Filter, Rahmen & Sticker',
    videoTrim: 'video schneiden', videoTrimSub: 'CapCut-Stil · Export in Galerie',
    duplicates: 'duplikate', duplicatesSub: 'Burst-Stapel · ein Set pro Swipe',
    myStats: 'meine stats', myStatsSub: 'Verlauf & Einblicke',
    supercut: 'supercut', supercutSub: 'KI-Stapelreinigung',
    appTheme: 'app-theme', appThemeSub: 'Gratis: Dunkel & Hell · Pro: sechs Skins',
    appIcon: 'app-icon', appIconSub: 'Gratis: Classic & Stealth · Pro: acht Icons',
    languages: 'sprachen', languagesSub: 'Gratis: alle Sprachen',
    terms: 'terms of service', termsSub: 'English legal document',
    privacy: 'privacy policy', privacySub: 'English legal document',
    tickerText: 'PHOTODUMPS • ENTDECKEN • PERSONALISIEREN • ORGANISIERT BLEIBEN',
    footerRestore: 'Käufe wiederherstellen',
  },
  subscription: {
    featHobbyTitle: 'ALLES IN HOBBY FREIGESCHALTET',
    ctaFree: 'MIT HOBBY FORTFAHREN',
    freeSub: `${HOBBY_WEEKLY_SWIPES} Wischgesten/Woche · Dunkel & Hell · Benachrichtigungen inkl.`,
  },
  legal: { termsTitle: 'NUTZUNGSBEDINGUNGEN', privacyTitle: 'DATENSCHUTZ', lastUpdated: 'Zuletzt aktualisiert: Mai 2026' },
});

const ZH = bundleFromEn({
  explore: {
    swipesLeftWeek: '本周剩余免费滑动次数',
    sectionEveryone: '人人可用',
    sectionPro: 'PRO 解锁',
    settings: '设置', bookmarks: '书签', faq: '常见问题', subscribe: '订阅',
    spinWheel: '转盘', notifications: '通知',
    notificationsSub: '温和提醒 — 全员免费',
    terms: '服务条款', privacy: '隐私政策',
  },
  subscription: {
    featHobbyTitle: 'HOBBY 已解锁功能',
    ctaFree: '继续使用 HOBBY',
    freeSub: `每周 ${HOBBY_WEEKLY_SWIPES} 次滑动 · 深色/浅色主题 · 含通知`,
  },
  legal: { termsTitle: '服务条款', privacyTitle: '隐私政策', lastUpdated: '最后更新：2026年5月' },
});

const JA = bundleFromEn({
  explore: {
    swipesLeftWeek: '今週の残り無料スワイプ',
    sectionEveryone: 'みんなに',
    sectionPro: 'PROで解放',
    settings: '設定', notificationsSub: 'やさしいリマインダー — 無料',
    spinWheel: 'スピンホイール',
  },
  subscription: {
    featHobbyTitle: 'HOBBYで利用できる機能',
    ctaFree: 'HOBBYで続ける',
    freeSub: `週${HOBBY_WEEKLY_SWIPES}回スワイプ · ダーク/ライト · 通知込み`,
  },
  legal: { termsTitle: '利用規約', privacyTitle: 'プライバシー', lastUpdated: '最終更新：2026年5月' },
});

const KO = bundleFromEn({
  explore: {
    swipesLeftWeek: '이번 주 남은 무료 스와이프',
    sectionEveryone: '모두를 위해',
    sectionPro: 'PRO 잠금 해제',
    settings: '설정', spinWheel: '스핀 휠',
    notificationsSub: '부드러운 알림 — 무료',
  },
  subscription: {
    featHobbyTitle: 'HOBBY에서 이용 가능',
    ctaFree: 'HOBBY로 계속',
    freeSub: `주 ${HOBBY_WEEKLY_SWIPES}회 스와이프 · 다크/라이트 · 알림 포함`,
  },
  legal: { termsTitle: '이용약관', privacyTitle: '개인정보 처리방침', lastUpdated: '최종 업데이트: 2026년 5월' },
});

const PT = bundleFromEn({
  explore: {
    swipesLeftWeek: 'deslizes restantes esta semana',
    sectionEveryone: 'PARA TODOS',
    spinWheel: 'roleta', notificationsSub: 'Lembretes suaves — grátis para todos',
  },
  subscription: { featHobbyTitle: 'TUDO NO HOBBY', ctaFree: 'CONTINUAR COM HOBBY' },
  legal: { termsTitle: 'TERMOS DE SERVIÇO', privacyTitle: 'PRIVACIDADE', lastUpdated: 'Atualizado: maio 2026' },
});

const IT = bundleFromEn({
  explore: {
    swipesLeftWeek: 'swipe gratuiti rimasti questa settimana',
    spinWheel: 'ruota bonus', notificationsSub: 'Promemoria leggeri — gratis per tutti',
  },
  subscription: { featHobbyTitle: 'TUTTO IN HOBBY', ctaFree: 'CONTINUA CON HOBBY' },
  legal: { termsTitle: 'TERMINI DI SERVIZIO', privacyTitle: 'PRIVACY', lastUpdated: 'Aggiornato: maggio 2026' },
});

const TR = bundleFromEn({
  explore: {
    swipesLeftWeek: 'bu hafta kalan ücretsiz kaydırma',
    spinWheel: 'çark', notificationsSub: 'Nazik hatırlatmalar — herkese ücretsiz',
  },
  subscription: { featHobbyTitle: 'HOBBY’DE AÇIK', ctaFree: 'HOBBY İLE DEVAM' },
  legal: { termsTitle: 'HİZMET ŞARTLARI', privacyTitle: 'GİZLİLİK', lastUpdated: 'Son güncelleme: Mayıs 2026' },
});

const AR = bundleFromEn({
  explore: {
    swipesLeftWeek: 'تمريرات مجانية متبقية هذا الأسبوع',
    spinWheel: 'عجلة الحظ', notificationsSub: 'تذكيرات لطيفة — مجانية للجميع',
  },
  subscription: { featHobbyTitle: 'متاح في HOBBY', ctaFree: 'المتابعة مع HOBBY' },
  legal: { termsTitle: 'شروط الخدمة', privacyTitle: 'الخصوصية', lastUpdated: 'آخر تحديث: مايو 2026' },
});

const RU = bundleFromEn({
  explore: {
    swipesLeftWeek: 'бесплатных свайпов осталось на неделю',
    spinWheel: 'колесо удачи', notificationsSub: 'Мягкие напоминания — бесплатно',
  },
  subscription: { featHobbyTitle: 'ВСЁ В HOBBY', ctaFree: 'ПРОДОЛЖИТЬ С HOBBY' },
  legal: { termsTitle: 'УСЛОВИЯ', privacyTitle: 'КОНФИДЕНЦИАЛЬНОСТЬ', lastUpdated: 'Обновлено: май 2026' },
});

const BUNDLES: Record<LanguageId, Bundle> = {
  en: EN, ms: MS, es: ES, fr: FR, de: DE, zh: ZH, ja: JA, ko: KO, pt: PT, it: IT, tr: TR, ar: AR, ru: RU,
};

function bundleFor(lang: LanguageId): Bundle {
  const id = normalizeLanguage(lang);
  const base = BUNDLES[id] ?? EN;
  if (id === 'fr') return { ...base, explore: EXPLORE_FR };
  if (id === 'ja') return { ...base, explore: EXPLORE_JA };
  if (id === 'ko') return { ...base, explore: EXPLORE_KO };
  if (id === 'zh') return { ...base, explore: EXPLORE_ZH };
  if (id === 'es') return { ...base, explore: patchExploreEs(base.explore) };
  return base;
}

export function getExploreCopy(lang: LanguageId): ExploreCopy {
  return bundleFor(lang).explore;
}

export function getSubscriptionCopy(lang: LanguageId): SubscriptionCopy {
  return bundleFor(lang).subscription;
}

export function getFaqItems(lang: LanguageId): FaqItem[] {
  return bundleFor(lang).faq;
}

export function getFaqHero(lang: LanguageId): FaqHeroCopy {
  return bundleFor(lang).faqHero;
}

export function getLegalCopy(lang: LanguageId): LegalCopy {
  return bundleFor(lang).legal;
}
