import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { safeReplace } from '../_lib/safeNavigate';
import SubscriptionScreen from './SubscriptionModal';

/** Subscribe / plans — full screen route (replaces overlay modal). */
export default function SubscriptionRoute() {
  const router = useRouter();
  const { postOnboarding } = useLocalSearchParams<{ postOnboarding?: string }>();
  const isSetup = postOnboarding === '1';

  return (
    <SubscriptionScreen
      postOnboarding={isSetup}
      onClose={() => {
        if (isSetup) {
          safeReplace('/hub?page=calendar');
        } else {
          router.back();
        }
      }}
    />
  );
}
