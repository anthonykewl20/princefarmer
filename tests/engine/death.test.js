import { describe, it, expect } from 'vitest';
import { triggerDeath, isDead } from '../../src/engine/death.js';

describe('death', () => {
  it('triggerDeath marks the player as dead and zeroes HP', () => {
    const player = { hp: 0, isDead: false };
    triggerDeath(player);
    expect(player.hp).toBe(0);
    expect(player.isDead).toBe(true);
  });

  it('isDead returns true when player is dead', () => {
    expect(isDead({ isDead: true })).toBe(true);
    expect(isDead({ isDead: false })).toBe(false);
  });
});
