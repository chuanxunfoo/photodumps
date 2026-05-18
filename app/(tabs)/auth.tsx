import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
import { getAuthRedirectUri, signInWithApple, signInWithGoogle } from './authOAuth';
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
  await setUser({
    uid: u.id,
    email: u.email ?? '',
    username: uname,
    isLoggedIn: true,
  });
}

function formatAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
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
        backgroundColor: met ? '#00C853' : 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        {met && <Check size={10} color="#FFF" />}
      </View>
      <Text style={{ color: met ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600' }}>{label}</Text>
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
  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.1)', '#FF0055'] });

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
          placeholderTextColor="rgba(255,255,255,0.2)"
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
            {secure ? <EyeOff size={18} color="rgba(255,255,255,0.4)" /> : <Eye size={18} color="rgba(255,255,255,0.6)" />}
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
  label:     { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 7 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  fieldIcon: { paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  input:     { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600', paddingVertical: 16, paddingRight: 14 },
  eyeBtn:    { paddingHorizontal: 14, paddingVertical: 16 },
});

// ─── FORGOT PASSWORD MODAL ────────────────────────────────────────────
function ForgotModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : height, friction: 14, tension: 80, useNativeDriver: true }).start();
    if (!visible) { setSent(false); setEmail(''); }
  }, [visible]);

  const handleSend = async () => {
    if (!email.includes('@')) { Alert.alert('Invalid email', 'Please enter a valid email address.'); return; }
    if (!isSupabaseConfigured()) {
      Alert.alert('Not configured', 'Add Supabase environment variables before using password reset.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthRedirectUri(),
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      Alert.alert('Reset failed', formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <Animated.View style={{
          backgroundColor: '#0D0D0D', borderTopLeftRadius: 32, borderTopRightRadius: 32,
          padding: 28, paddingBottom: 50, borderTopWidth: 1, borderTopColor: '#1A1A1A',
          transform: [{ translateY: slideAnim }],
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#1A1A1A', alignSelf: 'center', marginBottom: 24 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>Reset Password</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }}>
              <X size={16} color="#888" />
            </TouchableOpacity>
          </View>

          {sent ? (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 12 }}>
              <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,200,83,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <Check size={32} color="#00C853" />
              </View>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>Check your inbox!</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22 }}>
                We've sent a password reset link to{'\n'}<Text style={{ color: '#FFF', fontWeight: '700' }}>{email}</Text>
              </Text>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 10, borderRadius: 20, backgroundColor: '#FF0055', paddingHorizontal: 32, paddingVertical: 14 }}>
                <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>DONE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24, lineHeight: 22 }}>
                Enter the email address linked to your account. We'll send you a secure reset link.
              </Text>
              <Field
                label="EMAIL ADDRESS"
                value={email}
                onChange={setEmail}
                placeholder="your@email.com"
                icon={<Mail size={18} color="rgba(255,255,255,0.4)" />}
                keyboardType="email-address"
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={loading}
                style={{ borderRadius: 20, overflow: 'hidden', marginTop: 8 }}
              >
                <LinearGradient colors={['#FF0055', '#FF3300']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 1 }}>SEND RESET LINK</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
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
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<null | 'google' | 'apple'>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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
    router.replace(onboard ? '/calendar' : '/onboarding');
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
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;

        if (!data.session) {
          Alert.alert(
            'Confirm your email',
            'We sent you a link. Open it to activate your account, then sign in.',
          );
          return;
        }

        const u = data.session.user;
        await setUser({
          uid: u.id,
          email: u.email ?? emailTrimmed,
          username,
          isLoggedIn: true,
        });
        router.replace('/onboarding');
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

      await setUser({
        uid: u.id,
        email: u.email ?? emailTrimmed,
        username: uname,
        isLoggedIn: true,
      });
      router.replace('/calendar');
    } catch (err: unknown) {
      Alert.alert('Error', formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const tabIndicatorLeft = modeAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '51%'] });

  return (
    <View style={as.root}>
      <LinearGradient colors={['#030303', '#0D0003', '#030303']} style={StyleSheet.absoluteFill} />

      {/* BG orbs */}
      <View style={[as.orb, { left: -80, top: 100, width: 240, height: 240, backgroundColor: 'rgba(255,0,85,0.08)' }]} />
      <View style={[as.orb, { right: -60, top: 300, width: 200, height: 200, backgroundColor: 'rgba(191,90,242,0.06)' }]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back arrow — only show if already onboarded */}
            <TouchableOpacity style={as.backBtn} onPress={() => router.replace('/landing')}>
              <ChevronLeft size={22} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={as.logoRow}>
              <Text style={as.brandMark}>PHOTODUMPS</Text>
              <Text style={as.appTagline}>Sign in to continue</Text>
            </View>

            <View style={as.card}>
              {/* Tab switcher */}
              <View style={[as.tabRow, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                <Animated.View style={[as.tabIndicator, { left: tabIndicatorLeft }]} />
                <TouchableOpacity style={as.tab} onPress={() => switchMode('login')}>
                  <Text style={[as.tabText, mode === 'login' && as.tabTextActive]}>SIGN IN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={as.tab} onPress={() => switchMode('signup')}>
                  <Text style={[as.tabText, mode === 'signup' && as.tabTextActive]}>CREATE ACCOUNT</Text>
                </TouchableOpacity>
              </View>

              <View style={{ padding: 24, gap: 0 }}>
                {/* SIGN UP extra fields */}
                {mode === 'signup' && (
                  <>
                    <Field label="FULL NAME" value={fullName} onChange={setFullName}
                      placeholder="Your full name" autoCapitalize="words"
                      icon={<User size={18} color="rgba(255,255,255,0.4)" />}
                      error={errors.fullName}
                    />
                    <Field label="USERNAME" value={username} onChange={(t: string) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
                      placeholder="@yourhandle"
                      icon={<Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '700' }}>@</Text>}
                      error={errors.username} maxLength={20}
                    />
                    <Field label="PHONE (OPTIONAL)" value={phone} onChange={setPhone}
                      placeholder="+60 12 345 6789" keyboardType="phone-pad"
                      icon={<Phone size={18} color="rgba(255,255,255,0.4)" />}
                      error={errors.phone}
                    />
                  </>
                )}

                <Field label="EMAIL ADDRESS" value={email} onChange={setEmail}
                  placeholder="your@email.com" keyboardType="email-address"
                  icon={<Mail size={18} color="rgba(255,255,255,0.4)" />}
                  error={errors.email}
                />

                <Field label="PASSWORD" value={password} onChange={setPassword}
                  placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                  icon={<Lock size={18} color="rgba(255,255,255,0.4)" />}
                  secureToggle secure={!showPw} onToggleSecure={() => setShowPw(p => !p)}
                  error={errors.password}
                />

                {/* Password strength bar — signup only */}
                {mode === 'signup' && password.length > 0 && (
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= score ? STRENGTH_COLORS[score] : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </View>
                    {score > 0 && (
                      <Text style={{ color: STRENGTH_COLORS[score], fontSize: 11, fontWeight: '800', marginBottom: 10 }}>
                        {STRENGTH_LABELS[score]}
                      </Text>
                    )}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14 }}>
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
                    icon={<Lock size={18} color="rgba(255,255,255,0.4)" />}
                    secureToggle secure={!showConfirm} onToggleSecure={() => setShowConfirm(p => !p)}
                    error={errors.confirm}
                  />
                )}

                {/* Forgot password — login only */}
                {mode === 'login' && (
                  <TouchableOpacity onPress={() => setShowForgot(true)} style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 }}>
                    <Text style={{ color: '#FF0055', fontSize: 12, fontWeight: '700' }}>Forgot password?</Text>
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
                        backgroundColor: termsAccepted ? '#FF0055' : 'rgba(255,255,255,0.1)',
                        borderWidth: 1, borderColor: termsAccepted ? '#FF0055' : 'rgba(255,255,255,0.2)',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        {termsAccepted && <Check size={13} color="#FFF" />}
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1, lineHeight: 20 }}>
                        I agree to the{' '}
                        <Text style={{ color: '#FF0055', fontWeight: '700' }} onPress={() => setShowTerms(true)}>
                          Terms of Service
                        </Text>
                        {' '}and{' '}
                        <Text style={{ color: '#FF0055', fontWeight: '700' }} onPress={() => setShowTerms(true)}>
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
                <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.86} style={as.submitOuter}>
                  <LinearGradient
                    colors={loading ? ['#333', '#222'] : ['#FF0055', '#FF3300']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={as.submitBtn}
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
                  </LinearGradient>
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
                        <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={as.socialIcon} />
                        <Text style={as.socialLabel}>Apple</Text>
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
                        <Ionicons name="logo-google" size={22} color="#FFFFFF" style={as.socialIcon} />
                        <Text style={as.socialLabel}>Google</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={as.footerNote}>
              By signing in you confirm you are 13+ and agree to our{' '}
              <Text style={{ color: '#FF0055' }} onPress={() => setShowTerms(true)}>Terms</Text>
              {' & '}
              <Text style={{ color: '#FF0055' }} onPress={() => setShowTerms(true)}>Privacy Policy</Text>
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
  root:  { flex: 1, backgroundColor: '#030303' },
  orb:   { position: 'absolute', borderRadius: 200 },
  backBtn: { padding: 20, alignSelf: 'flex-start' },

  logoRow: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  brandMark: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  appTagline: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 52,
  },
  socialIcon: { marginRight: 2 },
  socialLabel: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  card:    { marginHorizontal: 16, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },

  tabRow:  { flexDirection: 'row', margin: 12, borderRadius: 18, padding: 4, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, width: '48%', height: '100%', backgroundColor: '#FF0055', borderRadius: 14 },
  tab:     { flex: 1, paddingVertical: 12, alignItems: 'center', zIndex: 1 },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: '#FFF' },

  submitOuter: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  submitBtn:   { paddingVertical: 19, alignItems: 'center', justifyContent: 'center' },
  submitText:  { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.25 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '600' },

  footerNote: { textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '500', marginTop: 16, paddingHorizontal: 32, lineHeight: 18 },
});

