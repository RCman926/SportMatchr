import { Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { ChoiceChips } from './ChoiceChips';
import {
  AGE_GROUP_OPTIONS,
  PLAY_MIX_OPTIONS,
  SKILL_LEVEL_OPTIONS,
  type AgeGroup,
  type PlayMix,
  type SkillLevel,
} from '../lib/sessionFilters';

export function SessionAudienceFields({
  playMix,
  ageGroup,
  skillLevel,
  onPlayMix,
  onAgeGroup,
  onSkillLevel,
}: {
  playMix: PlayMix;
  ageGroup: AgeGroup;
  skillLevel: SkillLevel;
  onPlayMix: (v: PlayMix) => void;
  onAgeGroup: (v: AgeGroup) => void;
  onSkillLevel: (v: SkillLevel) => void;
}) {
  return (
    <>
      <Text style={styles.label}>Who it’s for</Text>
      <Text style={styles.hint}>
        Host label only — we don’t collect gender or age on profiles. People decide if it fits.
      </Text>
      <ChoiceChips options={PLAY_MIX_OPTIONS} value={playMix} onChange={onPlayMix} />

      <Text style={styles.label}>Age group</Text>
      <ChoiceChips options={AGE_GROUP_OPTIONS} value={ageGroup} onChange={onAgeGroup} />

      <Text style={styles.label}>Level</Text>
      <ChoiceChips options={SKILL_LEVEL_OPTIONS} value={skillLevel} onChange={onSkillLevel} />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontFamily: theme.fonts.bodyBold,
    color: theme.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  hint: {
    color: theme.muted,
    fontSize: 12,
    fontFamily: theme.fonts.body,
    marginBottom: 10,
    lineHeight: 17,
  },
});
