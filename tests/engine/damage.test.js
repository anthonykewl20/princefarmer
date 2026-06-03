import { describe, it, expect } from 'vitest';
import { calculateFallDamage, MAX_HP, applyDamageWithCrit } from '../../src/engine/damage.js';

describe('damage', () => {
  describe('MAX_HP', () => {
    it('is 100', () => {
      expect(MAX_HP).toBe(100);
    });
  });

  describe('calculateFallDamage', () => {
    it('returns 0 for short falls (under 2 units)', () => {
      expect(calculateFallDamage(0)).toBe(0);
      expect(calculateFallDamage(1.5)).toBe(0);
      expect(calculateFallDamage(1.99)).toBe(0);
    });

    it('returns scaled damage for medium falls', () => {
      // 4 units → 25 damage
      expect(calculateFallDamage(4)).toBe(25);
      // 6 units → 50 damage
      expect(calculateFallDamage(6)).toBe(50);
    });

    it('returns 100 (lethal) for falls over 10 units', () => {
      expect(calculateFallDamage(10)).toBe(100);
      expect(calculateFallDamage(50)).toBe(100);
    });

    it('returns 0 for negative distance (sanity check)', () => {
      expect(calculateFallDamage(-1)).toBe(0);
    });
  });
});

describe('applyDamageWithCrit', () => {
  it('returns the base damage for a non-crit roll', () => {
    // Seeded RNG that returns 0.5 (>= 0.1 threshold → not a crit)
    const rng = () => 0.5;
    expect(applyDamageWithCrit(20, rng)).toBe(20);
  });

  it('returns 1.5x damage for a crit roll', () => {
    // Seeded RNG that returns 0.05 (< 0.1 threshold → crit)
    const rng = () => 0.05;
    expect(applyDamageWithCrit(20, rng)).toBe(30);
  });

  it('floors the crit result to an integer', () => {
    const rng = () => 0.05;
    expect(applyDamageWithCrit(7, rng)).toBe(10); // 7 * 1.5 = 10.5 → 10
  });
});
