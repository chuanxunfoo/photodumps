import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import {
  consumeGmailOAuthResume,
  exchangeGmailOAuthCode,
  getGmailRedirectUri,
} from './_lib/gmailConnect';
import { stashGmailOAuthReturn, wasOAuthCodeExchanged, type GmailPendingAction } from './_lib/gmailDetoxSetup';

function readCode(params: Record<string, string | string[] | undefined>): string | null {
  const raw = params.code;
  if (typeof raw === 'string' && raw) return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return null;
}

function readError(params: Record<string, string | string[] | undefined>): string | null {
  const desc = params.error_description;
  if (typeof desc === 'string' && desc) return desc;
  const err = params.error;
  if (typeof err === 'string' && err) return err;
  return null;
}

function codeFromUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  const q = parsed.queryParams ?? {};
  return typeof q.code === 'string' ? q.code : null;
}

export default function GmailCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [errorText, setErrorText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const processing = useRef(false);

  const finishGmailOAuth = useCallback(async (code: string, redirectUri: string) => {
    const pending: GmailPendingAction = (await consumeGmailOAuthResume()) === 'clean' ? 'clean' : 'scan';
    const res = await exchangeGmailOAuthCode(code, redirectUri);
    if (!res.ok) return res;
    await stashGmailOAuthReturn({ hasModify: res.hasModify, pending });
    router.replace('/(tabs)/email-clean');
    return res;
  }, []);

  const runOAuth = useCallback(
    async (code: string, redirectUri: string) => {
      if (processing.current) return;
      if (await wasOAuthCodeExchanged(code)) {
        router.replace('/(tabs)/email-clean');
        return;
      }
      processing.current = true;
      setBusy(true);
      setErrorText(null);
      const res = await finishGmailOAuth(code, redirectUri);
      if (!res.ok) {
        processing.current = false;
        setErrorText(res.error);
      }
      setBusy(false);
    },
    [finishGmailOAuth],
  );

  useEffect(() => {
    const oauthError = readError(params);
    if (oauthError) {
      setErrorText(oauthError);
      return;
    }

    void (async () => {
      let code: string | null = null;
      let redirectUri = getGmailRedirectUri();

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const search = new URLSearchParams(window.location.search);
        code = search.get('code');
        redirectUri =
          sessionStorage.getItem('gmail_oauth_redirect_uri') ??
          `${window.location.origin}/gmail-callback`;
        if (search.get('error_description') || search.get('error')) {
          setErrorText(search.get('error_description') ?? search.get('error'));
          return;
        }
        sessionStorage.removeItem('gmail_oauth_redirect_uri');
        if (typeof window.history.replaceState === 'function') {
          window.history.replaceState({}, '', '/gmail-callback');
        }
      } else {
        code = readCode(params);
        if (!code) {
          const initial = await Linking.getInitialURL();
          if (initial) code = codeFromUrl(initial);
        }
      }

      if (!code) return;

      await runOAuth(code, redirectUri);
    })();
  }, [params.code, params.error, params.error_description, runOAuth]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Linking.addEventListener('url', (event) => {
      const code = codeFromUrl(event.url);
      if (code) void runOAuth(code, getGmailRedirectUri());
    });

    return () => sub.remove();
  }, [runOAuth]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1020', padding: 24 }}>
      {errorText ? (
        <Text style={{ color: '#F87171', textAlign: 'center', fontWeight: '600', lineHeight: 22 }}>{errorText}</Text>
      ) : busy || readCode(params) ? (
        <>
          <ActivityIndicator color="#FF0055" />
          <Text style={{ color: '#B8C0D4', marginTop: 16, textAlign: 'center', fontWeight: '600' }}>
            Connecting Gmail...
          </Text>
        </>
      ) : (
        <Text style={{ color: '#B8C0D4', textAlign: 'center', fontWeight: '600', lineHeight: 22 }}>
          Waiting for Google sign-in. If you see Open photodumps in the browser, tap it to return here.
        </Text>
      )}
    </View>
  );
}
