import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>photodumps hit a snag</Text>
          <Text style={styles.msg}>Please force-quit and reopen the app.</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.btnTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0B0D12',
  },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  msg: { color: '#9AA3B2', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btn: {
    marginTop: 24,
    backgroundColor: '#3B5BFC',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
