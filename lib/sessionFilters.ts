/** Host labels for who a game is for. Not profile fields — we don't collect gender/age. */

export type PlayMix = 'mixed' | 'female_only';
export type AgeGroup = 'any' | '18_24' | '25_34' | '35_44' | '45_plus';
export type SkillLevel = 'any' | 'beginner' | 'intermediate' | 'expert';

export const PLAY_MIX_OPTIONS: { key: PlayMix; label: string }[] = [
  { key: 'mixed', label: 'Mixed' },
  { key: 'female_only', label: 'Female only' },
];

export const AGE_GROUP_OPTIONS: { key: AgeGroup; label: string }[] = [
  { key: 'any', label: 'Any age' },
  { key: '18_24', label: '18–24' },
  { key: '25_34', label: '25–34' },
  { key: '35_44', label: '35–44' },
  { key: '45_plus', label: '45+' },
];

export const SKILL_LEVEL_OPTIONS: { key: SkillLevel; label: string }[] = [
  { key: 'any', label: 'Any level' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'expert', label: 'Expert' },
];

export const FEMALE_ONLY_JOIN_TIP =
  'This game is listed as female only. Join only if that fits you.';

export function parsePlayMix(v: unknown): PlayMix {
  return v === 'female_only' ? 'female_only' : 'mixed';
}

export function parseAgeGroup(v: unknown): AgeGroup {
  if (v === '18_24' || v === '25_34' || v === '35_44' || v === '45_plus') return v;
  return 'any';
}

export function parseSkillLevel(v: unknown): SkillLevel {
  if (v === 'beginner' || v === 'intermediate' || v === 'expert') return v;
  return 'any';
}

export function sessionWhoLabels(s: {
  playMix?: PlayMix;
  ageGroup?: AgeGroup;
  skillLevel?: SkillLevel;
}): string[] {
  const tags: string[] = [];
  if (s.playMix === 'female_only') tags.push('Female only');
  if (s.ageGroup && s.ageGroup !== 'any') {
    const hit = AGE_GROUP_OPTIONS.find((o) => o.key === s.ageGroup);
    if (hit) tags.push(hit.label);
  }
  if (s.skillLevel && s.skillLevel !== 'any') {
    const hit = SKILL_LEVEL_OPTIONS.find((o) => o.key === s.skillLevel);
    if (hit) tags.push(hit.label);
  }
  return tags;
}

export function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localHm(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function combineLocalDateTime(ymd: string, hm: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, min] = (hm || '18:00').split(':').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1, Number.isFinite(h) ? h : 18, Number.isFinite(min) ? min : 0, 0, 0);
}

export function formatWhenLabel(ymd: string, hm: string): string {
  const dt = combineLocalDateTime(ymd, hm);
  if (Number.isNaN(dt.getTime())) return 'Pick a date';
  return dt.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function nextWeekendYmd(): string {
  const d = new Date();
  const day = d.getDay();
  // Saturday stays today; other days jump to this week's Saturday.
  const delta = day === 6 ? 0 : (6 - day + 7) % 7;
  d.setDate(d.getDate() + delta);
  return localYmd(d);
}

export function shiftYmd(ymd: string, days: number): string {
  const dt = combineLocalDateTime(ymd, '12:00');
  dt.setDate(dt.getDate() + days);
  return localYmd(dt);
}
