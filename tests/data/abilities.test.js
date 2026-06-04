import { describe, it, expect } from 'vitest';
import abilities from '../../data/abilities.json' with { type: 'json' };

describe('abilities.json', () => {
  it('contains lunging-strike', () => {
    const a = abilities.find((x) => x.id === 'lunging-strike');
    expect(a).toBeTruthy();
    expect(a.name).toBe('Lunging Strike');
    expect(a.damage).toBe(30);
    expect(a.cooldown).toBe(3.0);
    expect(a.range).toBe(2.0);
    expect(a.aoe.shape).toBe('arc');
    expect(a.aoe.arc).toBeCloseTo(Math.PI / 2, 5);
    expect(a.aoe.radius).toBe(1.0);
  });

  it('every ability has required fields', () => {
    for (const a of abilities) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(typeof a.damage).toBe('number');
      expect(typeof a.cooldown).toBe('number');
      expect(typeof a.range).toBe('number');
      expect(a.aoe).toBeTruthy();
      expect(['arc', 'line', 'circle', 'cone']).toContain(a.aoe.shape);
    }
  });
});
