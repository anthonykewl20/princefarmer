import { describe, it, expect } from 'vitest';
import passives from '../../data/passives.json' with { type: 'json' };

describe('passives.json', () => {
  it('has 6 starter passives (one per element)', () => {
    expect(passives.length).toBe(6);
    const elements = new Set(passives.map((p) => p.element).filter(Boolean));
    expect(elements.size).toBe(6);
  });

  it('every passive has required fields', () => {
    for (const p of passives) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.effect).toBeTruthy();
      expect(p.effect.stat).toBeTruthy();
      expect(['add', 'mul']).toContain(p.effect.op);
      expect(typeof p.effect.value).toBe('number');
      expect(p.maxStacks).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(p.tier);
    }
  });

  it('might is fire element with attackPower add +1', () => {
    const might = passives.find((p) => p.id === 'might');
    expect(might).toBeTruthy();
    expect(might.element).toBe('fire');
    expect(might.effect).toEqual({ stat: 'attackPower', op: 'add', value: 1 });
    expect(might.maxStacks).toBe(5);
  });
});
