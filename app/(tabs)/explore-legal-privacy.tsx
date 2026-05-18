/**
 * Privacy Policy — photodumps
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { getLegalCopy } from '../_lib/localeContent';
import { useTheme } from './ThemeContext';

const LEGAL_BG = require('../assets/explore/legal-parchment.png');

const BODY = `PRIVACY POLICY — PHOTODUMPS

Last updated: May 2026

1. Summary
photodumps is built to process your photos on-device as much as possible. We only collect what we need to run accounts, subscriptions, and optional cloud features you explicitly use.

2. Information we may collect
• Account data: email, display name, and authentication identifiers from your sign-in provider.
• Usage & diagnostics: anonymised or aggregated analytics and crash logs to fix bugs (you can limit tracking where your OS allows).
• Purchase data: subscription status from Apple / Google — we do not receive your full payment card number.

3. Photos & media
Your gallery is accessed so you can swipe, archive, and delete. We do not upload your full photo library by default. Features that sync or backup data will call that out separately before you opt in.

4. How we use information
To authenticate you, deliver Pro entitlements, improve stability, respond to support requests, and comply with law.

5. Sharing
We do not sell your personal information. We share data with processors who help us run the service (e.g. auth, analytics, payment validation) under contracts that require protection.

6. Retention
We keep account and billing records as long as your account is active and for a reasonable period afterward for legal and accounting reasons.

7. Security
We use industry-standard practices, but no method of transmission or storage is 100% secure.

8. Your choices
You may request account deletion where applicable, adjust notification settings in the App, and manage subscriptions in your store account.

9. Children
photodumps is not directed at children under 13 (or the minimum age in your region). Do not use the App if you are not old enough.

10. International users
If you use the App from outside Malaysia, your information may be processed in other countries where we or our vendors operate.

11. Contact
Privacy questions? Use the support contact on the store listing or in Settings.

Thank you for trusting us with something as personal as your memories.`;

export default function ExploreLegalPrivacyScreen() {
  const { theme } = useTheme();
  const legal = getLegalCopy('en');
  const goBack = useExploreAwareBack();

  return (
    <View style={s.root}>
      <ImageBackground source={LEGAL_BG} style={StyleSheet.absoluteFill} imageStyle={{ resizeMode: 'cover' }} />
      <LinearGradient
        colors={['rgba(252,248,240,0.88)', 'rgba(248,242,230,0.93)', 'rgba(245,236,220,0.95)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={goBack} style={[s.back, { backgroundColor: 'rgba(255,251,245,0.94)', borderColor: theme.border }]}>
            <ChevronLeft size={22} color={theme.textSub} />
          </TouchableOpacity>
          <Text style={[s.title, { color: '#2d2418' }]}>{legal.privacyTitle}</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={s.page}>
            <Text style={s.mono}>{BODY}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5ebe0' },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  back: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  page: {
    backgroundColor: 'rgba(255, 251, 245, 0.88)',
    borderRadius: 14,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90, 60, 40, 0.22)',
  },
  mono: { fontFamily: 'Courier New', fontSize: 13, lineHeight: 20, fontWeight: '500', color: '#2d2418' },
});
