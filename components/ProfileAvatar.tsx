import { Image, View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
  /** Small badge when a real face photo is present */
  showPhotoHint?: boolean;
};

export function ProfileAvatar({ name, uri, size = 88, showPhotoHint = false }: Props) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const radius = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: theme.accentSoft,
            borderWidth: 2,
            borderColor: theme.accent,
          }}
          accessibilityLabel={`${name} profile photo`}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: radius,
            },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
      )}
      {showPhotoHint && !uri ? (
        <View style={styles.missing}>
          <Text style={styles.missingText}>Add photo</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
  },
  missing: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    backgroundColor: '#B45309',
    borderRadius: 8,
    paddingVertical: 2,
  },
  missingText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
});
