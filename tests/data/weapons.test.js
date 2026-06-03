import { describe, it, expect } from 'vitest';
import weapons from '../../data/weapons.json' with { type: 'json' };

describe('weapons.json', () => {
  it('contains the kampilan', () => {
    const k = weapons.find((w) => w.id === 'kampilan');
    expect(k).toBeTruthy();
    expect(k.name).toBe('Kampilan');
    expect(k.type).toBe('melee');
    expect(k.element).toBe('spirit');
    expect(k.autoAttack.shape).toBe('arc');
    expect(k.autoAttack.arc).toBeCloseTo(Math.PI / 2, 5);
    expect(k.autoAttack.range).toBe(1.2);
    expect(k.autoAttack.tick).toBe(0.6);
    expect(k.autoAttack.damage).toBe(20);
    expect(k.abilities).toEqual(['lunging-strike']);
  });

  it('every weapon has required fields', () => {
    for (const w of weapons) {
      expect(w.id).toBeTruthy();
      expect(w.name).toBeTruthy();
      expect(['melee', 'ranged', 'magic', 'summon']).toContain(w.type);
      expect(['fire', 'water', 'earth', 'air', 'lightning', 'spirit']).toContain(w.element);
      expect(w.autoAttack).toBeTruthy();
      expect(typeof w.autoAttack.range).toBe('number');
      expect(typeof w.autoAttack.tick).toBe('number');
      expect(typeof w.autoAttack.damage).toBe('number');
      expect(['arc', 'line', 'circle', 'cone']).toContain(w.autoAttack.shape);
      expect(Array.isArray(w.abilities)).toBe(true);
    }
  });
});
