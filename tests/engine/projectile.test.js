import { describe, it, expect } from 'vitest';
import { createProjectile } from '../../src/engine/projectile.js';

describe('createProjectile', () => {
  it('initializes a projectile with the given position, direction, and damage', () => {
    const p = createProjectile(0, 0, 1, 0, 10);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
    expect(p.vx).toBeGreaterThan(0);
    expect(p.vy).toBe(0);
    expect(p.damage).toBe(10);
    expect(p.alive).toBe(true);
    expect(typeof p.update).toBe('function');
    expect(typeof p.render).toBe('function');
  });
});
