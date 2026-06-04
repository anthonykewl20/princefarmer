import { describe, it, expect } from 'vitest';
import {
  canPickAbility, validateAbilityPick, countPassiveInLoadout,
} from '../../src/engine/build.js';

const KAMPILAN = {
  id: 'kampilan',
  abilities: ['lunging-strike', 'sweep', 'thrust', 'shield-bash'],
};
const BALADAW = {
  id: 'baladaw',
  abilities: ['flame-slash', 'burning-lunge', 'ember-step', 'solar-thrust'],
};

describe('canPickAbility', () => {
  it('returns true for an ability on the weapon', () => {
    expect(canPickAbility(KAMPILAN, 'sweep')).toBe(true);
  });
  it('returns false for an ability not on the weapon', () => {
    expect(canPickAbility(KAMPILAN, 'flame-slash')).toBe(false);
  });
  it('returns false for null/undefined', () => {
    expect(canPickAbility(KAMPILAN, null)).toBe(false);
    expect(canPickAbility(KAMPILAN, undefined)).toBe(false);
  });
});

describe('validateAbilityPick', () => {
  it('returns ok when picking 2 of 4 abilities', () => {
    expect(validateAbilityPick(KAMPILAN, ['sweep', 'thrust'])).toEqual({ ok: true });
  });
  it('returns error when not picking exactly 2', () => {
    expect(validateAbilityPick(KAMPILAN, ['sweep'])).toEqual({ ok: false, error: 'must pick exactly 2 abilities' });
    expect(validateAbilityPick(KAMPILAN, ['sweep', 'thrust', 'lunging-strike'])).toEqual({ ok: false, error: 'must pick exactly 2 abilities' });
  });
  it('returns error when a picked ability is not on the weapon', () => {
    expect(validateAbilityPick(KAMPILAN, ['sweep', 'flame-slash'])).toEqual({ ok: false, error: 'flame-slash is not on kampilan' });
  });
  it('returns error when both picks are the same ability', () => {
    expect(validateAbilityPick(KAMPILAN, ['sweep', 'sweep'])).toEqual({ ok: false, error: 'cannot pick the same ability twice' });
  });
  it('works for the second weapon too', () => {
    expect(validateAbilityPick(BALADAW, ['flame-slash', 'ember-step'])).toEqual({ ok: true });
  });
});

describe('countPassiveInLoadout', () => {
  it('counts slots containing the given passive id', () => {
    const loadout = { passives: ['might', 'might', 'vigor', null, null, null] };
    expect(countPassiveInLoadout(loadout, 'might')).toBe(2);
    expect(countPassiveInLoadout(loadout, 'vigor')).toBe(1);
    expect(countPassiveInLoadout(loadout, 'haste')).toBe(0);
  });
  it('handles empty loadout', () => {
    expect(countPassiveInLoadout({ passives: [] }, 'might')).toBe(0);
  });
});
