import { describe, expect, it } from 'vitest';
import { AREA_PRESETS, FALLBACK_START_LABEL, explainGeoError, nearYouStatus } from './location';

describe('near-you location copy', () => {
  it('puts Glebe and Centretown first and keeps the other Ottawa presets', () => {
    expect(AREA_PRESETS.map((p) => p.id)).toEqual([
      'glebe',
      'centretown',
      'kanata',
      'barrhaven',
      'stittsville',
      'nepean',
      'orleans',
    ]);
  });

  it('does not present the fallback as a confirmed suburb', () => {
    const status = nearYouStatus('fallback', 'Kanata');
    expect(status.label).toBe('Location not set');
    expect(status.value).toBe(FALLBACK_START_LABEL);
    expect(status.value.toLowerCase()).not.toContain('kanata');
    expect(status.detail).toMatch(/isn’t set yet/i);
    expect(status.detail).toMatch(/central Ottawa/i);
    expect(status.detail).toMatch(/pick your neighbourhood/i);
  });

  it('tells a denied or timed-out GPS visitor to pick a neighbourhood', () => {
    expect(explainGeoError(1)).toMatch(/pick your neighbourhood/i);
    expect(explainGeoError(3)).toMatch(/pick your neighbourhood/i);
    expect(explainGeoError(1).toLowerCase()).not.toContain('you are near');
    expect(explainGeoError(3)).toMatch(/central Ottawa starting point/i);
  });

  it('keeps the real neighbourhood for GPS and a manual pick', () => {
    expect(nearYouStatus('gps', 'Kanata')).toEqual({
      label: 'You are near',
      value: 'Kanata',
      detail: null,
    });
    expect(nearYouStatus('manual', 'Barrhaven')).toEqual({
      label: 'Your area',
      value: 'Barrhaven',
      detail: null,
    });
  });
});
