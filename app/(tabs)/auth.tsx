import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import {
    AlertCircle, Check, ChevronLeft, ChevronRight, Eye, EyeOff,
    Lock, Mail, Phone, User, X,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuthRedirectUri, getResetPasswordRedirectUri, signInWithApple, signInWithGoogle } from './authOAuth';
import { ensureProfileRow } from '../_lib/profilePlanSupabase';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BRAND_LOGO = require('../assets/brand-icon.png');

const INK = '#12141A';
const MUTED = 'rgba(18,20,26,0.52)';
const LINE = 'rgba(18,20,26,0.12)';
const SURFACE = '#FFFFFF';
const ACCENT = '#3B5BFC';
import { isSupabaseConfigured, supabase } from './supabase';
import type { UserProfile } from './ThemeContext';
import { useTheme } from './ThemeContext';

async function persistSessionUser(
  session: Session,
  setUser: (u: UserProfile | null) => void | Promise<void>,
) {
  const u = session.user;
  const meta = u.user_metadata as { username?: string } | undefined;
  const uname =
    (typeof meta?.username === 'string' && meta.username) ||
    u.email?.split('@')[0] ||
    'user';
  await ensureProfileRow({
    userId: u.id,
    email: u.email ?? '',
    username: uname,
    planType: 'hobby',
  });
  await setUser({
    uid: u.id,
    email: u.email ?? '',
    username: uname,
    isLoggedIn: true,
  });
}

function formatAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/unsupported provider|provider is not enabled|validation_failed/i.test(msg)) {
    return 'Google/Apple sign-in is not enabled in Supabase. Go to Supabase Dashboard -> Authentication -> Providers, enable Google and/or Apple, add client IDs/secrets, then save. Also add your redirect URL in Authentication -> URL Configuration (dumpit://auth-callback).';
  }
  if (/Network request failed|Failed to fetch|invalid\.supabase\.co/i.test(msg)) {
    return 'Cannot reach Supabase. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to your project URL and anon key (Dashboard → Settings → API), then restart Expo. On Android, cleartext is not used for https—verify the URL is https://xxxx.supabase.co with no typos.';
  }
  return msg;
}

const { width, height } = Dimensions.get('window');

// ─── PASSWORD STRENGTH ───────────────────────────────────────────────
function passwordStrength(pw: string) {
  const checks = {
    length:    pw.length >= 8,
    upper:     /[A-Z]/.test(pw),
    lower:     /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#FF3B30', '#FF8A00', '#FFD600', '#00C853', '#00FFA3'];

function PwCriteriaRow({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <View style={{
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: met ? '#00C853' : 'rgba(18,20,26,0.15)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        {met && <Check size={10} color="#FFF" />}
      </View>
      <Text style={{ color: met ? '#1E293B' : 'rgba(18,20,26,0.52)', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ─── INPUT FIELD ─────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, icon, secureToggle, secure,
  onToggleSecure, keyboardType, autoCapitalize, error, maxLength,
}: any) {
  const borderAnim = useRef(new Animated.Value(0)).current;
  const onFocus = () => Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  const onBlur  = () => Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [LINE, ACCENT] });

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={fs.label}>{label}</Text>
      <Animated.View style={[fs.fieldWrap, { borderColor }]}>
        <View style={fs.fieldIcon}>{icon}</View>
        <TextInput
          style={fs.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(18,20,26,0.28)"
          secureTextEntry={secure}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          maxLength={maxLength}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {secureToggle && (
          <TouchableOpacity onPress={onToggleSecure} style={fs.eyeBtn}>
            {secure ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={INK} />}
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <AlertCircle size={11} color="#FF3B30" />
          <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '600' }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const fs = StyleSheet.create({
  label:     { color: MUTED, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  fieldIcon: { paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  input:     { flex: 1, color: INK, fontSize: 16, fontWeight: '500', paddingVertical: 15, paddingRight: 14 },
  eyeBtn:    { paddingHorizontal: 14, paddingVertical: 15 },
});

// ─── FORGOT PASSWORD MODAL ────────────────────────────────────────────
function ForgotModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const slideAnim = useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : height, friction: 14, tension: 80, useNativeDriver: true }).start();
    if (!visible) { setSent(false); setEmail(''); setCooldownSec(0); }
  }, [visible]);

  React.useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const handleSend = async () => {
    if (cooldownSec > 0) return;
    if (!email.includes('@')) { Alert.alert('Invalid email', 'Please enter a valid email address.'); return; }
    if (!isSupabaseConfigured()) {
      Alert.alert('Not configured', 'Add Supabase environment variables before using password reset.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getResetPasswordRedirectUri(),
      });
      if (error) throw error;
      setSent(true);
      setCooldownSec(10);
    } catch (e) {
      Alert.alert('Reset failed', formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={{ width: '100%' }}
        >
        <Animated.View style={{
          backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32,
          padding: 24, paddingBottom: 26, borderTopWidth: 1, borderTopColor: LINE,
          transform: [{ translateY: slideAnim }],
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(18,20,26,0.16)', alignSelf: 'center', marginBottom: 18 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: INK, fontSize: 22, fontWeight: '900' }}>Reset Password</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
              <X size={16} color={MUTED} />
            </TouchableOpacity>
          </View>

          {sent ? (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 12 }}>
              <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,200,83,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <Check size={32} color="#00C853" />
              </View>
              <Text style={{ color: INK, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>Check your inbox!</Text>
              <Text style={{ color: MUTED, fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22 }}>
                We've sent a password reset link to{'\n'}<Text style={{ color: INK, fontWeight: '700' }}>{email}</Text>
              </Text>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 10, borderRadius: 20, backgroundColor: INK, paddingHorizontal: 32, paddingVertical: 14 }}>
                <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>DONE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={{ color: MUTED, fontSize: 14, marginBottom: 14, lineHeight: 22 }}>
                Enter the email address linked to your account. We'll send you a secure reset link.
              </Text>
              <Field
                label="EMAIL ADDRESS"
                value={email}
                onChange={setEmail}
                placeholder="your@email.com"
                icon={<Mail size={18} color={MUTED} />}
                keyboardType="email-address"
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={loading || cooldownSec > 0}
                style={{ borderRadius: 20, overflow: 'hidden', marginTop: 8, marginBottom: 6 }}
              >
                <LinearGradient colors={['#12141A', '#1F2937']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: cooldownSec > 0 ? 0.75 : 1 }}>
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 1 }}>
                      {cooldownSec > 0 ? `TRY AGAIN IN ${cooldownSec}s` : 'SEND RESET LINK'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── TERMS MODAL ─────────────────────────────────────────────────────
function TermsModal({ visible, onClose, onAccept }: { visible: boolean; onClose: () => void; onAccept: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: '#0D0D0D', borderRadius: 24, margin: 16, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' }}>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>Terms & Privacy</Text>
              <TouchableOpacity onPress={onClose}><X size={20} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={{ color: '#FF0055', fontWeight: '900', fontSize: 13, marginBottom: 10 }}>TERMS OF SERVICE</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 22, fontSize: 13 }}>
                By using photodumps, you agree to our terms of service. This app accesses your photo library solely for the purpose of cleaning and organizing photos as directed by you. We do not upload, store or share your photos on any server.{'\n\n'}
                Subscription billing is processed through the App Store / Google Play. You may cancel at any time. Refunds are subject to platform policies.{'\n\n'}
                You are responsible for all deletion actions. Deleted photos may be recoverable from your device's Recently Deleted folder for 30 days.
              </Text>
              <Text style={{ color: '#FF0055', fontWeight: '900', fontSize: 13, marginTop: 20, marginBottom: 10 }}>PRIVACY POLICY</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 22, fontSize: 13 }}>
                We collect minimal personal information required to operate the service:{'\n\n'}
                • Email address (for account & subscription){'\n'}
                • Usage statistics (anonymous, for product improvement){'\n'}
                • Subscription status (processed by App Store / Google Play){'\n\n'}
                We do NOT sell your data to third parties. Your photo library is never uploaded to our servers. All photo processing happens locally on your device.{'\n\n'}
                For PDPA (Malaysia) compliance, you may request deletion of your account and associated data by contacting us at privacy@photodumps.app
              </Text>
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#1A1A1A' }}>
              <TouchableOpacity onPress={onAccept} style={{ borderRadius: 20, overflow: 'hidden' }}>
                <LinearGradient colors={['#FF0055', '#FF3300']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 1 }}>I AGREE & ACCEPT</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── MAIN AUTH SCREEN ────────────────────────────────────────────────
export default function AuthScreen() {
  const { setUser } = useTheme();
  const params = useLocalSearchParams<{ verified?: string; error?: string; recovery?: string }>();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupSent, setSignupSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<null | 'google' | 'apple'>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  // Form fields
  const [fullName, setFullName]   = useState('');
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const modeAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (m: 'login' | 'signup') => {
    Animated.timing(modeAnim, { toValue: m === 'login' ? 0 : 1, duration: 250, useNativeDriver: false }).start();
    setMode(m);
    setErrors({});
    setSignupSent(false);
  };

  const { checks, score } = passwordStrength(password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'signup') {
      if (!fullName.trim()) e.fullName = 'Full name is required';
      if (username.length < 3) e.username = 'Username must be at least 3 characters';
      if (!/^[A-Za-z0-9_]+$/.test(username)) e.username = 'Letters, numbers and underscores only';
      if (phone && !/^\+?[0-9]{8,15}$/.test(phone.replace(/\s/g, ''))) e.phone = 'Enter a valid phone number';
      if (score < 3) e.password = 'Password is too weak';
      if (password !== confirm) e.confirm = 'Passwords do not match';
      if (!termsAccepted) e.terms = 'You must accept the Terms & Privacy Policy';
    }
    if (!email.includes('@') || !email.includes('.')) e.email = 'Enter a valid email address';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const navigateAfterAuth = async () => {
    const onboard = await AsyncStorage.getItem('@dumpit_onboard');
    router.replace(onboard ? '/hub' : '/onboarding');
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Configuration needed',
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (Supabase → Settings → API), then restart Expo.',
      );
      return;
    }
    setOauthProvider(provider);
    try {
      const session =
        provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      if (!session) return;
      await persistSessionUser(session, setUser);
      await navigateAfterAuth();
    } catch (e) {
      Alert.alert('Sign-in failed', formatAuthError(e));
    } finally {
      setOauthProvider(null);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Configuration needed',
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file using values from Supabase (Dashboard → Settings → API). Restart the dev server after saving.',
      );
      return;
    }
    setLoading(true);

    try {
      const emailTrimmed = email.trim();

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: emailTrimmed,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUri(),
            data: {
              full_name: fullName.trim(),
              username: username.trim(),
            },
          },
        });
        if (error) throw error;

        const u = data.user ?? data.session?.user;
        if (!u) throw new Error('Unable to create account at the moment. Please try again.');
        await ensureProfileRow({
          userId: u.id,
          email: u.email ?? emailTrimmed,
          username: username.trim() || (u.email?.split('@')[0] ?? 'user'),
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          planType: 'hobby',
        });
        await supabase.auth.resend({
          type: 'signup',
          email: emailTrimmed,
          options: { emailRedirectTo: getAuthRedirectUri() },
        });
        await supabase.auth.signOut();
        setSignupSent(true);
        setMode('login');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });
      if (error) throw error;

      const u = data.session.user;
      const meta = u.user_metadata as { username?: string } | undefined;
      const uname =
        (typeof meta?.username === 'string' && meta.username) ||
        u.email?.split('@')[0] ||
        'user';
      await ensureProfileRow({
        userId: u.id,
        email: u.email ?? emailTrimmed,
        username: uname,
        planType: 'hobby',
      });

      await setUser({
        uid: u.id,
        email: u.email ?? emailTrimmed,
        username: uname,
        isLoggedIn: true,
      });
      router.replace('/hub');
    } catch (err: unknown) {
      Alert.alert('Error', formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const tabIndicatorLeft = modeAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '51%'] });

  const emailVerified = params.verified === '1';
  const authError = params.error === '1';

  return (
    <View style={as.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity style={as.backBtn} onPress={() => router.replace('/onboarding')}>
              <ChevronLeft size={22} color={MUTED} />
            </TouchableOpacity>

            <View style={as.logoRow}>
              <Image source={BRAND_LOGO} style={as.logoImg} contentFit="cover" />
              <Text style={as.brandMark}>photodumps</Text>
              <Text style={as.appTagline}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </Text>
            </View>

            {emailVerified && (
              <View style={as.bannerOk}>
                <Check size={18} color="#059669" />
                <Text style={as.bannerOkText}>
                  Email verified. Sign in with your password to continue.
                </Text>
              </View>
            )}
            {signupSent && (
              <View style={as.bannerOk}>
                <Mail size={18} color={ACCENT} />
                <View style={{ flex: 1 }}>
                  <Text style={as.bannerOkText}>
                    Check your inbox — we sent a link to verify {email}. Open it, then sign in here.
                  </Text>
                  <TouchableOpacity
                    disabled={resendBusy}
                    onPress={async () => {
                      if (!email?.trim()) return;
                      setResendBusy(true);
                      try {
                        const { error } = await supabase.auth.resend({
                          type: 'signup',
                          email: email.trim(),
                          options: { emailRedirectTo: getAuthRedirectUri() },
                        });
                        if (error) throw error;
                        Alert.alert('Verification sent', 'Please check your inbox (and spam folder).');
                      } catch (e) {
                        Alert.alert('Resend failed', formatAuthError(e));
                      } finally {
                        setResendBusy(false);
                      }
                    }}
                  >
                    <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700', marginTop: 8 }}>
                      {resendBusy ? 'Resending…' : 'Resend verification email'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {authError && (
              <View style={as.bannerErr}>
                <AlertCircle size={18} color="#DC2626" />
                <Text style={as.bannerErrText}>That link expired or failed. Try again or request a new one.</Text>
              </View>
            )}

            <View style={as.card}>
              <View style={as.tabRow}>
                <Animated.View style={[as.tabIndicator, { left: tabIndicatorLeft }]} />
                <TouchableOpacity style={as.tab} onPress={() => switchMode('login')}>
                  <Text style={[as.tabText, mode === 'login' && as.tabTextActive]}>Sign in</Text>
                </TouchableOpacity>
                <TouchableOpacity style={as.tab} onPress={() => switchMode('signup')}>
                  <Text style={[as.tabText, mode === 'signup' && as.tabTextActive]}>Sign up</Text>
                </TouchableOpacity>
              </View>

              <View style={{ padding: 24, gap: 0 }}>
                {/* SIGN UP extra fields */}
                {mode === 'signup' && (
                  <>
                    <Field label="FULL NAME" value={fullName} onChange={setFullName}
                      placeholder="Your full name" autoCapitalize="words"
                      icon={<User size={18} color={MUTED} />}
                      error={errors.fullName}
                    />
                    <Field label="USERNAME" value={username} onChange={(t: string) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
                      placeholder="@yourhandle"
                      icon={<Text style={{ color: MUTED, fontSize: 15, fontWeight: '700' }}>@</Text>}
                      error={errors.username} maxLength={20}
                    />
                    <Field label="PHONE (OPTIONAL)" value={phone} onChange={setPhone}
                      placeholder="+60 12 345 6789" keyboardType="phone-pad"
                      icon={<Phone size={18} color={MUTED} />}
                      error={errors.phone}
                    />
                  </>
                )}

                <Field label="EMAIL ADDRESS" value={email} onChange={setEmail}
                  placeholder="your@email.com" keyboardType="email-address"
                  icon={<Mail size={18} color={MUTED} />}
                  error={errors.email}
                />

                <Field label="PASSWORD" value={password} onChange={setPassword}
                  placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                  icon={<Lock size={18} color={MUTED} />}
                  secureToggle secure={!showPw} onToggleSecure={() => setShowPw(p => !p)}
                  error={errors.password}
                />

                {mode === 'signup' && password.length > 0 && (
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= score ? STRENGTH_COLORS[score] : LINE }} />
                      ))}
                    </View>
                    {score > 0 && (
                      <Text style={{ color: STRENGTH_COLORS[score], fontSize: 11, fontWeight: '800', marginBottom: 10 }}>
                        {STRENGTH_LABELS[score]}
                      </Text>
                    )}
                    <View style={{ backgroundColor: '#E2E8F0', borderRadius: 14, padding: 14 }}>
                      <PwCriteriaRow met={checks.length}  label="At least 8 characters" />
                      <PwCriteriaRow met={checks.upper}   label="One uppercase letter (A–Z)" />
                      <PwCriteriaRow met={checks.lower}   label="One lowercase letter (a–z)" />
                      <PwCriteriaRow met={checks.number}  label="One number (0–9)" />
                      <PwCriteriaRow met={checks.special} label="One special character (!@#...)" />
                    </View>
                  </View>
                )}

                {/* Confirm password — signup only */}
                {mode === 'signup' && (
                  <Field label="CONFIRM PASSWORD" value={confirm} onChange={setConfirm}
                    placeholder="Re-enter your password"
                    icon={<Lock size={18} color={MUTED} />}
                    secureToggle secure={!showConfirm} onToggleSecure={() => setShowConfirm(p => !p)}
                    error={errors.confirm}
                  />
                )}

                {/* Forgot password — login only */}
                {mode === 'login' && (
                  <TouchableOpacity onPress={() => setShowForgot(true)} style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 }}>
                    <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                {/* Terms checkbox — signup only */}
                {mode === 'signup' && (
                  <View style={{ marginBottom: 20 }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
                      onPress={() => setTermsAccepted(p => !p)}
                      activeOpacity={0.8}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 6, marginTop: 1,
                        backgroundColor: termsAccepted ? ACCENT : '#F4F6FA',
                        borderWidth: 1, borderColor: termsAccepted ? ACCENT : LINE,
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        {termsAccepted && <Check size={13} color="#FFF" />}
                      </View>
                      <Text style={{ color: MUTED, fontSize: 13, flex: 1, lineHeight: 20 }}>
                        I agree to the{' '}
                        <Text style={{ color: ACCENT, fontWeight: '700' }} onPress={() => setShowTerms(true)}>
                          Terms of Service
                        </Text>
                        {' '}and{' '}
                        <Text style={{ color: ACCENT, fontWeight: '700' }} onPress={() => setShowTerms(true)}>
                          Privacy Policy
                        </Text>
                      </Text>
                    </TouchableOpacity>
                    {errors.terms && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                        <AlertCircle size={11} color="#FF3B30" />
                        <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '600' }}>{errors.terms}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.86}
                  style={[as.submitBtn, loading && { opacity: 0.65 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={as.submitText}>
                        {mode === 'login' ? 'Sign in' : 'Create account'}
                      </Text>
                      <ChevronRight size={18} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={as.divider}>
                  <View style={as.dividerLine} />
                  <Text style={as.dividerText}>or continue with</Text>
                  <View style={as.dividerLine} />
                </View>

                <View style={{ gap: 10 }}>
                  <TouchableOpacity
                    style={as.socialBtn}
                    onPress={() => handleOAuth('apple')}
                    disabled={!!oauthProvider || loading}
                    activeOpacity={0.85}
                  >
                    {oauthProvider === 'apple' ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="logo-apple" size={22} color={INK} style={as.socialIcon} />
                        <Text style={as.socialLabel}>Continue with Apple</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={as.socialBtn}
                    onPress={() => handleOAuth('google')}
                    disabled={!!oauthProvider || loading}
                    activeOpacity={0.85}
                  >
                    {oauthProvider === 'google' ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="logo-google" size={22} color={INK} style={as.socialIcon} />
                        <Text style={as.socialLabel}>Continue with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={as.footerNote}>
              By continuing you confirm you are 13+ and agree to our{' '}
              <Text style={{ color: ACCENT }} onPress={() => setShowTerms(true)}>Terms</Text>
              {' & '}
              <Text style={{ color: ACCENT }} onPress={() => setShowTerms(true)}>Privacy Policy</Text>
            </Text>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <ForgotModal visible={showForgot} onClose={() => setShowForgot(false)} />
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} onAccept={() => { setTermsAccepted(true); setShowTerms(false); }} />
    </View>
  );
}

const as = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#FAFBFC' },
  backBtn: { padding: 16, alignSelf: 'flex-start' },
  logoRow: { alignItems: 'center', gap: 8, paddingVertical: 8, paddingBottom: 20 },
  logoImg: { width: 64, height: 64, borderRadius: 16 },
  brandMark: {
    color: INK,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  appTagline: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '500',
  },
  bannerOk: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(5,150,105,0.2)',
  },
  bannerOkText: { flex: 1, color: INK, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  bannerErr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.18)',
  },
  bannerErrText: { flex: 1, color: INK, fontSize: 14, lineHeight: 20 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: LINE,
    minHeight: 52,
  },
  socialIcon: { marginRight: 2 },
  socialLabel: { color: INK, fontSize: 15, fontWeight: '600' },
  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: LINE,
    overflow: 'hidden',
    shadowColor: '#12141A',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  tabRow:  { flexDirection: 'row', margin: 10, borderRadius: 14, padding: 4, position: 'relative', backgroundColor: '#F0F2F8' },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48%',
    backgroundColor: SURFACE,
    borderRadius: 11,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tab:     { flex: 1, paddingVertical: 11, alignItems: 'center', zIndex: 1 },
  tabText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: INK, fontWeight: '700' },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INK,
    marginBottom: 18,
  },
  submitText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: LINE },
  dividerText: { color: MUTED, fontSize: 12, fontWeight: '500' },
  footerNote: { textAlign: 'center', color: MUTED, fontSize: 12, marginTop: 16, paddingHorizontal: 32, lineHeight: 18 },
});

