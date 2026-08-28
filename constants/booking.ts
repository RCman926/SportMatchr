/**
 * Booking-window options for hosting a meetup: who it's for and how it's played.
 * Values are stable ids (safe to store); labels are what people see.
 */

export type BookingOption = { value: string; label: string };

/** Who can join — safety-forward, women-only supported. */
export const GENDER_PLAY_OPTIONS: BookingOption[] = [
  { value: 'all', label: 'Open to all' },
  { value: 'women', label: 'Women only' },
  { value: 'mixed', label: 'Mixed play' },
];

/** Age band the host is aiming for. */
export const AGE_GROUP_OPTIONS: BookingOption[] = [
  { value: 'all', label: 'All ages' },
  { value: 'teens', label: 'Teens (13–17)' },
  { value: 'ya', label: '18–29' },
  { value: 'adult', label: '30–49' },
  { value: 'senior', label: '50+' },
];

/** Level of expertise. Values align with the profiles.skill enum. */
export const SKILL_LEVEL_OPTIONS: BookingOption[] = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const DEFAULT_GENDER_PLAY = GENDER_PLAY_OPTIONS[0].value;
export const DEFAULT_AGE_GROUP = AGE_GROUP_OPTIONS[0].value;
export const DEFAULT_SKILL_LEVEL = SKILL_LEVEL_OPTIONS[0].value;

/** A player's self-reported gender identity (inclusive, optional). */
export const GENDER_IDENTITY_OPTIONS: BookingOption[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

export const DEFAULT_GENDER_IDENTITY = 'unspecified';

export function genderIdentityLabel(value?: string | null): string | null {
  if (!value) return null;
  return GENDER_IDENTITY_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

/**
 * Decide whether a player can join a session given its gender-play setting and the
 * player's self-reported gender. Returns null when allowed, or a friendly reason
 * string when blocked. Self-reported only — the trust layer (face photo + report)
 * does the real enforcement at the court.
 */
export function genderGateReason(
  genderPlay: string | null | undefined,
  myGender: string | null | undefined
): string | null {
  if (genderPlay !== 'women') return null;
  if (myGender === 'woman') return null;
  if (!myGender || myGender === 'unspecified') {
    return 'This is a women-only game. Set your gender to Woman on your profile to join.';
  }
  return 'This game is women-only, so you can’t join it.';
}

function labelFor(options: BookingOption[], value?: string | null): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

export function genderPlayLabel(value?: string | null): string | null {
  return labelFor(GENDER_PLAY_OPTIONS, value);
}

export function ageGroupLabel(value?: string | null): string | null {
  return labelFor(AGE_GROUP_OPTIONS, value);
}

export function skillLevelLabel(value?: string | null): string | null {
  return labelFor(SKILL_LEVEL_OPTIONS, value);
}

export type BookingDetails = {
  genderPlay?: string | null;
  ageGroup?: string | null;
  skillLevel?: string | null;
  notes?: string | null;
};

/** Short chips a viewer sees on the session screen. Skips "open to all"-style defaults. */
export function bookingDetailChips(details: BookingDetails): string[] {
  const chips: string[] = [];
  if (details.genderPlay && details.genderPlay !== 'all') {
    const l = genderPlayLabel(details.genderPlay);
    if (l) chips.push(l);
  }
  if (details.skillLevel && details.skillLevel !== 'all') {
    const l = skillLevelLabel(details.skillLevel);
    if (l) chips.push(l);
  }
  if (details.ageGroup && details.ageGroup !== 'all') {
    const l = ageGroupLabel(details.ageGroup);
    if (l) chips.push(l);
  }
  return chips;
}

/**
 * Fold booking choices + notes into a human-readable description so they persist
 * in the existing sessions.description column (no schema change required to work).
 */
export function composeSessionDescription(
  base: string,
  details: BookingDetails
): string {
  const chips = bookingDetailChips(details);
  const parts: string[] = [];
  if (base.trim()) parts.push(base.trim());
  if (chips.length) parts.push(`For: ${chips.join(' · ')}.`);
  const notes = details.notes?.trim();
  if (notes) parts.push(notes);
  return parts.join(' ');
}
