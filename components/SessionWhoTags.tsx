import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { sessionWhoLabels, type AgeGroup, type PlayMix, type SkillLevel } from '../lib/sessionFilters';

export function SessionWhoTags({
  playMix,
  ageGroup,
  skillLevel,
}: {
  playMix?: PlayMix;
  ageGroup?: AgeGroup;
  skillLevel?: SkillLevel;
}) {
  const tags = sessionWhoLabels({ playMix, ageGroup, skillLevel });
  if (!tags.length) return null;
  return (
    <View style={styles.row}>
      {tags.map((t) => (
        <Text key={t} style={[styles.tag, t === 'Female only' && styles.tagEmphasis]}>
          {t}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  tag: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    color: theme.accentDark,
    backgroundColor: theme.accentSoft,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagEmphasis: {
    color: theme.ballDark,
    backgroundColor: theme.ballSoft,
  },
});
