import { describe, it, expect } from 'vitest';
import { pickPassiveChoices } from '../../src/engine/passivedrop.js';

const REGISTRY = [
  { id: 'might',     maxStacks: 5, tier: 1 },
  { id: 'vigor',     maxStacks: 5, tier: 1 },
  { id: 'haste',     maxStacks: 5, tier: 1 },
  { id: 'stoneheart',maxStacks: 3, tier: 2 },
  { id: 'stormcall', maxStacks: 3, tier: 2 },
  { id: 'soulrend',  maxStacks: 3, tier: 3 },
];

describe('pickPassiveChoices', () => {
  it('returns 3 choices by default', () => {
    const choices = pickPassiveChoices({ ownedPassives: [], loadout: { passives: [null,null,null,null,null,null] } }, REGISTRY, 3, Math.random);
    expect(choices.length).toBe(3);
  });

  it('never offers a passive the player already owns', () => {
    const owned = new Set(['might', 'vigor', 'haste']);
    for (let i = 0; i < 50; i++) {
      const choices = pickPassiveChoices({ ownedPassives: owned, loadout: { passives: [null,null,null,null,null,null] } }, REGISTRY, 3, Math.random);
      for (const c of choices) {
        if (typeof c === 'string') expect(owned.has(c)).toBe(false);
      }
    }
  });

  it('tier weights bias toward tier 1 (60% / 30% / 10%)', () => {
    let counts = { 1: 0, 2: 0, 3: 0 };
    for (let i = 0; i < 2000; i++) {
      const [c] = pickPassiveChoices({ ownedPassives: [], loadout: { passives: [null,null,null,null,null,null] } }, REGISTRY, 1, Math.random);
      const tier = REGISTRY.find((p) => p.id === c).tier;
      counts[tier]++;
    }
    expect(counts[1] / 2000).toBeGreaterThan(0.50);
    expect(counts[3] / 2000).toBeLessThan(0.20);
  });

  it('falls back to stack-upgrades when player owns all passives', () => {
    const makeRng = (seed) => {
      let s = seed;
      return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
    };
    const owned = new Set(REGISTRY.map((p) => p.id));
    const choices = pickPassiveChoices(
      { ownedPassives: owned, loadout: { passives: ['might', null, null, null, null, null] } },
      REGISTRY, 3, makeRng(8),
    );
    expect(choices).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'stack', passiveId: 'might' })]));
  });

  it('stack-upgrade respects maxStacks', () => {
    const owned = new Set(REGISTRY.map((p) => p.id));
    const choices = pickPassiveChoices(
      { ownedPassives: owned, loadout: { passives: ['might','might','might','might','might', null] } },
      REGISTRY, 3, Math.random,
    );
    // might is at maxStacks=5; should NOT be offered as a stack-upgrade
    for (const c of choices) {
      if (typeof c === 'object') expect(c.passiveId).not.toBe('might');
    }
  });

  it('is deterministic with a seeded RNG', () => {
    function makeRng(seed) {
      let s = seed;
      return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
    }
    const a = pickPassiveChoices({ ownedPassives: [], loadout: { passives: [null,null,null,null,null,null] } }, REGISTRY, 3, makeRng(42));
    const b = pickPassiveChoices({ ownedPassives: [], loadout: { passives: [null,null,null,null,null,null] } }, REGISTRY, 3, makeRng(42));
    expect(a).toEqual(b);
  });
});
