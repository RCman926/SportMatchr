import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  /** Average or selected value 0–5 */
  value: number;
  count?: number;
  /** Allow tapping to rate */
  interactive?: boolean;
  onRate?: (stars: number) => void;
  size?: 'sm' | 'md';
};

export function StarRating({
  value,
  count,
  interactive = false,
  onRate,
  size = 'sm',
}: Props) {
  const fontSize = size === 'md' ? 22 : 16;
  const rounded = Math.round(value * 2) / 2;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = rounded >= n;
        const half = !filled && rounded >= n - 0.5;
        const star = (
          <Text
            key={n}
            style={[
              styles.star,
              { fontSize },
              filled || half ? styles.starOn : styles.starOff,
            ]}
          >
            {filled ? '★' : half ? '★' : '☆'}
          </Text>
        );
        if (!interactive) return star;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onRate?.(n)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.star,
                { fontSize },
                (value >= n ? styles.starOn : styles.starOff),
              ]}
            >
              {value >= n ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        );
      })}
      {typeof count === 'number' && count > 0 ? (
        <Text style={styles.count}>
          {value.toFixed(1)} ({count})
        </Text>
      ) : interactive ? (
        <Text style={styles.count}>Rate</Text>
      ) : (
        <Text style={styles.countMuted}>No ratings yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
  star: {
    fontFamily: theme.fonts.bodyBold,
    lineHeight: 22,
  },
  starOn: { color: theme.ball },
  starOff: { color: theme.borderStrong },
  count: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 12,
    color: theme.muted,
    marginLeft: 6,
  },
  countMuted: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.mutedSoft,
    marginLeft: 6,
  },
});
