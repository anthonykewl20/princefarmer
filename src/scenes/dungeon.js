/**
 * Dungeon scene — M2.
 *
 * Responsibilities (M1 + M2):
 *  - Load the room, build the tile grid, spawn the player
 *  - Drive player input + physics
 *  - Tile-collision (snap to ground on onGround)
 *  - Camera follow
 *  - Fall damage on landing
 *  - M2: spawn monsters, drive auto-attack + ability, contact damage
 *  - M2: tick XP gems, level-up cascade, death transition
 *  - Render tile grid, player, monsters, gems, HUD
 *  - Return to hub on Escape (or after death)
 */

import { setCameraPos, vec2 } from 'littlejsengine';
import { createInput } from '../engine/input.js';
import { createCamera, updateCamera } from '../engine/camera.js';
import { createPlayer, updatePlayer, takeDamage, FALL_DAMAGE_THRESHOLD } from '../engine/player.js';
import { createTileGrid, getTile, TILE_SIZE, TILE_SOLID, TILE_LADDER } from '../engine/tiles.js';
import { calculateFallDamage } from '../engine/damage.js';
import { drawHud, drawCombatHud } from '../ui/hud.js';
import { createMonster } from '../engine/monster.js';
import { createXpGem } from '../engine/pickup.js';
import { applyHit, resolveShape } from '../engine/combat.js';
import { triggerDeath } from '../engine/death.js';
import { resolveEvolutionTier1, resolveEvolutionTier2, applyLoadout } from '../engine/build.js';
import { ELEMENTS } from '../engine/elements.js';

// Seeded RNG factory — deterministic for tests; non-deterministic in prod.
function makeRng(seed) {
  let s = seed ?? Math.floor(Math.random() * 1e9);
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export const dungeonScene = {
  name: 'dungeon',

  enter(ctx = {}) {
    const { dungeonId, rooms, weapons, monsters, abilities, passives, hubTransition, player } = ctx;
    const dungeon = dungeons.get(dungeonId);
    if (!dungeon) {
      console.warn(`[dungeon] no dungeon with id "${dungeonId}"`);
      this._active = null;
      return;
    }
    const roomId = dungeon.rooms[0];
    const room = rooms.get(roomId);
    if (!room) {
      console.warn(`[dungeon] dungeon "${dungeonId}" references missing room "${roomId}"`);
      this._active = null;
      return;
    }

    const grid = createTileGrid(room.tiles);

    this._input = createInput(globalThis);
    // Reuse an existing player if one is present (e.g. when a caller
    // mutates loadout state and re-enters to re-resolve). Otherwise
    // create a fresh player at the room spawn.
    this._player = player ?? this._player ?? createPlayer(room.spawn.x, room.spawn.y, this._input);
    this._player.input = this._input;
    this._player.x = room.spawn.x;
    this._player.y = room.spawn.y;
    this._camera = createCamera(this._player, { width: room.width, height: room.height });
    this._grid = grid;
    this._room = room;
    this._hubTransition = hubTransition;
    this._dungeonId = dungeonId;

    // M2: entity arrays + registries
    this._weapons = weapons || new Map();
    this._passives = passives || new Map();
    this._monsters = [];
    this._gems = [];
    this._projectiles = [];
    this._rng = makeRng();

    // Resolve the player's starting weapon (kampilan for M2)
    const weaponId = 'kampilan';
    const weapon = this._weapons.get(weaponId);
    if (weapon) {
      this._player.weapon.id = weaponId;
      this._player.weapon.template = weapon;
    }

    // M3: resolve the player's loadout (tier-1 evolution + passive bonuses)
    this._resolveLoadout();

    // Spawn monsters from room.monsterSpawns
    const monsterRegistry = monsters || new Map();
    for (const spawn of (room.monsterSpawns || [])) {
      const tpl = monsterRegistry.get(spawn.monsterId);
      if (!tpl) continue;
      for (let i = 0; i < spawn.count; i++) {
        this._monsters.push(createMonster(tpl, spawn.x, spawn.y));
      }
    }

    console.log(`[dungeon] enter: ${dungeonId} (room ${roomId})`);
  },

  exit() {
    console.log('[dungeon] exit');
    this._player = null;
    this._input = null;
    this._camera = null;
    this._grid = null;
    this._room = null;
    this._monsters = [];
    this._gems = [];
    this._projectiles = [];
  },

  update(dt) {
    if (!this._player) return;
    if (this._input.wasJustPressed('escape')) {
      this._hubTransition();
      return;
    }

    const p = this._player;
    const grid = this._grid;

    // Sample tile under player feet
    const footCol = Math.floor(p.x / TILE_SIZE);
    const footRow = Math.floor((p.y + 0.5) / TILE_SIZE);
    const footTile = getTile(grid, footCol, footRow);
    p.onLadder = footTile === TILE_LADDER;
    p.onGround = footTile === TILE_SOLID && p.vy >= 0;

    // Drive player
    updatePlayer(p, dt);

    // Re-sample after movement
    const newFootCol = Math.floor(p.x / TILE_SIZE);
    const newFootRow = Math.floor((p.y + 0.5) / TILE_SIZE);
    const newFootTile = getTile(grid, newFootCol, newFootRow);
    p.onLadder = newFootTile === TILE_LADDER;
    p.onGround = newFootTile === TILE_SOLID && p.vy >= 0;

    // Vertical collision resolution
    if (p.onGround) {
      p.y = newFootRow * TILE_SIZE;
      p.vy = 0;
    }

    // Fall damage
    if (p.fallDistance > FALL_DAMAGE_THRESHOLD && p.onGround) {
      takeDamage(p, calculateFallDamage(p.fallDistance));
      p.fallDistance = 0;
    }

    // M2: auto-attack
    if (p.weapon.template) {
      const w = p.weapon.template.autoAttack;
      const now = performance.now() / 1000;
      if (now - p.weapon.lastAttackTime >= w.tick) {
        const target = this._findNearestEnemy(p, w.range);
        if (target && resolveShape(p, target, w)) {
          const result = applyHit(target, w.damage, p, this._rng);
          console.log(`[combat] hit: ${target.id} for ${result.damage}${result.crit ? ' (CRIT!)' : ''}`);

          // M3: track per-weapon element damage and kills
          const weaponId = p.weapon.id;
          if (!p.evolutionState[weaponId]) {
            const zero = Object.fromEntries(ELEMENTS.map((e) => [e.id, 0]));
            p.evolutionState[weaponId] = { tier: p.weapon.template.tier || 0, kills: 0, elementDamage: zero };
          }
          const abilityElement = p.weapon.template.element;
          if (abilityElement) p.evolutionState[weaponId].elementDamage[abilityElement] += result.damage;
          if (result.killed) {
            p.evolutionState[weaponId].kills++;
            this._onMonsterKilled(target);
            // Tier-2 evolution
            const t2 = resolveEvolutionTier2(p.weapon.template, p.evolutionState[weaponId], this._weapons);
            if (t2) {
              console.log(`[evolution] ${p.weapon.id} → ${t2.id}`);
              p.weapon.template = t2;
              p.weapon.id = t2.id;
              p.evolutionState[weaponId].tier = t2.tier;
            }
          }
          p.weapon.lastAttackTime = now;
        }
      }
    }

    // M2: ability
    if (p.weapon.template && this._input.wasJustPressed('attack2')) {
      const abilityId = p.weapon.template.abilities[0];
      // ... (left as a follow-up; M2 ships auto-attack first)
    }

    // M2: tick monsters
    const world = { player: p, grid, monsters: this._monsters, gems: this._gems };
    for (const m of this._monsters) m.update(dt, world);

    // M2: contact damage
    for (const m of this._monsters) {
      const dist = Math.hypot(m.x - p.x, m.y - p.y);
      if (dist < m.contactRange) {
        takeDamage(p, m.damage * dt);
        // Tiny push-back
        p.vx += -p.facing * 2 * dt;
      }
    }

    // M2: tick gems
    for (const g of this._gems) g.update(dt, world);

    // M2: tick projectiles (placeholder; no spawns in M2)
    for (const proj of this._projectiles) proj.update(dt, world);

    // M2: clean up dead entities. We filter on `hp > 0` for monsters
    // (in addition to `alive`) so any path that zeroes hp without
    // flipping the flag — e.g. a future damage source that mutates hp
    // directly — still gets the monster removed.
    this._monsters = this._monsters.filter((m) => m.alive && m.hp > 0);
    this._gems = this._gems.filter((g) => g.alive);

    // M2: resolve death
    if (p.hp <= 0 && !p.isDead) {
      triggerDeath(p);
      console.log('[dungeon] player died');
      if (this._stateMachine) {
        this._stateMachine.transition('death', { dungeonId: this._dungeonId, player: p });
      }
      return;
    }

    // M2: resolve level-up
    if (p.pendingLevelUp) {
      if (this._stateMachine) {
        this._stateMachine.transition('levelup', { dungeonId: this._dungeonId, player: p });
      }
      return;
    }

    // Camera
    updateCamera(this._camera, p, dt);
    setCameraPos(vec2(this._camera.x, this._camera.y));
  },

  _findNearestEnemy(player, range) {
    let best = null;
    let bestDist = range;
    for (const m of this._monsters) {
      if (!m.alive) continue;
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d <= bestDist) { best = m; bestDist = d; }
    }
    return best;
  },

  _resolveLoadout() {
    const p = this._player;
    if (!p || !p.loadout) return;
    const weaponId = p.loadout.main?.weaponId;
    if (!weaponId) return;
    const baseWeapon = this._weapons.get(weaponId);
    if (!baseWeapon) return;

    // Tier-1 evolution (recipe-driven swap)
    const evolved = resolveEvolutionTier1(baseWeapon, p.loadout, this._weapons, this._passives);
    const active = evolved || baseWeapon;

    p.weapon.id = active.id;
    p.weapon.template = active;

    // Initialize per-weapon evolution state
    if (!p.evolutionState[weaponId]) {
      const zero = Object.fromEntries(ELEMENTS.map((e) => [e.id, 0]));
      p.evolutionState[weaponId] = {
        tier: active.tier || 0,
        kills: 0,
        elementDamage: zero,
      };
    }

    // Apply passive bonuses
    const { bonuses, effective } = applyLoadout(p, p.loadout, this._passives);
    p._loadoutBonuses = bonuses;
    p._effectiveStats = effective;
    p.attackPower = effective.attackPower;
  },

  _onMonsterKilled(monster) {
    const drops = monster.template.drops || [];
    for (const drop of drops) {
      console.log(`[pickup] spawn: xp gem +${drop.amount}`);
      if (drop.kind === 'xp' && Math.random() < (drop.chance ?? 1.0)) {
        this._gems.push(createXpGem(monster.x, monster.y, drop.amount));
      }
    }
    // Mark the entity dead so the per-frame cleanup filter drops it.
    // The auto-attack zeroes hp but the scene owns the entity lifecycle.
    monster.alive = false;
  },

  render(ctx) {
    if (!this._player || !this._grid) return;
    const grid = this._grid;
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const t = grid.rows[row][col];
        if (t === TILE_SOLID) {
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (t === TILE_LADDER) {
          ctx.fillStyle = '#8a6a3a';
          ctx.fillRect(col * TILE_SIZE + 0.3, row * TILE_SIZE, 0.4, TILE_SIZE);
        }
      }
    }
    // Player
    const p = this._player;
    ctx.fillStyle = '#f4c089';
    ctx.fillRect(p.x - 0.4, p.y - 0.8, 0.8, 0.8);
    // M2: monsters
    for (const m of this._monsters) m.render(ctx);
    // M2: gems
    for (const g of this._gems) g.render(ctx);
    // M2: projectiles
    for (const proj of this._projectiles) proj.render(ctx);
    // HUD is drawn in pixel space, so reset the world transform first
    // (otherwise a 1-pixel border renders as a whole tile thick).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawHud(ctx, p);
    drawCombatHud(ctx, p, this._room, p.weapon.template);
    ctx.restore();
  },
};

let dungeons = null;
export function setDungeons(db) { dungeons = db; }
