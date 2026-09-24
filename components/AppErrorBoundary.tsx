import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../constants/theme';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SportMatchr render failure', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ failed: false });
    router.replace('/(tabs)/home');
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <View style={styles.screen}>
        <Text style={styles.kicker}>SPORTMATCHR</Text>
        <Text style={styles.title}>That screen didn’t load</Text>
        <Text style={styles.body}>
          Your account is safe. Head back to Play and try once more.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.retry}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Return to Play"
        >
          <Text style={styles.buttonText}>Return to Play</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.bg,
  },
  kicker: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    color: theme.ink,
    fontFamily: theme.fonts.displayBold,
    fontSize: 30,
    marginBottom: 8,
  },
  body: {
    color: theme.muted,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 20,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: theme.ball,
    borderColor: theme.ballDark,
    borderWidth: 1.5,
    borderRadius: theme.radius.md,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  buttonText: {
    color: theme.surfaceRaised,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
  },
});
