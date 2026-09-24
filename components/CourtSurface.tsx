import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Cool concrete wash + faint court grid. Web gets real CSS texture;
 * native gets layered washes so it still feels grounded.
 */
export function CourtSurface({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={styles.wash} />
      {Platform.OS === 'web' ? (
        <View pointerEvents="none" style={[styles.layer, styles.webGrain as ViewStyle]} />
      ) : (
        <>
          <View pointerEvents="none" style={[styles.layer, styles.nativeV]} />
          <View pointerEvents="none" style={[styles.layer, styles.nativeH]} />
        </>
      )}
      <View pointerEvents="none" style={styles.topFade} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    // Don’t clip — mobile web needs the page ScrollView to move freely
    overflow: 'visible',
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.bgDeep,
    opacity: 0.55,
  },
  layer: {
    ...StyleSheet.absoluteFill,
  },
  webGrain: {
    // @ts-expect-error web-only CSS
    backgroundImage: [
      'radial-gradient(ellipse 90% 50% at 50% -8%, rgba(36,145,66,0.16), transparent 58%)',
      'radial-gradient(ellipse 70% 40% at 100% 0%, rgba(232,93,4,0.07), transparent 50%)',
      'repeating-linear-gradient(90deg, transparent 0, transparent 47px, rgba(27,107,50,0.035) 47px, rgba(27,107,50,0.035) 48px)',
    ].join(', '),
  },
  nativeV: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: theme.accentLine,
    marginHorizontal: '18%',
    opacity: 0.7,
  },
  nativeH: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(14, 21, 16, 0.06)',
    marginVertical: '28%',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(255, 254, 251, 0.45)',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
