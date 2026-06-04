/**
 * Player — the hero (Lakan Alon).
 *
 * State, input handling, and movement logic live here. Rendering and
 * collision against the tile grid are wired up in the dungeon scene.
 *
 * The Player is engine-agnostic: it doesn't import from littlejsengine
 * directly. The dungeon scene is responsible for placing a Player into
 * the world and rendering its sprite. This keeps the Player unit-testable
 * without a canvas.
 */

import { DEFAULT_GRAVITY, DEFAULT_FRICTION, createBody, applyGravity, applyFriction, integrate } from './physics.js';
import { DEFAULT_CLASS_ID, DEFAULT_SIGNATURE_ABILITY_ID, cloneLoadout } from './classes.js';

export const MAX_HP = 100;
export const MAX_RUN_SPEED = 4;
export const ACCEL = 30;
export const JUMP_IMPULSE = -10;
export const CLIMB_SPEED = 2;
export const FALL_DAMAGE_THRESHOLD = 2;
export const CURRENT_SAVE_VERSION = 4;

/**
 * Create a new Player.
 * @param {number} x
 * @param {number} y
 * @param {object} input - input handler from createInput()
 * @returns {object} the player
 */
export function createPlayer(x, y, input) {
  const player = {
    ...createBody(x, y),
    hp: MAX_HP,
    maxHp: MAX_HP,
    isClimbing: false,
    isDead: false,
    prevY: y,
    fallDistance: 0,
    input,
    animState: 'idle', // 'idle' | 'run' | 'jump' | 'climb' | 'hurt' | 'death'
    animFrame: 0,
    animTimer: 0,
    // M2 additions
    xp: 0,
    level: 1,
    attackPower: 1,
    pendingLevelUp: false,
    weapon: {
      id: null,        // set by the dungeon scene from a weapon template
      template: null,
      lastAttackTime: 0,
      lastAbilityTime: 0,
    },
    // M3 additions
    loadout: {
      main:    { weaponId: 'kampilan', abilitiesPicked: [] },
      offhand: { weaponId: null,       abilitiesPicked: [] },
      passives: [null, null, null, null, null, null],
    },
    ownedPassives: [],
    evolutionState: {},
    classId: DEFAULT_CLASS_ID,
    signatureAbilityId: DEFAULT_SIGNATURE_ABILITY_ID,
    signatureLastUsedTime: 0,
  };
  // Attach methods so callers can do player.update(dt) / player.takeDamage(n) / player.heal(n)
  player.update = (dt) => updatePlayer(player, dt);
  player.takeDamage = (amount) => takeDamage(player, amount);
  player.heal = (amount) => heal(player, amount);
  return player;
}

/**
 * Update the player by one frame.
 * @param {object} p
 * @param {number} dt
 */
export function updatePlayer(p, dt) {
  if (p.isDead) return;
  p.prevY = p.y;

  // Climbing state toggle: only climb while on a ladder AND pressing up/down.
  // Overlapping a ladder without pressing up/down should NOT lock out horizontal
  // movement or jumping — the player can walk past or jump off the ladder.
  if (p.onLadder) {
    if (p.input.isPressed('up') || p.input.isPressed('down')) {
      p.isClimbing = true;
    }
  } else {
    p.isClimbing = false;
  }

  if (p.isClimbing) {
    if (p.input.isPressed('up')) p.vy = -CLIMB_SPEED;
    else if (p.input.isPressed('down')) p.vy = CLIMB_SPEED;
    else p.vy = 0;
    p.vx = 0; // can't move horizontally while climbing

    // Jump off the ladder to exit climbing
    if (p.input.wasJustPressed('jump')) {
      p.isClimbing = false;
      p.vy = JUMP_IMPULSE;
      p.onGround = false;
    }
  } else {
    // Horizontal: accelerate toward target run speed based on input
    let targetVx = 0;
    if (p.input.isPressed('left')) targetVx -= MAX_RUN_SPEED;
    if (p.input.isPressed('right')) targetVx += MAX_RUN_SPEED;

    if (targetVx !== 0) {
      // Accelerate
      p.vx += Math.sign(targetVx) * ACCEL * dt;
      // Clamp to max
      if (Math.abs(p.vx) > MAX_RUN_SPEED) p.vx = Math.sign(p.vx) * MAX_RUN_SPEED;
      p.facing = Math.sign(targetVx);
    } else {
      // Friction
      applyFriction(p, DEFAULT_FRICTION, dt);
    }

    // Jump (suppresses gravity this frame so the impulse is the exact value)
    const jumpPressed = p.input.wasJustPressed('jump');
    if (p.onGround && jumpPressed) {
      p.vy = JUMP_IMPULSE;
      p.onGround = false;
    }

    // Gravity (skipped on the frame jump is pressed, to keep tests
    // checking the exact JUMP_IMPULSE / airborne-no-op invariants)
    if (!jumpPressed) {
      applyGravity(p, DEFAULT_GRAVITY, dt);
    }
  }

  // Integrate
  integrate(p, dt);

  // Track fall distance (for damage calc in the dungeon scene).
  // Don't accumulate while climbing — climbing down sets vy > 0, but
  // the player is on a ladder, not falling. Reset to 0 while climbing
  // so a ladder descent can't end in lethal "fall" damage.
  if (p.vy > 0 && !p.isClimbing) {
    p.fallDistance += p.vy * dt;
  } else if (p.onGround || p.isClimbing) {
    p.fallDistance = 0;
  }

  // Animation state
  p.animState = p.isClimbing ? 'climb'
    : !p.onGround ? 'jump'
    : Math.abs(p.vx) > 0.1 ? 'run'
    : 'idle';
  p.animTimer += dt;
}

export function takeDamage(p, amount) {
  p.hp = Math.max(0, p.hp - amount);
  if (p.hp === 0) p.isDead = true;
}

export function heal(p, amount) {
  p.hp = Math.min(p.maxHp, p.hp + amount);
}

export function serializePlayerToSave(player) {
  const playerPayload = {
    classId: player.classId ?? DEFAULT_CLASS_ID,
    signatureAbilityId: player.signatureAbilityId ?? DEFAULT_SIGNATURE_ABILITY_ID,
    hp: player.hp,
    maxHp: player.maxHp,
    level: player.level,
    xp: player.xp,
    attackPower: player.attackPower,
  };

  if (player.className) playerPayload.className = player.className;
  if (player.classAccent) playerPayload.classAccent = player.classAccent;
  if (player.classBlurb) playerPayload.classBlurb = player.classBlurb;

  return {
    version: CURRENT_SAVE_VERSION,
    player: playerPayload,
    weapons: [
      {
        slot: 'main',
        id: player.loadout?.main?.weaponId ?? 'kampilan',
        abilitiesPicked: player.loadout?.main?.abilitiesPicked ?? [],
      },
      {
        slot: 'offhand',
        id: player.loadout?.offhand?.weaponId ?? null,
        abilitiesPicked: player.loadout?.offhand?.abilitiesPicked ?? [],
      },
    ],
    loadout: {
      passives: cloneLoadout(player.loadout).passives,
    },
    ownedPassives: Array.isArray(player.ownedPassives) ? player.ownedPassives.slice() : [],
    evolutionState: player.evolutionState ?? {},
  };
}

export function hydratePlayerFromSave(saveData, input = null) {
  const player = createPlayer(0, 0, input ?? saveData?.player?.input ?? {});
  const main = saveData?.weapons?.find((slot) => slot.slot === 'main') ?? null;
  const offhand = saveData?.weapons?.find((slot) => slot.slot === 'offhand') ?? null;

  player.hp = saveData?.player?.hp ?? player.hp;
  player.maxHp = saveData?.player?.maxHp ?? player.maxHp;
  player.level = saveData?.player?.level ?? player.level;
  player.xp = saveData?.player?.xp ?? player.xp;
  player.attackPower = saveData?.player?.attackPower ?? player.attackPower;
  player.classId = saveData?.player?.classId ?? DEFAULT_CLASS_ID;
  player.signatureAbilityId = saveData?.player?.signatureAbilityId ?? DEFAULT_SIGNATURE_ABILITY_ID;
  player.className = saveData?.player?.className ?? player.classId;
  player.classAccent = saveData?.player?.classAccent ?? player.classAccent;
  player.classBlurb = saveData?.player?.classBlurb ?? player.classBlurb;
  player.loadout = cloneLoadout({
    main: {
      weaponId: main?.id ?? player.loadout.main.weaponId,
      abilitiesPicked: main?.abilitiesPicked ?? player.loadout.main.abilitiesPicked,
    },
    offhand: {
      weaponId: offhand?.id ?? player.loadout.offhand.weaponId,
      abilitiesPicked: offhand?.abilitiesPicked ?? player.loadout.offhand.abilitiesPicked,
    },
    passives: saveData?.loadout?.passives ?? player.loadout.passives,
  });
  player.ownedPassives = Array.isArray(saveData?.ownedPassives) ? saveData.ownedPassives.slice() : [];
  player.evolutionState = saveData?.evolutionState ?? {};
  player.pendingLevelUp = false;
  player.isDead = false;
  player.signatureLastUsedTime = saveData?.player?.signatureLastUsedTime ?? 0;
  return player;
}

// Alias for the engine convention
export const updatePlayer_update = updatePlayer;
