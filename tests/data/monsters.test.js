import { describe, it, expect } from 'vitest';
import monsters from '../../data/monsters.json' with { type: 'json' };
import behaviors from '../../data/behaviors.json' with { type: 'json' };

describe('monsters.json', () => {
  it('contains the aswang', () => {
    const a = monsters.find((m) => m.id === 'aswang');
    expect(a).toBeTruthy();
    expect(a.name).toBe('Aswang');
    expect(a.hp).toBe(30);
    expect(a.damage).toBe(8);
    expect(a.speed).toBe(1.5);
    expect(a.contactRange).toBe(0.6);
    expect(a.behavior).toBe('strafe-lunge');
    expect(a.drops).toEqual([{ kind: 'xp', amount: 5, chance: 1.0 }]);
  });

  it('every monster references a registered behavior', () => {
    const ids = new Set(behaviors.map((b) => b.id));
    for (const m of monsters) {
      expect(ids.has(m.behavior)).toBe(true);
    }
  });

  it('every monster has required fields', () => {
    for (const m of monsters) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(typeof m.hp).toBe('number');
      expect(typeof m.damage).toBe('number');
      expect(typeof m.speed).toBe('number');
      expect(typeof m.contactRange).toBe('number');
      expect(typeof m.behavior).toBe('string');
      expect(Array.isArray(m.drops)).toBe(true);
    }
  });
});
