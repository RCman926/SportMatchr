import { describe, expect, it } from 'vitest';
import {
  combineLocalDateTime,
  parseAgeGroup,
  parsePlayMix,
  parseSkillLevel,
  sessionWhoLabels,
  shiftYmd,
} from './sessionFilters';

describe('session audience filters', () => {
  it('falls back safely for unknown database values', () => {
    expect(parsePlayMix('unexpected')).toBe('mixed');
    expect(parseAgeGroup('17_and_under')).toBe('any');
    expect(parseSkillLevel(null)).toBe('any');
  });

  it('builds only meaningful public labels', () => {
    expect(
      sessionWhoLabels({
        playMix: 'female_only',
        ageGroup: '25_34',
        skillLevel: 'beginner',
      })
    ).toEqual(['Female only', '25–34', 'Beginner']);

    expect(
      sessionWhoLabels({
        playMix: 'mixed',
        ageGroup: 'any',
        skillLevel: 'any',
      })
    ).toEqual([]);
  });
});

describe('local meetup dates', () => {
  it('combines a local date and time without changing the entered values', () => {
    const date = combineLocalDateTime('2026-09-21', '18:30');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(21);
    expect(date.getHours()).toBe(18);
    expect(date.getMinutes()).toBe(30);
  });

  it('shifts calendar dates across month boundaries', () => {
    expect(shiftYmd('2026-09-30', 1)).toBe('2026-10-01');
  });
});
