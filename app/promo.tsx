/**
 * Social promo landing — standalone, not linked from app onboarding.
 * Dev: open /promo in Expo Router, or Linking.openURL('exp://…/--/promo')
 */
import PromoLanding from './components/promo/PromoLanding';

export default function PromoScreen() {
  return <PromoLanding />;
}
