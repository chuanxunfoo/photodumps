import { usePathname, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = (usePathname() ?? '').toLowerCase();

  useEffect(() => {
    if (
      pathname.includes('auth') ||
      pathname.includes('verify') ||
      pathname.includes('reset') ||
      pathname.includes('callback')
    ) {
      router.replace('/auth-callback');
    }
  }, [pathname, router]);

  return (
    <View style={s.root}>
      <ActivityIndicator color="#12141A" size="small" />
      <Text style={s.text}>Redirecting…</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FAFBFC',
  },
  text: { color: 'rgba(18,20,26,0.55)', fontSize: 14, fontWeight: '600' },
});

