import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { consumeGmailOAuthResume, exchangeGmailOAuthCode } from './_lib/gmailConnect';
import { stashGmailOAuthReturn, type GmailPendingAction } from './_lib/gmailDetoxSetup';

export default function GmailCallbackScreen() {
  const [errorText, setErrorText] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      router.replace('/(tabs)/email-clean');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('error_description') ?? params.get('error');
    const redirectUri =
      sessionStorage.getItem('gmail_oauth_redirect_uri') ??
      `${window.location.origin}/gmail-callback`;

    if (oauthError) {
      setErrorText(oauthError);
      return;
    }

    if (!code) {
      setErrorText('No authorization code returned from Google.');
      return;
    }

    void (async () => {
      const pending: GmailPendingAction =
        consumeGmailOAuthResume() === 'clean' ? 'clean' : 'scan';

      const res = await exchangeGmailOAuthCode(code, redirectUri);
      sessionStorage.removeItem('gmail_oauth_redirect_uri');

      if (typeof window !== 'undefined' && window.history.replaceState) {
        window.history.replaceState({}, '', '/gmail-callback');
      }

      if (!res.ok) {
        setErrorText(res.error);
        return;
      }

      stashGmailOAuthReturn({ hasModify: res.hasModify, pending });
      router.replace('/(tabs)/email-clean');
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1020', padding: 24 }}>
      {errorText ? (
        <Text style={{ color: '#F87171', textAlign: 'center', fontWeight: '600' }}>{errorText}</Text>
      ) : (
        <ActivityIndicator color="#FF0055" />
      )}
    </View>
  );
}
