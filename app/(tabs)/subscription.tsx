import { useRouter } from 'expo-router';
import React from 'react';
import SubscriptionScreen from './SubscriptionModal';

/** Subscribe / plans — full screen route (replaces overlay modal). */
export default function SubscriptionRoute() {
  const router = useRouter();
  return <SubscriptionScreen onClose={() => router.back()} />;
}
