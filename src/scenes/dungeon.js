/**
 * Dungeon scene.
 *
 * For M1, this is a single-room movement sandbox. The active room is
 * picked from the GameDB by `dungeonId` (passed in via enter()).
 *
 * Responsibilities:
 *  - Load the room, build the tile grid, spawn the player
 *  - Drive player input + physics
 *  - Tile-collision (LittleJS's tileCollisionTest for ground/climb)
 *  - Camera follow
 *  - Fall damage on landing
 *  - Render the tile grid and the player sprite
 *  - Return to hub on Escape
 */

import { setCameraPos, vec2 } from 'littlejsengine';
import { createInput } from '../engine/input.js';
import { createCamera, updateCamera } from '../engine/camera.js';
import { createPlayer, updatePlayer, takeDamage, FALL_DAMAGE_THRESHOLD } from '../engine/player.js';
import { createTileGrid, getTile, TILE_SIZE, TILE_SOLID, TILE_LADDER } from '../engine/tiles.js';
import { calculateFallDamage } from '../engine/damage.js';
import { drawHud } from '../ui/hud.js';

export const dungeonScene = {
  name: 'dungeon',

  /** Called by StateMachine.transition('dungeon', { dungeonId }) */
  enter(ctx = {}) {
    const { dungeonId, rooms, hubTransition } = ctx;
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

    // Build tile grid
    const grid = createTileGrid(room.tiles);

    // Build the level as a tilemap. Each tile is rendered at world coords
    // (col * TILE_SIZE, row * TILE_SIZE) with a type code we can look up
    // via tileCollisionTest.
    // (M1 just stores the grid; the level rendering is a follow-up.)

    // Spawn player
    this._input = createInput(globalThis);
    this._player = createPlayer(room.spawn.x, room.spawn.y, this._input);
    this._camera = createCamera(this._player, { width: room.width, height: room.height });
    this._grid = grid;
    this._room = room;
    this._hubTransition = hubTransition;

    console.log(`[dungeon] enter: ${dungeonId} (room ${roomId})`);
  },

  exit() {
    console.log('[dungeon] exit');
    this._player = null;
    this._input = null;
    this._camera = null;
    this._grid = null;
    this._room = null;
  },

  update(dt) {
    if (!this._player) return;
    if (this._input.wasJustPressed('escape')) {
      this._hubTransition();
      return;
    }

    const p = this._player;
    const grid = this._grid;

    // Sample tile under player feet (for onGround + onLadder).
    // onGround is only set when the player is falling or stationary
    // (vy >= 0) — otherwise the very frame the player jumps, the
    // post-movement snap would zero out their upward velocity.
    const footCol = Math.floor(p.x / TILE_SIZE);
    const footRow = Math.floor((p.y + 0.5) / TILE_SIZE);
    const footTile = getTile(grid, footCol, footRow);
    p.onLadder = footTile === TILE_LADDER;
    p.onGround = footTile === TILE_SOLID && p.vy >= 0;

    // Drive player
    updatePlayer(p, dt);

    // Re-sample after movement. Same vy >= 0 guard as above: a player
    // moving upward through a tile below their feet is NOT onGround.
    const newFootCol = Math.floor(p.x / TILE_SIZE);
    const newFootRow = Math.floor((p.y + 0.5) / TILE_SIZE);
    const newFootTile = getTile(grid, newFootCol, newFootRow);
    p.onLadder = newFootTile === TILE_LADDER;
    p.onGround = newFootTile === TILE_SOLID && p.vy >= 0;

    // Resolve vertical collision on landing: snap the player's bottom to the
    // top of the solid tile and zero out vertical velocity so the player
    // doesn't sink into or fall through solid ground.
    if (p.onGround) {
      p.y = newFootRow * TILE_SIZE;
      p.vy = 0;
    }

    // Fall damage on landing
    if (p.fallDistance > FALL_DAMAGE_THRESHOLD && p.onGround) {
      const dmg = calculateFallDamage(p.fallDistance);
      takeDamage(p, dmg);
      p.fallDistance = 0;
      if (p.isDead) {
        console.log('[dungeon] player died from fall');
      }
    }

    // Camera
    updateCamera(this._camera, p, dt);
    setCameraPos(vec2(this._camera.x, this._camera.y));
  },

  /** Called by main.js each frame after the engine clears. Renders the scene. */
  render(ctx) {
    if (!this._player || !this._grid) return;
    const grid = this._grid;
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const t = grid.rows[row][col];
        if (t === TILE_SOLID) {
          // For M1, solid tiles are drawn as plain dark rectangles.
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
    // HUD is drawn in pixel space, so reset the world transform first
    // (otherwise a 1-pixel border renders as a whole tile thick).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawHud(ctx, p);
    ctx.restore();
  },
};

// Closure-scoped reference to the dungeons db — set by main.js at boot.
let dungeons = null;

/** Called by main.js at boot to inject the dungeons db. */
export function setDungeons(db) { dungeons = db; }
