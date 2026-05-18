import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { HOBBY_WEEKLY_SWIPES } from '../_lib/appConfig';
import {
  appPlanToProfilePlan,
  ensureProfileRow,
  fetchProfileByUserId,
  profilePlanToAppPlan,
  updateProfilePlanType,
  type ProfilePlanType,
} from '../_lib/profilePlanSupabase';
import { isSupabaseConfigured, supabase } from './supabase';

/** Old device-wide keys — caused wrong plan when another user signed in. */
const LEGACY_PLAN_KEYS = ['@dumpit_plan', '@dumpit_pro', '@dumpit_admin'] as const;

function planStorageKey(uid: string, kind: 'plan' | 'pro' | 'admin') {
  return `@dumpit_${kind}:${uid}`;
}

function appPlanFromProfile(planType: ProfilePlanType): PlanType {
  const p = profilePlanToAppPlan(planType);
  return p === 'hobby' ? 'hobby' : p;
}

export type ThemeId =
  | 'dark' | 'light'
  | 'cyberpunk' | 'vintage' | 'zen' | 'y2k' | 'nordic' | 'brutalist';

export type LanguageId =
  | 'en' | 'es' | 'fr' | 'it' | 'pt' | 'de'
  | 'ja' | 'ko' | 'zh' | 'tr' | 'ar' | 'ru' | 'ms';

export interface ThemeColors {
  bg: string; bg2: string; bg3: string; card: string;
  border: string; text: string; textSub: string; textMuted: string;
  accent: string; accentSoft: string; success: string; danger: string;
  tabBar: string; isDark: boolean;
  accent2: string;
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  borderW: number;
  typeface: 'system' | 'serif' | 'mono' | 'display';
  uppercaseUi: boolean;
  /** 0 = off; ~0.04–0.08 subtle CRT lines */
  scanlineOpacity: number;
}

const THEMES: Record<ThemeId, ThemeColors> = {
  dark: {
    bg: '#030303', bg2: '#0A0A0A', bg3: '#111111', card: '#0D0D0D',
    border: '#1A1A1A', text: '#FFFFFF', textSub: '#888888', textMuted: '#555555',
    accent: '#FF0055', accentSoft: 'rgba(255,0,85,0.12)', success: '#00FFA3',
    danger: '#FF3B30', tabBar: 'rgba(4,4,4,0.97)', isDark: true,
    accent2: '#FF3377', radiusSm: 12, radiusMd: 16, radiusLg: 24, borderW: 1,
    typeface: 'system', uppercaseUi: true, scanlineOpacity: 0,
  },
  light: {
    bg: '#F5F5F5', bg2: '#FFFFFF', bg3: '#EFEFEF', card: '#FFFFFF',
    border: '#E0E0E0', text: '#111111', textSub: '#666666', textMuted: '#999999',
    accent: '#FF0055', accentSoft: 'rgba(255,0,85,0.08)', success: '#00C853',
    danger: '#FF3B30', tabBar: 'rgba(255,255,255,0.97)', isDark: false,
    accent2: '#FF3377', radiusSm: 12, radiusMd: 16, radiusLg: 24, borderW: 1,
    typeface: 'system', uppercaseUi: true, scanlineOpacity: 0,
  },
  cyberpunk: {
    bg: '#02040A', bg2: '#051018', bg3: '#081C28', card: '#06101C',
    border: 'rgba(0,255,170,0.35)', text: '#E6FFF4', textSub: '#6BD4AA', textMuted: '#3D8A68',
    accent: '#00FF9C', accentSoft: 'rgba(0,255,156,0.14)', success: '#00FFA3',
    danger: '#FF0055', tabBar: 'rgba(2,6,14,0.98)', isDark: true,
    accent2: '#00C2FF', radiusSm: 10, radiusMd: 14, radiusLg: 20, borderW: 1.5,
    typeface: 'system', uppercaseUi: true, scanlineOpacity: 0.055,
  },
  vintage: {
    bg: '#EDE4D3', bg2: '#F8F2E6', bg3: '#E5DBC8', card: '#FBF8F0',
    border: '#C9B896', text: '#4A3728', textSub: '#7D6A58', textMuted: '#A39688',
    accent: '#8B4513', accentSoft: 'rgba(139,69,19,0.12)', success: '#2E7D4A',
    danger: '#B5493A', tabBar: 'rgba(251,248,240,0.98)', isDark: false,
    accent2: '#C9A227', radiusSm: 14, radiusMd: 18, radiusLg: 22, borderW: 1,
    typeface: 'serif', uppercaseUi: false, scanlineOpacity: 0,
  },
  zen: {
    bg: '#FAFAFA', bg2: '#FFFFFF', bg3: '#F4F4F4', card: '#FFFFFF',
    border: '#E6E6E6', text: '#111111', textSub: '#666666', textMuted: '#A0A0A0',
    accent: '#000000', accentSoft: 'rgba(0,0,0,0.06)', success: '#0A7A4A',
    danger: '#C62828', tabBar: 'rgba(255,255,255,0.98)', isDark: false,
    accent2: '#888888', radiusSm: 8, radiusMd: 10, radiusLg: 12, borderW: 1,
    typeface: 'system', uppercaseUi: false, scanlineOpacity: 0,
  },
  y2k: {
    bg: '#2A0838', bg2: '#3D1450', bg3: '#1E0530', card: '#36205A',
    border: '#000000', text: '#FFF5FF', textSub: '#EEAADD', textMuted: '#B888CC',
    accent: '#FF2BA6', accentSoft: 'rgba(255,43,166,0.18)', success: '#00FFC6',
    danger: '#FF0055', tabBar: 'rgba(42,8,56,0.97)', isDark: true,
    accent2: '#C77DFF', radiusSm: 18, radiusMd: 24, radiusLg: 32, borderW: 3,
    typeface: 'display', uppercaseUi: false, scanlineOpacity: 0,
  },
  nordic: {
    bg: '#141E26', bg2: '#1A2630', bg3: '#223140', card: '#1C2730',
    border: '#2E3F4E', text: '#EAF2F6', textSub: '#8CAFC2', textMuted: '#5C7788',
    accent: '#2DD4BF', accentSoft: 'rgba(45,212,191,0.14)', success: '#5EEAD4',
    danger: '#F87171', tabBar: 'rgba(20,30,38,0.97)', isDark: true,
    accent2: '#38BDF8', radiusSm: 12, radiusMd: 16, radiusLg: 20, borderW: 1,
    typeface: 'system', uppercaseUi: false, scanlineOpacity: 0,
  },
  brutalist: {
    bg: '#F2F0E6', bg2: '#E8E4D8', bg3: '#DAD6CC', card: '#F7F5ED',
    border: '#000000', text: '#000000', textSub: '#333333', textMuted: '#555555',
    accent: '#000000', accentSoft: 'rgba(255,230,0,0.22)', success: '#00AA55',
    danger: '#FF0055', tabBar: 'rgba(242,240,230,0.98)', isDark: false,
    accent2: '#FFE600', radiusSm: 0, radiusMd: 2, radiusLg: 4, borderW: 3,
    typeface: 'mono', uppercaseUi: true, scanlineOpacity: 0,
  },
};

/** Old storage keys → new Pro theme (one-time migration). */
const LEGACY_THEME_STORAGE: Record<string, ThemeId> = {
  midnight: 'cyberpunk', blue: 'nordic', red: 'y2k', pink: 'y2k', yellow: 'brutalist',
  green: 'cyberpunk', purple: 'y2k', orange: 'vintage',
};

export const THEMES_MAP = THEMES;
export const FREE_THEMES: ThemeId[] = ['dark', 'light'];
export const PREMIUM_THEMES: ThemeId[] = ['cyberpunk', 'vintage', 'zen', 'y2k', 'nordic', 'brutalist'];
export const THEME_PICKER_IDS: ThemeId[] = [...FREE_THEMES, ...PREMIUM_THEMES];

export interface ThemeMeta {
  label: string;
  /** Short marketing line */
  pitch: string;
  /** Second line — mood keywords */
  mood: string;
  preview: [string, string, string];
  emoji: string;
}

export const THEME_META: Record<ThemeId, ThemeMeta> = {
  dark: {
    label: 'Dark', pitch: 'Signature photodumps night mode.', mood: 'Ink black · hot pink accent',
    preview: ['#030303', '#FF0055', '#0A0A0A'], emoji: '🖤',
  },
  light: {
    label: 'Light', pitch: 'Clean studio canvas.', mood: 'Paper white · minimal contrast',
    preview: ['#F5F5F5', '#FF0055', '#FFFFFF'], emoji: '🤍',
  },
  cyberpunk: {
    label: 'Cyberpunk City', pitch: 'Terminal neon, scanlines, glowing chrome.', mood: 'Tech-forward · danger in hot pink',
    preview: ['#02040A', '#00FF9C', '#00C2FF'], emoji: '🌃',
  },
  vintage: {
    label: 'Aesthetic Vintage', pitch: 'Warm parchment & sepia — memory-journal energy.', mood: 'Serif · soft gold · premium calm',
    preview: ['#EDE4D3', '#8B4513', '#C9A227'], emoji: '📜',
  },
  zen: {
    label: 'Zen Minimal', pitch: 'Apple-Notes quiet — hairlines & light type.', mood: 'White space · highest perceived premium',
    preview: ['#FAFAFA', '#000000', '#E6E6E6'], emoji: '◯',
  },
  y2k: {
    label: 'Y2K Bubblegum', pitch: 'Loud pink-purple, thick borders, offset shadow.', mood: 'TikTok-native · instantly recognisable',
    preview: ['#2A0838', '#FF2BA6', '#C77DFF'], emoji: '💿',
  },
  nordic: {
    label: 'Nordic Fjord', pitch: 'Deep slate calm with aurora teal & ice blue.', mood: 'Scandi serious · pro & casual',
    preview: ['#141E26', '#2DD4BF', '#38BDF8'], emoji: '🧊',
  },
  brutalist: {
    label: 'Brutalist Zine', pitch: 'Newsprint, 3px black rules, yellow highlight.', mood: 'No other cleaner looks like this',
    preview: ['#F2F0E6', '#000000', '#FFE600'], emoji: '📰',
  },
};

export function resolveTypeface(theme: ThemeColors): { titleFont?: string; bodyFont?: string } {
  switch (theme.typeface) {
    case 'serif':
      return {
        titleFont: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
        bodyFont: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
      };
    case 'mono':
      return {
        titleFont: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        bodyFont: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      };
    case 'display':
      return {
        titleFont: Platform.select({ ios: 'AvenirNext-Heavy', android: 'sans-serif-black', default: undefined }),
        bodyFont: Platform.select({ ios: 'AvenirNext-Medium', android: 'sans-serif', default: undefined }),
      };
    default:
      return {};
  }
}

function ScanlineOverlay({ opacity }: { opacity: number }) {
  const { height } = useWindowDimensions();
  if (!opacity || opacity <= 0) return null;
  const lineOpacity = Math.min(0.22, opacity * 5);
  const n = Math.min(100, Math.ceil(height / 4));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} collapsable={false}>
      {Array.from({ length: n }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: i * 4,
            height: 1,
            backgroundColor: `rgba(0,0,0,${lineOpacity})`,
          }}
        />
      ))}
    </View>
  );
}

export const LANGUAGES: Record<LanguageId, string> = {
  en: 'English 🇬🇧', es: 'Español 🇪🇸', fr: 'Français 🇫🇷', it: 'Italiano 🇮🇹',
  pt: 'Português 🇵🇹', de: 'Deutsch 🇩🇪', ja: '日本語 🇯🇵', ko: '한국어 🇰🇷',
  zh: '中文 🇨🇳', tr: 'Türkçe 🇹🇷', ar: 'العربية 🇸🇦', ru: 'Русский 🇷🇺', ms: 'Melayu 🇲🇾',
};

// ─── TRANSLATIONS ────────────────────────────────────────────────────
export interface Translations {
  tabArchive: string; tabDump: string; tabExplore: string;
  photoArchive: string; timeCapsule: string; timeCapsuleLine: string;
  photos: string; year: string; months: string;
  deepCleanMode: string; deepCleanSub: string;
  allMonths: string; monthsSelected: string; monthlyArchive: string;
  selectYear: string; current: string;
  scanning: string; allPhotos: string;
  trash: string; keep: string; dump: string;
  photoDetails: string; size: string; date: string; device: string; dimensions: string;
  deleteQueue: string; deleteAll: string; allDone: string;
  photosQueued: string; reviewDelete: string; rescueHint: string;
  swipesLeft: string; freeSwipesLeft: string;
  subscribe: string; supercut: string; bookmarks: string;
  myStats: string; appTheme: string; appIcon: string;
  languages: string; notifications: string;
  premium: string; personalise: string; upgradeBtn: string;
  signIn: string; createAccount: string; emailAddress: string;
  password: string; fullName: string; username: string;
  phone: string; confirmPassword: string;
  forgotPassword: string; sendResetLink: string;
  termsAndPrivacy: string; iAgree: string;
  continueApple: string; continueGoogle: string;
  back: string; done: string; clear: string; cancel: string;
  suggested: string; otherLanguages: string;
  premiumTheme: string; proUnlockAll: string;
}

const T: Record<LanguageId, Translations> = {
  en: {
    tabArchive: 'ARCHIVE', tabDump: 'SWIPE', tabExplore: 'EXPLORE',
    photoArchive: 'PHOTO ARCHIVE', timeCapsule: 'TIME CAPSULE', timeCapsuleLine: 'Every month holds a story — swipe it clean.',
    photos: 'PHOTOS', year: 'YEAR', months: 'MONTHS',
    deepCleanMode: 'DEEP CLEAN MODE',
    deepCleanSub: 'AI scans your full library and surfaces the largest files first — reclaim space where it counts.',
    allMonths: 'ALL 12 MONTHS', monthsSelected: 'MONTHS SELECTED', monthlyArchive: 'MONTHLY ARCHIVE',
    selectYear: 'SELECT YEAR', current: 'CURRENT',
    scanning: 'SCANNING GALLERY...', allPhotos: 'ALL PHOTOS',
    trash: 'TRASH', keep: 'KEEP', dump: 'CLEAN',
    photoDetails: 'PHOTO DETAILS', size: 'SIZE', date: 'DATE', device: 'DEVICE', dimensions: 'DIMENSIONS',
    deleteQueue: 'DELETE QUEUE', deleteAll: 'DELETE ALL', allDone: 'ALL DONE!',
    photosQueued: 'photos queued', reviewDelete: 'REVIEW & DELETE',
    rescueHint: 'Tap any photo to rescue it from deletion',
    swipesLeft: 'free swipes left', freeSwipesLeft: 'free swipes left',
    subscribe: 'subscribe', supercut: 'supercut', bookmarks: 'bookmarks',
    myStats: 'my stats', appTheme: 'app theme', appIcon: 'app icon',
    languages: 'languages', notifications: 'notifications',
    premium: 'PREMIUM', personalise: 'PERSONALISE', upgradeBtn: 'UPGRADE ›',
    signIn: 'SIGN IN', createAccount: 'CREATE ACCOUNT', emailAddress: 'EMAIL ADDRESS',
    password: 'PASSWORD', fullName: 'FULL NAME', username: 'USERNAME',
    phone: 'PHONE (OPTIONAL)', confirmPassword: 'CONFIRM PASSWORD',
    forgotPassword: 'Forgot password?', sendResetLink: 'SEND RESET LINK',
    termsAndPrivacy: 'Terms & Privacy', iAgree: 'I agree to the',
    continueApple: 'Continue with Apple', continueGoogle: 'Continue with Google',
    back: 'BACK', done: 'DONE', clear: 'CLEAR ×', cancel: 'CANCEL',
    suggested: 'SUGGESTED', otherLanguages: 'OTHER LANGUAGES',
    premiumTheme: 'Premium Theme', proUnlockAll: 'Tap logo 3× to enable admin mode',
  },
  ms: {
    tabArchive: 'ARKIB', tabDump: 'BUANG', tabExplore: 'TEROKAI',
    photoArchive: 'ARKIB FOTO', timeCapsule: 'KAPSUL MASA', timeCapsuleLine: 'Setiap bulan ada cerita — swipe untuk bersihkan.',
    photos: 'FOTO', year: 'TAHUN', months: 'BULAN',
    deepCleanMode: 'MOD BERSIH DALAM',
    deepCleanSub: 'AI mengimbas seluruh perpustakaan dan mengutamakan fail terbesar — bebaskan ruang yang paling berbaloi.',
    allMonths: 'SEMUA 12 BULAN', monthsSelected: 'BULAN DIPILIH', monthlyArchive: 'ARKIB BULANAN',
    selectYear: 'PILIH TAHUN', current: 'SEMASA',
    scanning: 'MENGIMBAS GALERI...', allPhotos: 'SEMUA FOTO',
    trash: 'BUANG', keep: 'SIMPAN', dump: 'BUANG',
    photoDetails: 'BUTIRAN FOTO', size: 'SAIZ', date: 'TARIKH', device: 'PERANTI', dimensions: 'DIMENSI',
    deleteQueue: 'GILIRAN PADAM', deleteAll: 'PADAM SEMUA', allDone: 'SELESAI!',
    photosQueued: 'foto dalam giliran', reviewDelete: 'SEMAK & PADAM',
    rescueHint: 'Ketuk mana-mana foto untuk selamatkannya',
    swipesLeft: 'swipe percuma tinggal', freeSwipesLeft: 'swipe percuma tinggal',
    subscribe: 'langgan', supercut: 'supercut', bookmarks: 'penanda buku',
    myStats: 'statistik saya', appTheme: 'tema apl', appIcon: 'ikon apl',
    languages: 'bahasa', notifications: 'pemberitahuan',
    premium: 'PREMIUM', personalise: 'PERIBADIKAN', upgradeBtn: 'NAIK TARAF ›',
    signIn: 'LOG MASUK', createAccount: 'BUAT AKAUN', emailAddress: 'ALAMAT E-MEL',
    password: 'KATA LALUAN', fullName: 'NAMA PENUH', username: 'NAMA PENGGUNA',
    phone: 'TELEFON (PILIHAN)', confirmPassword: 'SAHKAN KATA LALUAN',
    forgotPassword: 'Lupa kata laluan?', sendResetLink: 'HANTAR PAUTAN TETAPAN SEMULA',
    termsAndPrivacy: 'Terma & Privasi', iAgree: 'Saya bersetuju dengan',
    continueApple: 'Teruskan dengan Apple', continueGoogle: 'Teruskan dengan Google',
    back: 'KEMBALI', done: 'SELESAI', clear: 'KOSONGKAN ×', cancel: 'BATAL',
    suggested: 'DICADANGKAN', otherLanguages: 'BAHASA LAIN',
    premiumTheme: 'Tema Premium', proUnlockAll: 'Ketuk logo 3× untuk mod admin',
  },
  es: {
    tabArchive: 'ARCHIVO', tabDump: 'TIRAR', tabExplore: 'EXPLORAR',
    photoArchive: 'ARCHIVO DE FOTOS', timeCapsule: 'CÁPSULA DEL TIEMPO', timeCapsuleLine: 'Cada mes guarda una historia — límpiala con un swipe.',
    photos: 'FOTOS', year: 'AÑO', months: 'MESES',
    deepCleanMode: 'LIMPIEZA PROFUNDA',
    deepCleanSub: 'La IA escanea toda tu biblioteca y prioriza los archivos más pesados — recupera espacio donde más importa.',
    allMonths: 'TODOS LOS MESES', monthsSelected: 'MESES SELECCIONADOS', monthlyArchive: 'ARCHIVO MENSUAL',
    selectYear: 'SELECCIONAR AÑO', current: 'ACTUAL',
    scanning: 'ESCANEANDO GALERÍA...', allPhotos: 'TODAS LAS FOTOS',
    trash: 'BASURA', keep: 'GUARDAR', dump: 'TIRAR',
    photoDetails: 'DETALLES DE FOTO', size: 'TAMAÑO', date: 'FECHA', device: 'DISPOSITIVO', dimensions: 'DIMENSIONES',
    deleteQueue: 'COLA DE ELIMINACIÓN', deleteAll: 'ELIMINAR TODO', allDone: '¡TODO LISTO!',
    photosQueued: 'fotos en cola', reviewDelete: 'REVISAR Y ELIMINAR',
    rescueHint: 'Toca cualquier foto para rescatarla',
    swipesLeft: 'deslizamientos gratuitos restantes', freeSwipesLeft: 'deslizamientos gratuitos',
    subscribe: 'suscribirse', supercut: 'supercorte', bookmarks: 'marcadores',
    myStats: 'mis estadísticas', appTheme: 'tema de la app', appIcon: 'icono de la app',
    languages: 'idiomas', notifications: 'notificaciones',
    premium: 'PREMIUM', personalise: 'PERSONALIZAR', upgradeBtn: 'MEJORAR ›',
    signIn: 'INICIAR SESIÓN', createAccount: 'CREAR CUENTA', emailAddress: 'CORREO ELECTRÓNICO',
    password: 'CONTRASEÑA', fullName: 'NOMBRE COMPLETO', username: 'USUARIO',
    phone: 'TELÉFONO (OPCIONAL)', confirmPassword: 'CONFIRMAR CONTRASEÑA',
    forgotPassword: '¿Olvidaste tu contraseña?', sendResetLink: 'ENVIAR ENLACE',
    termsAndPrivacy: 'Términos y Privacidad', iAgree: 'Acepto los',
    continueApple: 'Continuar con Apple', continueGoogle: 'Continuar con Google',
    back: 'ATRÁS', done: 'LISTO', clear: 'LIMPIAR ×', cancel: 'CANCELAR',
    suggested: 'SUGERIDOS', otherLanguages: 'OTROS IDIOMAS',
    premiumTheme: 'Tema Premium', proUnlockAll: 'Toca el logo 3× para modo admin',
  },
  fr: {
    tabArchive: 'ARCHIVE', tabDump: 'VIDER', tabExplore: 'EXPLORER',
    photoArchive: 'ARCHIVE PHOTO', timeCapsule: 'CAPSULE TEMPORELLE', timeCapsuleLine: 'Chaque mois raconte une histoire — faites place au swipe.',
    photos: 'PHOTOS', year: 'ANNÉE', months: 'MOIS',
    deepCleanMode: 'NETTOYAGE PROFOND',
    deepCleanSub: "L'IA analyse toute votre bibliothèque et met en avant les fichiers les plus lourds — libérez l'espace qui compte.",
    allMonths: 'TOUS LES MOIS', monthsSelected: 'MOIS SÉLECTIONNÉS', monthlyArchive: 'ARCHIVE MENSUELLE',
    selectYear: "SÉLECTIONNER L'ANNÉE", current: 'ACTUEL',
    scanning: 'SCAN DE LA GALERIE...', allPhotos: 'TOUTES LES PHOTOS',
    trash: 'CORBEILLE', keep: 'GARDER', dump: 'VIDER',
    photoDetails: 'DÉTAILS DE LA PHOTO', size: 'TAILLE', date: 'DATE', device: 'APPAREIL', dimensions: 'DIMENSIONS',
    deleteQueue: 'FILE DE SUPPRESSION', deleteAll: 'TOUT SUPPRIMER', allDone: 'TOUT EST FAIT!',
    photosQueued: 'photos en attente', reviewDelete: 'VÉRIFIER ET SUPPRIMER',
    rescueHint: 'Touchez une photo pour la sauver',
    swipesLeft: 'glissements gratuits restants', freeSwipesLeft: 'glissements gratuits',
    subscribe: "s'abonner", supercut: 'supercoupe', bookmarks: 'signets',
    myStats: 'mes stats', appTheme: "thème de l'app", appIcon: "icône de l'app",
    languages: 'langues', notifications: 'notifications',
    premium: 'PREMIUM', personalise: 'PERSONNALISER', upgradeBtn: 'AMÉLIORER ›',
    signIn: 'SE CONNECTER', createAccount: 'CRÉER UN COMPTE', emailAddress: 'ADRESSE E-MAIL',
    password: 'MOT DE PASSE', fullName: 'NOM COMPLET', username: "NOM D'UTILISATEUR",
    phone: 'TÉLÉPHONE (OPTIONNEL)', confirmPassword: 'CONFIRMER LE MOT DE PASSE',
    forgotPassword: 'Mot de passe oublié?', sendResetLink: 'ENVOYER LE LIEN',
    termsAndPrivacy: 'Termes et Confidentialité', iAgree: "J'accepte les",
    continueApple: 'Continuer avec Apple', continueGoogle: 'Continuer avec Google',
    back: 'RETOUR', done: 'TERMINÉ', clear: 'EFFACER ×', cancel: 'ANNULER',
    suggested: 'SUGGÉRÉS', otherLanguages: 'AUTRES LANGUES',
    premiumTheme: 'Thème Premium', proUnlockAll: 'Tapez logo 3× pour mode admin',
  },
  it: {
    tabArchive: 'ARCHIVIO', tabDump: 'CESTINA', tabExplore: 'ESPLORA',
    photoArchive: 'ARCHIVIO FOTO', timeCapsule: 'CAPSULA DEL TEMPO', timeCapsuleLine: 'Ogni mese racconta una storia — puliscila con uno swipe.',
    photos: 'FOTO', year: 'ANNO', months: 'MESI',
    deepCleanMode: 'PULIZIA PROFONDA',
    deepCleanSub: "L'IA analizza l'intera libreria e mette in evidenza i file più pesanti — recupera spazio dove conta.",
    allMonths: 'TUTTI I MESI', monthsSelected: 'MESI SELEZIONATI', monthlyArchive: 'ARCHIVIO MENSILE',
    selectYear: 'SELEZIONA ANNO', current: 'CORRENTE',
    scanning: 'SCANSIONE GALLERIA...', allPhotos: 'TUTTE LE FOTO',
    trash: 'CESTINA', keep: 'TIENI', dump: 'BUTTA',
    photoDetails: 'DETTAGLI FOTO', size: 'DIMENSIONE', date: 'DATA', device: 'DISPOSITIVO', dimensions: 'DIMENSIONI',
    deleteQueue: 'CODA ELIMINAZIONE', deleteAll: 'ELIMINA TUTTO', allDone: 'TUTTO FATTO!',
    photosQueued: 'foto in coda', reviewDelete: 'RIVEDI ED ELIMINA',
    rescueHint: 'Tocca una foto per salvarla',
    swipesLeft: 'scorrimenti gratuiti rimasti', freeSwipesLeft: 'scorrimenti gratuiti',
    subscribe: 'abbonati', supercut: 'supertaglio', bookmarks: 'segnalibri',
    myStats: 'le mie statistiche', appTheme: "tema dell'app", appIcon: "icona dell'app",
    languages: 'lingue', notifications: 'notifiche',
    premium: 'PREMIUM', personalise: 'PERSONALIZZA', upgradeBtn: 'AGGIORNA ›',
    signIn: 'ACCEDI', createAccount: 'CREA ACCOUNT', emailAddress: 'INDIRIZZO EMAIL',
    password: 'PASSWORD', fullName: 'NOME COMPLETO', username: 'NOME UTENTE',
    phone: 'TELEFONO (OPZIONALE)', confirmPassword: 'CONFERMA PASSWORD',
    forgotPassword: 'Password dimenticata?', sendResetLink: 'INVIA LINK DI RESET',
    termsAndPrivacy: 'Termini e Privacy', iAgree: 'Accetto i',
    continueApple: 'Continua con Apple', continueGoogle: 'Continua con Google',
    back: 'INDIETRO', done: 'FATTO', clear: 'CANCELLA ×', cancel: 'ANNULLA',
    suggested: 'SUGGERITI', otherLanguages: 'ALTRE LINGUE',
    premiumTheme: 'Tema Premium', proUnlockAll: 'Tocca logo 3× per modalità admin',
  },
  pt: {
    tabArchive: 'ARQUIVO', tabDump: 'DESCARTAR', tabExplore: 'EXPLORAR',
    photoArchive: 'ARQUIVO DE FOTOS', timeCapsule: 'CÁPSULA DO TEMPO', timeCapsuleLine: 'Cada mês guarda uma história — limpe com um swipe.',
    photos: 'FOTOS', year: 'ANO', months: 'MESES',
    deepCleanMode: 'LIMPEZA PROFUNDA',
    deepCleanSub: 'A IA analisa toda a biblioteca e prioriza os ficheiros maiores — recupere espaço onde importa.',
    allMonths: 'TODOS OS MESES', monthsSelected: 'MESES SELECIONADOS', monthlyArchive: 'ARQUIVO MENSAL',
    selectYear: 'SELECIONAR ANO', current: 'ATUAL',
    scanning: 'ESCANEANDO GALERIA...', allPhotos: 'TODAS AS FOTOS',
    trash: 'LIXO', keep: 'MANTER', dump: 'DESCARTAR',
    photoDetails: 'DETALHES DA FOTO', size: 'TAMANHO', date: 'DATA', device: 'DISPOSITIVO', dimensions: 'DIMENSÕES',
    deleteQueue: 'FILA DE EXCLUSÃO', deleteAll: 'EXCLUIR TUDO', allDone: 'TUDO PRONTO!',
    photosQueued: 'fotos na fila', reviewDelete: 'REVISAR E EXCLUIR',
    rescueHint: 'Toque em qualquer foto para salvá-la',
    swipesLeft: 'deslizes gratuitos restantes', freeSwipesLeft: 'deslizes gratuitos',
    subscribe: 'assinar', supercut: 'supercorte', bookmarks: 'favoritos',
    myStats: 'minhas estatísticas', appTheme: 'tema do aplicativo', appIcon: 'ícone do aplicativo',
    languages: 'idiomas', notifications: 'notificações',
    premium: 'PREMIUM', personalise: 'PERSONALIZAR', upgradeBtn: 'MELHORAR ›',
    signIn: 'ENTRAR', createAccount: 'CRIAR CONTA', emailAddress: 'ENDEREÇO DE E-MAIL',
    password: 'SENHA', fullName: 'NOME COMPLETO', username: 'NOME DE USUÁRIO',
    phone: 'TELEFONE (OPCIONAL)', confirmPassword: 'CONFIRMAR SENHA',
    forgotPassword: 'Esqueceu a senha?', sendResetLink: 'ENVIAR LINK DE REDEFINIÇÃO',
    termsAndPrivacy: 'Termos e Privacidade', iAgree: 'Concordo com os',
    continueApple: 'Continuar com Apple', continueGoogle: 'Continuar com Google',
    back: 'VOLTAR', done: 'PRONTO', clear: 'LIMPAR ×', cancel: 'CANCELAR',
    suggested: 'SUGERIDOS', otherLanguages: 'OUTROS IDIOMAS',
    premiumTheme: 'Tema Premium', proUnlockAll: 'Toque logo 3× para modo admin',
  },
  de: {
    tabArchive: 'ARCHIV', tabDump: 'LÖSCHEN', tabExplore: 'ERKUNDEN',
    photoArchive: 'FOTO-ARCHIV', timeCapsule: 'ZEITKAPSEL', timeCapsuleLine: 'Jeder Monat erzählt eine Geschichte — per Swipe aufräumen.',
    photos: 'FOTOS', year: 'JAHR', months: 'MONATE',
    deepCleanMode: 'TIEFENREINIGUNG',
    deepCleanSub: 'KI durchsucht Ihre gesamte Bibliothek und priorisiert die größten Dateien — Speicher dort freigeben, wo es zählt.',
    allMonths: 'ALLE 12 MONATE', monthsSelected: 'MONATE AUSGEWÄHLT', monthlyArchive: 'MONATSARCHIV',
    selectYear: 'JAHR AUSWÄHLEN', current: 'AKTUELL',
    scanning: 'GALERIE WIRD GESCANNT...', allPhotos: 'ALLE FOTOS',
    trash: 'PAPIERKORB', keep: 'BEHALTEN', dump: 'LÖSCHEN',
    photoDetails: 'FOTODETAILS', size: 'GRÖßE', date: 'DATUM', device: 'GERÄT', dimensions: 'ABMAßUNGEN',
    deleteQueue: 'LÖSCHLISTE', deleteAll: 'ALLE LÖSCHEN', allDone: 'ALLES ERLEDIGT!',
    photosQueued: 'Fotos in der Warteschlange', reviewDelete: 'ÜBERPRÜFEN & LÖSCHEN',
    rescueHint: 'Foto antippen zum Retten',
    swipesLeft: 'kostenlose Wischgesten übrig', freeSwipesLeft: 'kostenlose Wischgesten',
    subscribe: 'abonnieren', supercut: 'Superschnitt', bookmarks: 'Lesezeichen',
    myStats: 'meine Statistiken', appTheme: 'App-Design', appIcon: 'App-Symbol',
    languages: 'Sprachen', notifications: 'Benachrichtigungen',
    premium: 'PREMIUM', personalise: 'PERSONALISIEREN', upgradeBtn: 'UPGRADEN ›',
    signIn: 'ANMELDEN', createAccount: 'KONTO ERSTELLEN', emailAddress: 'E-MAIL-ADRESSE',
    password: 'PASSWORT', fullName: 'VOLLSTÄNDIGER NAME', username: 'BENUTZERNAME',
    phone: 'TELEFON (OPTIONAL)', confirmPassword: 'PASSWORT BESTÄTIGEN',
    forgotPassword: 'Passwort vergessen?', sendResetLink: 'RESET-LINK SENDEN',
    termsAndPrivacy: 'AGB und Datenschutz', iAgree: 'Ich stimme den',
    continueApple: 'Mit Apple fortfahren', continueGoogle: 'Mit Google fortfahren',
    back: 'ZURÜCK', done: 'FERTIG', clear: 'LÖSCHEN ×', cancel: 'ABBRECHEN',
    suggested: 'VORGESCHLAGEN', otherLanguages: 'ANDERE SPRACHEN',
    premiumTheme: 'Premium-Design', proUnlockAll: 'Logo 3× tippen für Admin-Modus',
  },
  ja: {
    tabArchive: 'アーカイブ', tabDump: 'ダンプ', tabExplore: '探索',
    photoArchive: 'フォトアーカイブ', timeCapsule: 'タイムカプセル', timeCapsuleLine: '毎月に物語がある — スワイプですっきり。',
    photos: '写真', year: '年', months: '月',
    deepCleanMode: 'ディープクリーン',
    deepCleanSub: 'AIがライブラリ全体をスキャンし、最も容量の大きい項目を優先表示 — 本当に効く場所から空き容量を確保。',
    allMonths: '全12ヶ月', monthsSelected: 'ヶ月選択', monthlyArchive: '月別アーカイブ',
    selectYear: '年を選択', current: '現在',
    scanning: 'ギャラリーをスキャン中...', allPhotos: 'すべての写真',
    trash: 'ゴミ箱', keep: 'キープ', dump: '削除',
    photoDetails: '写真の詳細', size: 'サイズ', date: '日付', device: 'デバイス', dimensions: '寸法',
    deleteQueue: '削除キュー', deleteAll: 'すべて削除', allDone: '完了！',
    photosQueued: '枚の写真がキュー', reviewDelete: '確認して削除',
    rescueHint: '写真をタップして救出',
    swipesLeft: '回の無料スワイプ残り', freeSwipesLeft: '回の無料スワイプ',
    subscribe: 'サブスクライブ', supercut: 'スーパーカット', bookmarks: 'ブックマーク',
    myStats: '統計', appTheme: 'テーマ', appIcon: 'アイコン',
    languages: '言語', notifications: '通知',
    premium: 'プレミアム', personalise: 'パーソナライズ', upgradeBtn: 'アップグレード ›',
    signIn: 'サインイン', createAccount: 'アカウント作成', emailAddress: 'メールアドレス',
    password: 'パスワード', fullName: 'フルネーム', username: 'ユーザー名',
    phone: '電話番号（任意）', confirmPassword: 'パスワード確認',
    forgotPassword: 'パスワードを忘れましたか？', sendResetLink: 'リセットリンクを送信',
    termsAndPrivacy: '利用規約とプライバシー', iAgree: '同意します',
    continueApple: 'Appleで続ける', continueGoogle: 'Googleで続ける',
    back: '戻る', done: '完了', clear: 'クリア ×', cancel: 'キャンセル',
    suggested: 'おすすめ', otherLanguages: 'その他の言語',
    premiumTheme: 'プレミアムテーマ', proUnlockAll: 'ロゴを3×タップで管理者モード',
  },
  ko: {
    tabArchive: '아카이브', tabDump: '버리기', tabExplore: '탐색',
    photoArchive: '사진 아카이브', timeCapsule: '타임 캡슐', timeCapsuleLine: '매달 이야기가 쌓입니다 — 스와이프로 정리하세요.',
    photos: '사진', year: '연도', months: '개월',
    deepCleanMode: '딥 클린 모드',
    deepCleanSub: 'AI가 전체 라이브러리를 스캔해 가장 큰 파일부터 보여줍니다 — 효과적인 곳부터 공간을 확보하세요.',
    allMonths: '전체 12개월', monthsSelected: '개월 선택됨', monthlyArchive: '월별 아카이브',
    selectYear: '연도 선택', current: '현재',
    scanning: '갤러리 스캔 중...', allPhotos: '모든 사진',
    trash: '휴지통', keep: '보관', dump: '삭제',
    photoDetails: '사진 세부정보', size: '크기', date: '날짜', device: '기기', dimensions: '크기',
    deleteQueue: '삭제 대기열', deleteAll: '모두 삭제', allDone: '모두 완료!',
    photosQueued: '장 대기 중', reviewDelete: '검토 및 삭제',
    rescueHint: '사진을 탭하여 삭제 취소',
    swipesLeft: '번의 무료 스와이프 남음', freeSwipesLeft: '번의 무료 스와이프',
    subscribe: '구독', supercut: '슈퍼컷', bookmarks: '북마크',
    myStats: '내 통계', appTheme: '앱 테마', appIcon: '앱 아이콘',
    languages: '언어', notifications: '알림',
    premium: '프리미엄', personalise: '개인화', upgradeBtn: '업그레이드 ›',
    signIn: '로그인', createAccount: '계정 만들기', emailAddress: '이메일 주소',
    password: '비밀번호', fullName: '전체 이름', username: '사용자명',
    phone: '전화번호 (선택)', confirmPassword: '비밀번호 확인',
    forgotPassword: '비밀번호를 잊으셨나요?', sendResetLink: '재설정 링크 보내기',
    termsAndPrivacy: '약관 및 개인정보', iAgree: '동의합니다',
    continueApple: 'Apple로 계속', continueGoogle: 'Google로 계속',
    back: '뒤로', done: '완료', clear: '지우기 ×', cancel: '취소',
    suggested: '제안됨', otherLanguages: '다른 언어',
    premiumTheme: '프리미엄 테마', proUnlockAll: '로고 3× 탭으로 관리자 모드',
  },
  zh: {
    tabArchive: '归档', tabDump: '清理', tabExplore: '探索',
    photoArchive: '照片归档', timeCapsule: '时间胶囊', timeCapsuleLine: '每个月都有故事 — 轻轻一滑，整理干净。',
    photos: '照片', year: '年份', months: '月份',
    deepCleanMode: '深度清理模式',
    deepCleanSub: 'AI 扫描整个图库并优先展示占用最大的文件 — 在最关键处释放空间。',
    allMonths: '全部12个月', monthsSelected: '个月已选', monthlyArchive: '月度归档',
    selectYear: '选择年份', current: '当前',
    scanning: '扫描图库中...', allPhotos: '所有照片',
    trash: '垃圾', keep: '保留', dump: '清理',
    photoDetails: '照片详情', size: '大小', date: '日期', device: '设备', dimensions: '尺寸',
    deleteQueue: '删除队列', deleteAll: '全部删除', allDone: '全部完成！',
    photosQueued: '张照片待删除', reviewDelete: '检查并删除',
    rescueHint: '点击照片可取消删除',
    swipesLeft: '次免费滑动剩余', freeSwipesLeft: '次免费滑动',
    subscribe: '订阅', supercut: '超级剪辑', bookmarks: '书签',
    myStats: '我的统计', appTheme: '应用主题', appIcon: '应用图标',
    languages: '语言', notifications: '通知',
    premium: '高级', personalise: '个性化', upgradeBtn: '升级 ›',
    signIn: '登录', createAccount: '创建账户', emailAddress: '电子邮件地址',
    password: '密码', fullName: '全名', username: '用户名',
    phone: '电话（可选）', confirmPassword: '确认密码',
    forgotPassword: '忘记密码？', sendResetLink: '发送重置链接',
    termsAndPrivacy: '条款和隐私', iAgree: '我同意',
    continueApple: '通过Apple继续', continueGoogle: '通过Google继续',
    back: '返回', done: '完成', clear: '清除 ×', cancel: '取消',
    suggested: '推荐', otherLanguages: '其他语言',
    premiumTheme: '高级主题', proUnlockAll: '点击徽标3×进入管理员模式',
  },
  tr: {
    tabArchive: 'ARŞİV', tabDump: 'SİL', tabExplore: 'KEŞFET',
    photoArchive: 'FOTOĞRAF ARŞİVİ', timeCapsule: 'ZAMAN KAPSÜLÜ', timeCapsuleLine: 'Her ay bir hikâye saklar — kaydırarak temizleyin.',
    photos: 'FOTOĞRAF', year: 'YIL', months: 'AY',
    deepCleanMode: 'DERİN TEMİZLİK',
    deepCleanSub: 'AI tüm kitaplığınızı tarar ve en büyük dosyaları öne çıkarır — alanı gerçekten önemli yerde boşaltın.',
    allMonths: 'TÜM 12 AY', monthsSelected: 'AY SEÇİLDİ', monthlyArchive: 'AYLIK ARŞİV',
    selectYear: 'YIL SEÇ', current: 'GÜNCEL',
    scanning: 'GALERİ TARANIYOR...', allPhotos: 'TÜM FOTOĞRAFLAR',
    trash: 'ÇÖP', keep: 'SAKLA', dump: 'SİL',
    photoDetails: 'FOTOĞRAF DETAYLARI', size: 'BOYUT', date: 'TARİH', device: 'CİHAZ', dimensions: 'BOYUTLAR',
    deleteQueue: 'SİLME SIRASI', deleteAll: 'HEPSİNİ SİL', allDone: 'TAMAMLANDI!',
    photosQueued: 'fotoğraf sırada', reviewDelete: 'İNCELE VE SİL',
    rescueHint: 'Kurtarmak için fotoğrafa dokun',
    swipesLeft: 'ücretsiz kaydırma kaldı', freeSwipesLeft: 'ücretsiz kaydırma',
    subscribe: 'abone ol', supercut: 'süperkesim', bookmarks: 'yer imleri',
    myStats: 'istatistiklerim', appTheme: 'uygulama teması', appIcon: 'uygulama simgesi',
    languages: 'diller', notifications: 'bildirimler',
    premium: 'PREMİUM', personalise: 'KİŞİSELLEŞTİR', upgradeBtn: 'YÜKSELT ›',
    signIn: 'GİRİŞ YAP', createAccount: 'HESAP OLUŞTUR', emailAddress: 'E-POSTA ADRESİ',
    password: 'ŞİFRE', fullName: 'TAM AD', username: 'KULLANICI ADI',
    phone: 'TELEFON (İSTEĞE BAĞLI)', confirmPassword: 'ŞİFREYİ ONAYLA',
    forgotPassword: 'Şifreni mi unuttun?', sendResetLink: 'SIFIRLAMA LİNKİ GÖNDER',
    termsAndPrivacy: 'Şartlar ve Gizlilik', iAgree: 'Kabul ediyorum',
    continueApple: 'Apple ile devam et', continueGoogle: 'Google ile devam et',
    back: 'GERİ', done: 'TAMAM', clear: 'TEMİZLE ×', cancel: 'İPTAL',
    suggested: 'ÖNERİLEN', otherLanguages: 'DİĞER DİLLER',
    premiumTheme: 'Premium Tema', proUnlockAll: 'Admin modu için logoya 3× dokun',
  },
  ar: {
    tabArchive: 'أرشيف', tabDump: 'حذف', tabExplore: 'استكشاف',
    photoArchive: 'أرشيف الصور', timeCapsule: 'كبسولة الوقت', timeCapsuleLine: 'كل شهر يحمل قصة — نظّفها بسحبة واحدة.',
    photos: 'صور', year: 'سنة', months: 'أشهر',
    deepCleanMode: 'تنظيف عميق',
    deepCleanSub: 'يفحص الذكاء الاصطناعي مكتبتك بالكامل ويعرض أكبر الملفات أولاً — حرّر المساحة حيث يهم.',
    allMonths: 'كل 12 شهراً', monthsSelected: 'أشهر محددة', monthlyArchive: 'أرشيف شهري',
    selectYear: 'اختر السنة', current: 'الحالي',
    scanning: 'جاري مسح المعرض...', allPhotos: 'كل الصور',
    trash: 'سلة المهملات', keep: 'احتفظ', dump: 'احذف',
    photoDetails: 'تفاصيل الصورة', size: 'الحجم', date: 'التاريخ', device: 'الجهاز', dimensions: 'الأبعاد',
    deleteQueue: 'قائمة الحذف', deleteAll: 'حذف الكل', allDone: 'تم الانتهاء!',
    photosQueued: 'صور في قائمة الانتظار', reviewDelete: 'مراجعة وحذف',
    rescueHint: 'اضغط على أي صورة لإنقاذها',
    swipesLeft: 'تمريرات مجانية متبقية', freeSwipesLeft: 'تمريرات مجانية',
    subscribe: 'اشترك', supercut: 'قطع فائق', bookmarks: 'إشارات مرجعية',
    myStats: 'إحصائياتي', appTheme: 'سمة التطبيق', appIcon: 'أيقونة التطبيق',
    languages: 'اللغات', notifications: 'الإشعارات',
    premium: 'مميز', personalise: 'تخصيص', upgradeBtn: 'ترقية ›',
    signIn: 'تسجيل الدخول', createAccount: 'إنشاء حساب', emailAddress: 'عنوان البريد الإلكتروني',
    password: 'كلمة المرور', fullName: 'الاسم الكامل', username: 'اسم المستخدم',
    phone: 'الهاتف (اختياري)', confirmPassword: 'تأكيد كلمة المرور',
    forgotPassword: 'هل نسيت كلمة المرور؟', sendResetLink: 'إرسال رابط إعادة التعيين',
    termsAndPrivacy: 'الشروط والخصوصية', iAgree: 'أوافق على',
    continueApple: 'المتابعة مع Apple', continueGoogle: 'المتابعة مع Google',
    back: 'رجوع', done: 'تم', clear: 'مسح ×', cancel: 'إلغاء',
    suggested: 'مقترح', otherLanguages: 'لغات أخرى',
    premiumTheme: 'سمة مميزة', proUnlockAll: 'اضغط الشعار 3× لوضع المشرف',
  },
  ru: {
    tabArchive: 'АРХИВ', tabDump: 'УДАЛИТЬ', tabExplore: 'ИССЛЕДОВАТЬ',
    photoArchive: 'АРХИВ ФОТО', timeCapsule: 'КАПСУЛА ВРЕМЕНИ', timeCapsuleLine: 'В каждом месяце — история. Освободите её свайпом.',
    photos: 'ФОТО', year: 'ГОД', months: 'МЕС',
    deepCleanMode: 'ГЛУБОКАЯ ОЧИСТКА',
    deepCleanSub: 'ИИ сканирует всю библиотеку и показывает самые тяжёлые файлы — освобождайте место там, где это важно.',
    allMonths: 'ВСЕ 12 МЕСЯЦЕВ', monthsSelected: 'МЕСЯЦЕВ ВЫБРАНО', monthlyArchive: 'АРХИВ ПО МЕСЯЦАМ',
    selectYear: 'ВЫБРАТЬ ГОД', current: 'ТЕКУЩИЙ',
    scanning: 'СКАНИРОВАНИЕ ГАЛЕРЕИ...', allPhotos: 'ВСЕ ФОТО',
    trash: 'КОРЗИНА', keep: 'ОСТАВИТЬ', dump: 'УДАЛИТЬ',
    photoDetails: 'ДЕТАЛИ ФОТО', size: 'РАЗМЕР', date: 'ДАТА', device: 'УСТРОЙСТВО', dimensions: 'РАЗМЕРЫ',
    deleteQueue: 'ОЧЕРЕДЬ УДАЛЕНИЯ', deleteAll: 'УДАЛИТЬ ВСЕ', allDone: 'ВСЁ ГОТОВО!',
    photosQueued: 'фото в очереди', reviewDelete: 'ПРОСМОТР И УДАЛЕНИЕ',
    rescueHint: 'Нажмите на фото, чтобы отменить удаление',
    swipesLeft: 'бесплатных свайпов осталось', freeSwipesLeft: 'бесплатных свайпов',
    subscribe: 'подписаться', supercut: 'суперрезка', bookmarks: 'закладки',
    myStats: 'моя статистика', appTheme: 'тема приложения', appIcon: 'иконка приложения',
    languages: 'языки', notifications: 'уведомления',
    premium: 'ПРЕМИУМ', personalise: 'ПЕРСОНАЛИЗАЦИЯ', upgradeBtn: 'ОБНОВИТЬ ›',
    signIn: 'ВОЙТИ', createAccount: 'СОЗДАТЬ АККАУНТ', emailAddress: 'АДРЕС ЭЛЕКТРОННОЙ ПОЧТЫ',
    password: 'ПАРОЛЬ', fullName: 'ПОЛНОЕ ИМЯ', username: 'ИМЯ ПОЛЬЗОВАТЕЛЯ',
    phone: 'ТЕЛЕФОН (НЕОБЯЗАТЕЛЬНО)', confirmPassword: 'ПОДТВЕРДИТЬ ПАРОЛЬ',
    forgotPassword: 'Забыли пароль?', sendResetLink: 'ОТПРАВИТЬ ССЫЛКУ ДЛЯ СБРОСА',
    termsAndPrivacy: 'Условия и конфиденциальность', iAgree: 'Я согласен с',
    continueApple: 'Продолжить с Apple', continueGoogle: 'Продолжить с Google',
    back: 'НАЗАД', done: 'ГОТОВО', clear: 'ОЧИСТИТЬ ×', cancel: 'ОТМЕНА',
    suggested: 'ПРЕДЛОЖЕНО', otherLanguages: 'ДРУГИЕ ЯЗЫКИ',
    premiumTheme: 'Премиум Тема', proUnlockAll: 'Нажмите лого 3× для режима администратора',
  },
};

export const getTranslations = (lang: LanguageId): Translations => ({
  ...T.en,
  ...(T[lang] ?? {}),
});

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  isLoggedIn: boolean;
}

export type PlanId = 'hobby' | 'pro' | 'admin';
export type PlanType = 'free' | 'hobby' | 'pro' | 'admin';

interface ThemeContextType {
  theme: ThemeColors;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  language: LanguageId;
  setLanguage: (id: LanguageId) => void;
  t: Translations;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  swipesLeft: number;
  useSwipe: () => boolean;
  openSubscription: () => void;
  onSubscriptionOpen: (() => void) | null;
  setOnSubscriptionOpen: (fn: () => void) => void;
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  recentDumps: any[];
  addRecentDump: (dump: any) => void;
  plan: PlanType;
  setPlan: (p: PlanType, opts?: { skipRemote?: boolean }) => Promise<void>;
  /** Re-fetch profiles.plan_type from Supabase (source of truth). */
  refreshPlanFromSupabase: () => Promise<void>;
  bonusSwipes: number;
  addBonusSwipes: (n: number) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>('dark');
  const [language, setLanguageState] = useState<LanguageId>('en');
  const [isPro, setIsProState] = useState(false);
  const [isAdmin, setIsAdminState] = useState(false);
  const [swipesLeft, setSwipesLeft] = useState(HOBBY_WEEKLY_SWIPES);
  const [plan, setPlanState] = useState<PlanType>('free');
  const [bonusSwipes, setBonusSwipes] = useState(0);
  const [subOpenFn, setSubOpenFn] = useState<(() => void) | null>(null);
  const subOpenFnRef = useRef<(() => void) | null>(null);
  const isProRef = useRef(false);
  const isAdminRef = useRef(false);
  useEffect(() => { subOpenFnRef.current = subOpenFn; }, [subOpenFn]);
  useEffect(() => { isProRef.current = isPro; }, [isPro]);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [recentDumps, setRecentDumps] = useState<any[]>([]);
  const userRef = useRef<UserProfile | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  const applyPlanState = async (normalized: PlanType, uid: string | null) => {
    const adminPlan = normalized === 'admin';
    const proPlan = normalized === 'pro' || adminPlan;
    setPlanState(normalized);
    setIsAdminState(adminPlan);
    setIsProState(proPlan);
    const swipes = proPlan ? 999999 : HOBBY_WEEKLY_SWIPES;
    setSwipesLeft(swipes);
    await AsyncStorage.setItem('@dumpit_swipes', String(swipes));
    if (uid) {
      await AsyncStorage.multiSet([
        [planStorageKey(uid, 'plan'), normalized],
        [planStorageKey(uid, 'pro'), String(proPlan)],
        [planStorageKey(uid, 'admin'), String(adminPlan)],
      ]);
    }
  };

  /** Supabase profiles.plan_type is authoritative — never trust device-wide cache. */
  const syncPlanFromSupabase = async (u: UserProfile) => {
    await Promise.all(LEGACY_PLAN_KEYS.map((k) => AsyncStorage.removeItem(k)));
    if (!isSupabaseConfigured()) {
      await applyPlanState('hobby', u.uid);
      return;
    }
    let row = await fetchProfileByUserId(u.uid);
    if (!row) {
      row = await ensureProfileRow({
        userId: u.uid,
        email: u.email,
        username: u.username,
        planType: 'hobby',
      });
    }
    const normalized = appPlanFromProfile(row?.plan_type ?? 'hobby');
    await applyPlanState(normalized, u.uid);
  };

  useEffect(() => {
    (async () => {
      try {
        const [th, l, s, u, dumps, swipeWeek, bonusVal] = await Promise.all([
          AsyncStorage.getItem('@dumpit_theme'),
          AsyncStorage.getItem('@dumpit_lang'),
          AsyncStorage.getItem('@dumpit_swipes'),
          AsyncStorage.getItem('@dumpit_user'),
          AsyncStorage.getItem('@dumpit_recent_dumps'),
          AsyncStorage.getItem('@dumpit_swipes_week'),
          AsyncStorage.getItem('@dumpit_bonus_swipes'),
          ...LEGACY_PLAN_KEYS.map((k) => AsyncStorage.removeItem(k)),
        ]);
        if (th) {
          const raw = th as string;
          const mapped = (LEGACY_THEME_STORAGE[raw] ?? raw) as ThemeId;
          const next: ThemeId = (mapped in THEMES) ? mapped : 'dark';
          setThemeIdState(next);
          if (next !== raw) void AsyncStorage.setItem('@dumpit_theme', next);
        }
        if (l) setLanguageState(l as LanguageId);
        if (dumps) setRecentDumps(JSON.parse(dumps));
        if (bonusVal != null && bonusVal !== '') {
          const b = parseInt(bonusVal, 10);
          if (!Number.isNaN(b)) setBonusSwipes(b);
        }

        let parsedUser: UserProfile | null = null;
        if (u) {
          parsedUser = JSON.parse(u) as UserProfile;
          setUserState(parsedUser);
          userRef.current = parsedUser;
        }

        const now = new Date();
        const day = now.getDay();
        const diffToMonday = (day + 6) % 7;
        const monday = new Date(now);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(now.getDate() - diffToMonday);
        const weekKey = monday.toISOString().slice(0, 10);

        if (parsedUser) {
          await syncPlanFromSupabase(parsedUser);
        } else {
          if (s) setSwipesLeft(parseInt(s, 10));
          await applyPlanState('hobby', null);
        }

        if (swipeWeek !== weekKey) {
          const current = parsedUser ? (await fetchProfileByUserId(parsedUser.uid))?.plan_type : 'hobby';
          const isPaid = current === 'pro' || current === 'admin';
          if (!isPaid) {
            setSwipesLeft(HOBBY_WEEKLY_SWIPES);
            await AsyncStorage.setItem('@dumpit_swipes', String(HOBBY_WEEKLY_SWIPES));
          }
          await AsyncStorage.setItem('@dumpit_swipes_week', weekKey);
        }
      } catch (e) {
        console.warn('[plan] bootstrap failed', e);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userRef.current) {
        void syncPlanFromSupabase(userRef.current);
      }
    });
    return () => sub.remove();
  }, []);

  const setThemeId = async (id: ThemeId) => {
    setThemeIdState(id);
    await AsyncStorage.setItem('@dumpit_theme', id);
  };
  const setLanguage = async (id: LanguageId) => {
    setLanguageState(id);
    await AsyncStorage.setItem('@dumpit_lang', id);
  };
  const setIsPro = async (v: boolean) => {
    const uid = userRef.current?.uid;
    if (uid) {
      await setPlan(v ? 'pro' : 'hobby', { skipRemote: true });
      return;
    }
    setIsProState(v);
  };
  const setIsAdmin = async (v: boolean) => {
    setIsAdminState(v);
    if (v) await setIsPro(true);
    await AsyncStorage.setItem('@dumpit_admin', String(v));
  };
  const setUser = async (u: UserProfile | null) => {
    setUserState(u);
    userRef.current = u;
    if (u) {
      await AsyncStorage.setItem('@dumpit_user', JSON.stringify(u));
      await syncPlanFromSupabase(u);
    } else {
      await AsyncStorage.removeItem('@dumpit_user');
      await Promise.all(LEGACY_PLAN_KEYS.map((k) => AsyncStorage.removeItem(k)));
      await applyPlanState('hobby', null);
    }
  };

  const refreshPlanFromSupabase = async () => {
    const u = userRef.current;
    if (u) await syncPlanFromSupabase(u);
  };
  const addRecentDump = async (dump: any) => {
    const next = [dump, ...recentDumps].slice(0, 10);
    setRecentDumps(next);
    await AsyncStorage.setItem('@dumpit_recent_dumps', JSON.stringify(next));
  };
  const setPlan = async (p: PlanType, opts?: { skipRemote?: boolean }) => {
    const normalized: PlanType = p === 'free' ? 'hobby' : p;
    const uid = userRef.current?.uid ?? null;
    await applyPlanState(normalized, uid);
    if (!opts?.skipRemote && uid && isSupabaseConfigured()) {
      const res = await updateProfilePlanType(uid, appPlanToProfilePlan(normalized));
      if (!res.ok) console.warn('[plan] Supabase update failed', res.error);
    }
  };
  const addBonusSwipes = async (n: number) => {
    setBonusSwipes((prev) => {
      const nextBonus = prev + n;
      void AsyncStorage.setItem('@dumpit_bonus_swipes', String(nextBonus));
      const uid = userRef.current?.uid;
      if (uid && isSupabaseConfigured()) {
        void supabase
          .from('subscriptions')
          .update({ bonus_swipes: nextBonus })
          .eq('user_id', uid)
          .then(() => {}, () => {});
      }
      return nextBonus;
    });
    setSwipesLeft((prev) => {
      const nextSwipes = prev + n;
      void AsyncStorage.setItem('@dumpit_swipes', String(nextSwipes));
      return nextSwipes;
    });
  };
  const useSwipe = (): boolean => {
    if (isPro || isAdmin) return true;
    if (swipesLeft <= 0) return false;
    const next = swipesLeft - 1;
    setSwipesLeft(next);
    AsyncStorage.setItem('@dumpit_swipes', String(next));
    return true;
  };
  const openSubscription = () => {
    if (isProRef.current || isAdminRef.current) return;
    subOpenFnRef.current?.();
  };

  const activeTheme = THEMES[themeId] ?? THEMES.dark;

  return (
    <ThemeContext.Provider value={{
      theme: activeTheme, themeId, setThemeId,
      language, setLanguage,
      t: getTranslations(language),
      isPro, setIsPro,
      plan, setPlan, refreshPlanFromSupabase,
      bonusSwipes, addBonusSwipes,
      isAdmin, setIsAdmin,
      swipesLeft, useSwipe,
      openSubscription,
      onSubscriptionOpen: subOpenFn,
      setOnSubscriptionOpen: setSubOpenFn,
      user, setUser,
      recentDumps, addRecentDump,
    }}>
      <View style={{ flex: 1 }}>
        {children}
        <ScanlineOverlay opacity={activeTheme.scanlineOpacity} />
      </View>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);