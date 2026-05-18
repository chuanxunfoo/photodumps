/**
 * Terms of Service — photodumps
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useExploreAwareBack } from '../_lib/exploreBack';
import { getLegalCopy } from '../_lib/localeContent';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const LEGAL_BG = require('../assets/explore/legal-parchment.png');

const BODY = `TERMS OF SERVICE — PHOTODUMPS

Last updated: May 2026

1. Agreement
By downloading or using photodumps ("the App"), you agree to these Terms. If you do not agree, do not use the App.

2. What photodumps does
photodumps helps you review and organise photos on your device. You remain responsible for which photos you delete or keep. We do not guarantee recovery of any content you choose to remove.

3. Accounts & eligibility
Some features require an account. You agree to provide accurate information and to keep your credentials secure. You must be old enough to enter a binding contract in your jurisdiction to subscribe to paid plans.

4. Hobby & Pro plans
Hobby may include limited weekly swipes or feature access. Pro unlocks expanded or unlimited use of the features described at purchase time (including themes, icons, languages beyond English, notifications, Supercut, Photobooth, Video trim, Duplicates, My stats, Bookmarks where available, and Deep Clean where available). Features may evolve; material reductions will be communicated in release notes where practical.

5. Billing & renewals
Paid plans are billed through your platform store (Apple App Store / Google Play). Subscriptions renew automatically until cancelled in your store account settings. Refunds are handled according to the store's policies.

6. Acceptable use
Do not misuse the App, attempt to break security, reverse engineer except as permitted by law, or use the App in violation of applicable law.

7. Intellectual property
photodumps branding, UI, and software are owned by the developer. You receive a personal, non-transferable licence to use the App.

8. Disclaimer
The App is provided "as is" to the maximum extent permitted by law. We disclaim implied warranties where allowed. We are not liable for indirect or consequential damages, or for loss of data beyond what mandatory consumer laws require.

9. Changes
We may update these Terms. Continued use after changes constitutes acceptance of the revised Terms.

10. Contact
Questions about these Terms? Reach out via the email shown in the App Store / Play listing or from Settings in the App.

Thank you for cleaning your camera roll with intention.`;

export default function ExploreLegalTermsScreen() {
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
          <Text style={[s.title, { color: '#2d2418' }]}>{legal.termsTitle}</Text>
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
