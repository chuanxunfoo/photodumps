import { View } from 'react-native';

/**
 * Bare `/` resolves here. Post-splash routing runs from `app/_layout.tsx`.
 * Avoid <Redirect> on first paint — it races the root Stack mount.
 */
export default function RootIndex() {
  return <View style={{ flex: 1 }} />;
}
