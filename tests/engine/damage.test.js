import { describe, it, expect } from 'vitest';
import { calculateFallDamage, MAX_HP } from '../../src/engine/damage.js';

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
