import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPlayer, MAX_HP, MAX_RUN_SPEED, JUMP_IMPULSE, CLIMB_SPEED, FALL_DAMAGE_THRESHOLD, serializePlayerToSave, hydratePlayerFromSave } from '../../src/engine/player.js';

describe('player constants', () => {
  it('exports tunables', () => {
    expect(MAX_HP).toBe(100);
    expect(MAX_RUN_SPEED).toBeGreaterThan(0);
    expect(JUMP_IMPULSE).toBeLessThan(0); // upward, so negative vy
    expect(CLIMB_SPEED).toBeGreaterThan(0);
    expect(FALL_DAMAGE_THRESHOLD).toBeGreaterThan(0);
  });
});

describe('createPlayer', () => {
  let p;
  beforeEach(() => {
    p = createPlayer(5, 10, { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} });
  });

  it('starts with full HP at the given position', () => {
    expect(p.hp).toBe(MAX_HP);
    expect(p.x).toBe(5);
    expect(p.y).toBe(10);
    expect(p.facing).toBe(1);
    expect(p.isClimbing).toBe(false);
    expect(p.isDead).toBe(false);
  });

  it('tracks the previous y to compute fall distance', () => {
    expect(p.prevY).toBe(10);
  });
});

describe('player input handling', () => {
  it('running left sets vx negative when left is pressed', () => {
    const input = { isPressed: (a) => a === 'left', wasJustPressed: () => false, endFrame: () => {} };
    const p = createPlayer(0, 0, input);
    p.update(0.016);
    expect(p.vx).toBeLessThan(0);
  });

  it('running right sets vx positive when right is pressed', () => {
    const input = { isPressed: (a) => a === 'right', wasJustPressed: () => false, endFrame: () => {} };
    const p = createPlayer(0, 0, input);
    p.update(0.016);
    expect(p.vx).toBeGreaterThan(0);
  });

  it('updates facing direction to match horizontal motion', () => {
    const input = { isPressed: (a) => a === 'right', wasJustPressed: () => false, endFrame: () => {} };
    const p = createPlayer(0, 0, input);
    p.update(0.016);
    expect(p.facing).toBe(1);

    const input2 = { isPressed: (a) => a === 'left', wasJustPressed: () => false, endFrame: () => {} };
    const p2 = createPlayer(0, 0, input2);
    p2.update(0.016);
    expect(p2.facing).toBe(-1);
  });

  it('jump sets vy to JUMP_IMPULSE only when onGround', () => {
    const input = { isPressed: () => false, wasJustPressed: (a) => a === 'jump', endFrame: () => {} };
    const p = createPlayer(0, 10, input);
    p.onGround = true;
    p.update(0.016);
    expect(p.vy).toBeCloseTo(JUMP_IMPULSE, 5);
  });

  it('jump is a no-op when airborne', () => {
    const input = { isPressed: () => false, wasJustPressed: (a) => a === 'jump', endFrame: () => {} };
    const p = createPlayer(0, 10, input);
    p.onGround = false;
    const vyBefore = p.vy;
    p.update(0.016);
    expect(p.vy).toBe(vyBefore);
  });
});

describe('player damage and death', () => {
  it('takeDamage reduces HP', () => {
    const p = createPlayer(0, 0, {});
    p.takeDamage(30);
    expect(p.hp).toBe(MAX_HP - 30);
  });

  it('takeDamage clamps HP to 0', () => {
    const p = createPlayer(0, 0, {});
    p.takeDamage(999);
    expect(p.hp).toBe(0);
  });

  it('takeDamage marks player as dead when HP reaches 0', () => {
    const p = createPlayer(0, 0, {});
    p.takeDamage(MAX_HP);
    expect(p.isDead).toBe(true);
  });

  it('heal restores HP up to MAX_HP', () => {
    const p = createPlayer(0, 0, {});
    p.takeDamage(50);
    p.heal(20);
    expect(p.hp).toBe(MAX_HP - 30);
    p.heal(999);
    expect(p.hp).toBe(MAX_HP);
  });
});

describe('player climbing', () => {
  it('sets isClimbing when on a ladder and pressing up', () => {
    const input = { isPressed: (a) => a === 'up', wasJustPressed: () => false, endFrame: () => {} };
    const p = createPlayer(0, 0, input);
    p.onLadder = true;
    p.update(0.016);
    expect(p.isClimbing).toBe(true);
  });

  it('gravity does not pull player down while climbing', () => {
    const input = { isPressed: (a) => a === 'up', wasJustPressed: () => false, endFrame: () => {} };
    const p = createPlayer(0, 5, input);
    p.onLadder = true;
    p.update(0.016);
    // vy should be -CLIMB_SPEED (climbing up), not increased by gravity
    expect(p.vy).toBeCloseTo(-CLIMB_SPEED, 5);
  });

  it('exits climbing when no longer on a ladder', () => {
    const input = { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} };
    const p = createPlayer(0, 5, input);
    p.onLadder = false;
    p.isClimbing = true;
    p.update(0.016);
    expect(p.isClimbing).toBe(false);
  });

  it('does NOT lock out horizontal movement when overlapping a ladder but not pressing up/down (regression: ladder lock-out)', () => {
    const input = { isPressed: (a) => a === 'right', wasJustPressed: () => false, endFrame: () => {} };
    const p = createPlayer(0, 5, input);
    p.onLadder = true; // overlapping a ladder
    p.update(0.016);
    // Should run right, NOT be stuck on the ladder
    expect(p.isClimbing).toBe(false);
    expect(p.vx).toBeGreaterThan(0);
  });

  it('does NOT lock out jump when overlapping a ladder but not pressing up/down (regression: ladder lock-out)', () => {
    const input = { isPressed: () => false, wasJustPressed: (a) => a === 'jump', endFrame: () => {} };
    const p = createPlayer(0, 10, input);
    p.onLadder = true; // overlapping a ladder
    p.onGround = true;
    p.update(0.016);
    expect(p.isClimbing).toBe(false);
    expect(p.vy).toBeCloseTo(JUMP_IMPULSE, 5);
  });

  it('jump while climbing exits climbing state and gives the jump impulse', () => {
    const input = { isPressed: (a) => a === 'up', wasJustPressed: (a) => a === 'jump', endFrame: () => {} };
    const p = createPlayer(0, 5, input);
    p.onLadder = true;
    p.onGround = true;
    p.update(0.016);
    expect(p.isClimbing).toBe(false);
    expect(p.vy).toBeCloseTo(JUMP_IMPULSE, 5);
  });

  it('does NOT accumulate fallDistance while climbing down (regression: ladder fall damage)', () => {
    const input = { isPressed: (a) => a === 'down', wasJustPressed: () => false, endFrame: () => {} };
    const p = createPlayer(0, 5, input);
    p.onLadder = true;
    p.isClimbing = true;
    // After several frames of climbing down, fallDistance should stay at 0
    for (let i = 0; i < 10; i++) p.update(0.016);
    expect(p.fallDistance).toBe(0);
  });
});

describe('player M2 fields', () => {
  it('initializes weapon state with zero cooldowns', () => {
    const p = createPlayer(0, 0, { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} });
    expect(p.weapon).toBeTruthy();
    expect(p.weapon.lastAttackTime).toBe(0);
    expect(p.weapon.lastAbilityTime).toBe(0);
  });

  it('initializes xp, level, attackPower with M2 defaults', () => {
    const p = createPlayer(0, 0, { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} });
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.attackPower).toBe(1);
    expect(p.pendingLevelUp).toBe(false);
  });
});

describe('player M3 fields', () => {
  it('initializes loadout with empty slots and kampilan as default main', () => {
    const p = createPlayer(0, 0, { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} });
    expect(p.loadout).toBeTruthy();
    expect(p.loadout.main).toEqual({ weaponId: 'kampilan', abilitiesPicked: [] });
    expect(p.loadout.offhand).toEqual({ weaponId: null, abilitiesPicked: [] });
    expect(p.loadout.passives).toEqual([null, null, null, null, null, null]);
  });

  it('initializes ownedPassives as an empty array', () => {
    const p = createPlayer(0, 0, { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} });
    expect(Array.isArray(p.ownedPassives)).toBe(true);
    expect(p.ownedPassives.length).toBe(0);
  });

  it('initializes evolutionState as an empty object', () => {
    const p = createPlayer(0, 0, { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} });
    expect(p.evolutionState).toEqual({});
  });

  it('initializes class defaults for the M4 start flow', () => {
    const p = createPlayer(0, 0, { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} });
    expect(p.classId).toBe('lakan-alon');
    expect(p.signatureAbilityId).toBe('tidal-pulse');
  });
});

describe('player save helpers', () => {
  it('serializes the runtime player into a v4 save payload', () => {
    const p = createPlayer(0, 0, { isPressed: () => false, wasJustPressed: () => false, endFrame: () => {} });
    p.classId = 'datu-kidlat';
    p.signatureAbilityId = 'thunder-lunge';
    p.loadout.main.abilitiesPicked = ['sweep', 'thrust'];
    p.loadout.offhand.weaponId = 'baladaw';
    p.loadout.offhand.abilitiesPicked = ['flame-slash', 'ember-step'];
    p.loadout.passives = ['stormcall', null, null, null, null, null];
    p.ownedPassives = ['stormcall'];
    p.evolutionState = { kampilan: { tier: 1 } };

    expect(serializePlayerToSave(p)).toEqual({
      version: 4,
      player: {
        classId: 'datu-kidlat',
        signatureAbilityId: 'thunder-lunge',
        hp: 100,
        maxHp: 100,
        level: 1,
        xp: 0,
        attackPower: 1,
      },
      weapons: [
        { slot: 'main', id: 'kampilan', abilitiesPicked: ['sweep', 'thrust'] },
        { slot: 'offhand', id: 'baladaw', abilitiesPicked: ['flame-slash', 'ember-step'] },
      ],
      loadout: { passives: ['stormcall', null, null, null, null, null] },
      ownedPassives: ['stormcall'],
      evolutionState: { kampilan: { tier: 1 } },
    });
  });

  it('hydrates a runtime player from save data', () => {
    const player = hydratePlayerFromSave({
      version: 4,
      player: {
        classId: 'datu-hiraya',
        signatureAbilityId: 'earthshaker',
        hp: 83,
        maxHp: 120,
        level: 6,
        xp: 15,
        attackPower: 5,
      },
      weapons: [
        { slot: 'main', id: 'baladaw', abilitiesPicked: ['ember-step', 'solar-thrust'] },
        { slot: 'offhand', id: 'kampilan', abilitiesPicked: ['sweep', 'lunging-strike'] },
      ],
      loadout: { passives: ['stoneheart', null, null, null, null, null] },
      ownedPassives: ['stoneheart'],
      evolutionState: { baladaw: { tier: 1 } },
    });

    expect(player.classId).toBe('datu-hiraya');
    expect(player.signatureAbilityId).toBe('earthshaker');
    expect(player.hp).toBe(83);
    expect(player.maxHp).toBe(120);
    expect(player.level).toBe(6);
    expect(player.attackPower).toBe(5);
    expect(player.loadout.main).toEqual({ weaponId: 'baladaw', abilitiesPicked: ['ember-step', 'solar-thrust'] });
    expect(player.loadout.offhand).toEqual({ weaponId: 'kampilan', abilitiesPicked: ['sweep', 'lunging-strike'] });
    expect(player.loadout.passives).toEqual(['stoneheart', null, null, null, null, null]);
    expect(player.ownedPassives).toEqual(['stoneheart']);
    expect(player.evolutionState).toEqual({ baladaw: { tier: 1 } });
  });
});
