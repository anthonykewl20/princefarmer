import { describe, it, expect } from 'vitest';
import {
  canPickAbility, validateAbilityPick, countPassiveInLoadout,
  computeElementMultiplier, computeComboBonus, distinctElementsInLoadout,
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

const MIGHT = { id: 'might', element: 'fire' };
const HASTE = { id: 'haste', element: 'air' };
const VIGOR = { id: 'vigor', element: 'water' };
const STONEHEART = { id: 'stoneheart', element: 'earth' };
const STORMCALL = { id: 'stormcall', element: 'lightning' };
const SOULREND = { id: 'soulrend', element: 'spirit' };
const PASSIVES = new Map([
  ['might', MIGHT], ['haste', HASTE], ['vigor', VIGOR],
  ['stoneheart', STONEHEART], ['stormcall', STORMCALL], ['soulrend', SOULREND],
]);

describe('distinctElementsInLoadout', () => {
  it('collects elements from weapons and passives', () => {
    const loadout = {
      main:    { element: 'spirit' },
      offhand: { element: 'fire' },
      passives: ['might', null, null, null, null, null],
    };
    expect(distinctElementsInLoadout(loadout, PASSIVES).size).toBe(2);
  });
  it('returns empty set for null loadout', () => {
    expect(distinctElementsInLoadout(null).size).toBe(0);
  });
});

describe('computeElementMultiplier', () => {
  it('returns 1.0 with no matching passives', () => {
    const loadout = { passives: [null, null, null, null, null, null] };
    const result = computeElementMultiplier(loadout, { element: 'fire' }, PASSIVES);
    expect(result.multiplier).toBe(1);
  });
  it('returns 1.15 with one matching passive slot', () => {
    const loadout = { passives: ['might', null, null, null, null, null] };
    const result = computeElementMultiplier(loadout, { element: 'fire' }, PASSIVES);
    expect(result.multiplier).toBeCloseTo(1.15, 5);
  });
  it('returns 1.45 with three matching passive slots', () => {
    const loadout = { passives: ['might', 'might', 'might', null, null, null] };
    const result = computeElementMultiplier(loadout, { element: 'fire' }, PASSIVES);
    expect(result.multiplier).toBeCloseTo(1.45, 5);
  });
  it('ignores passives of other elements', () => {
    const loadout = { passives: ['haste', 'haste', null, null, null, null] };
    const result = computeElementMultiplier(loadout, { element: 'fire' }, PASSIVES);
    expect(result.multiplier).toBe(1);
  });
});

describe('computeComboBonus', () => {
  it('returns 1.00 for fewer than 3 distinct elements', () => {
    const loadout = {
      main: { element: 'fire' },
      offhand: { element: 'fire' },
      passives: ['might', null, null, null, null, null],
    };
    expect(computeComboBonus(loadout, PASSIVES)).toBe(1);
  });
  it('returns 1.10 for 3-4 distinct elements', () => {
    const loadout = {
      main:    { element: 'fire' },
      offhand: { element: 'water' },
      passives: ['might', 'haste', null, null, null, null],
    };
    expect(computeComboBonus(loadout, PASSIVES)).toBe(1.10);
  });
  it('returns 1.25 for 5+ distinct elements', () => {
    const loadout = {
      main:    { element: 'fire' },
      offhand: { element: 'water' },
      passives: ['might', 'haste', 'stoneheart', 'stormcall', null, null],
    };
    expect(computeComboBonus(loadout, PASSIVES)).toBe(1.25);
  });
});
