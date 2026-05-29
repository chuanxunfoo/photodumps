import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createSessionFromUrl } from './(tabs)/authOAuth';
import { supabase } from './(tabs)/supabase';

function formatErr(err: unknown): string {
  return err instanceof Error ? err.message : 'Unable to reset password.';
}

export default function ResetPasswordScreen() {
  const [loadingSession, setLoadingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const initial = await Linking.getInitialURL();
        if (initial && initial.includes('reset-password')) {
          await createSessionFromUrl(initial);
        }
      } catch {
        Alert.alert('Reset link error', 'Your reset link is invalid or expired. Please request a new one.');
        router.replace('/auth?error=1');
      } finally {
        if (mounted) setLoadingSession(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const submit = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Please re-enter the same password.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk(true);
    } catch (e) {
      Alert.alert('Reset failed', formatErr(e));
    } finally {
      setSaving(false);
    }
  };

  if (loadingSession) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#12141A" size="large" />
        <Text style={s.sub}>Validating reset link…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={s.title}>Set a new password</Text>
        <Text style={s.sub}>Choose a strong password to finish recovering your account.</Text>

        <TextInput
          style={s.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor="rgba(18,20,26,0.35)"
        />
        <TextInput
          style={s.input}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Confirm new password"
          placeholderTextColor="rgba(18,20,26,0.35)"
        />

        <TouchableOpacity style={[s.btn, saving && { opacity: 0.7 }]} disabled={saving} onPress={submit}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnTxt}>Reset password</Text>}
        </TouchableOpacity>

        {ok ? (
          <TouchableOpacity onPress={() => router.replace('/auth?verified=1')}>
            <Text style={s.link}>Password updated. Go to sign in.</Text>
          </TouchableOpacity>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFBFC' },
  wrap: { flex: 1, paddingHorizontal: 22, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFBFC', gap: 12 },
  title: { color: '#12141A', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  sub: { color: 'rgba(18,20,26,0.55)', fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(18,20,26,0.12)',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#12141A',
    marginBottom: 12,
    fontSize: 16,
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#12141A',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  btnTxt: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  link: { marginTop: 14, color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
