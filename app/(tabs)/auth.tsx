import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

/** Legacy route — login/signup UI removed; account sign-in lives on Generals → account. */
export default function AuthRedirectScreen() {
  useEffect(() => {
    router.replace('/hub?page=generals');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFBFC' }}>
      <ActivityIndicator color="#3B5BFC" />
    </View>
  );
}
