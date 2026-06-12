import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StripePlanId } from './stripe/plans';

const ENDS_KEY = '@dumpit_subscription_ends_at';
const PLAN_KEY = '@dumpit_subscription_plan';

export async function persistLocalSubscriptionMeta(
  planId: StripePlanId,
  periodEndMs: number,
): Promise<void> {
  await AsyncStorage.multiSet([
    [ENDS_KEY, String(periodEndMs)],
    [PLAN_KEY, planId],
  ]);
}

export async function readLocalSubscriptionMeta(): Promise<{
  planId: StripePlanId | null;
  periodEndMs: number | null;
}> {
  const [[, endsRaw], [, planRaw]] = await AsyncStorage.multiGet([ENDS_KEY, PLAN_KEY]);
  const periodEndMs = endsRaw ? Number(endsRaw) : null;
  const planId = (planRaw === 'weekly' || planRaw === 'monthly' || planRaw === 'yearly')
    ? planRaw
    : null;
  return {
    planId,
    periodEndMs: periodEndMs != null && Number.isFinite(periodEndMs) ? periodEndMs : null,
  };
}
