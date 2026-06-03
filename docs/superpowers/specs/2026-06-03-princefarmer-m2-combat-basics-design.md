# PrinceFarmer M2 — Combat Basics

**Date:** 2026-06-03
**Status:** Draft (post-brainstorm, pre-plan)
**Spec reference:** [`2026-06-03-princefarmer-design.md`](2026-06-03-princefarmer-design.md) (M2 row: *"1 weapon (sword) auto-attack, 1 ability, damage+elements, 1 monster (aswang) chase, XP gems+vacuum, level-up screen, HUD"*)
**M1 baseline:** [PR #1](https://github.com/anthonykewl20/princefarmer/pull/1) — Player physics, HUD, tile grid, dungeon scene, hub

## 1. Scope

M2 ships the first end-to-end combat loop on top of the M1 movement sandbox. The player picks up a kampilan, fights an aswang on a timer, collects XP gems, levels up, and dies-and-respawns via the hub. The full weapon roster, class system, ability pick UI, and boss monsters are deferred to M3+ per the design spec milestone table.

### In scope

- **1 weapon** — kampilan (curved single-edged sword), forward-arc auto-attack + 1 ability (lunging strike)
- **1 ability slot** — `attack2` bound to `KeyQ` / `ShiftLeft`
- **Damage system** — base damage + crit (deterministic via seeded RNG); element matchup table deferred to M5
- **1 monster** — aswang with **strafe + lunge** AI (circles mid-range, lunges for 15 dmg on a 1.5s cooldown)
- **XP system** — gems drop on kill, vacuum toward player within 2.5u, level-up cascade
- **Level-up scene** — flash + stat bump + full HP restore (no ability-pick UI; that's M4)
- **Death scene** — "YOU DIED" overlay, 1.5s, transition to hub with HP restore
- **Combat HUD** — single bottom strip (HP, XP, abilities), level/zone in top-right
- **Save bump** — v1 → v2: add `xp`, `level`, `weapon.id`, `attackPower`; auto-save on level-up

### Out of scope (deferred)

- Element matchup damage multipliers (M5)
- Multiple weapons / 2-slot system / ability pick UI (M4)
- Class system (M4)
- Boss monster (M3 — manananggal)
- Treasure chests, loot/material drops (M3 / M5)
- Sprite art for hero + monster (M2 ships placeholders; M2.1 or M3 swaps in PixelLab-generated PNGs)
- Sound / music (M6 — ZzFX)
- Camera zoom-out during combat (PoP feel) (M3+)

## 2. Decisions (locked during brainstorm)

| Topic | Decision |
|-------|----------|
| Level-up screen | Flash + stat bump only (no ability-pick UI) |
| Aswang AI | Strafe + lunge (circles mid-range, lunges 15 dmg on 1.5s cooldown) |
| Combat HUD | Single bottom bar (HP, XP, abilities); level/zone top-right |
| XP gem vacuum | 2.5u pickup radius + homing acceleration |
| Sword attack shape | Forward arc, 90°, 1.2u range, 0.6s tick, 20 dmg |
| Attack shape model | Per-weapon / per-skill property in JSON (sword=arc, tornado=360, spear=line, etc.) |
| Death flow | Brief "YOU DIED" overlay (~1.5s) → hub, full HP restore |
| M2 architecture | Scene-as-director (Approach 1) — flat entity list, scene ticks all; entity contract forward-compat with ECS for M5+ |
| Monster AI model | Plain functions in `src/engine/behaviors/` per spec §4.2 (no BT framework) |

## 3. Architecture

### 3.1 High-level

```
Content (JSON, Tiled)  →  Engine (code)  →  Game State Machine  →  Persistence (IndexedDB)
                                       ↑
                       Behaviors (small fns referenced by templates)
```

### 3.2 Scene-as-director

The dungeon scene owns a flat list of entities and ticks them each frame. Each entity exposes `update(dt, world)` and `render(ctx)`. The scene iterates and resolves collisions inline. This is the **M2** approach; we know it won't scale to M5's 30–100 enemies, so the entity contract is designed forward-compat: when M5 needs ECS, swapping the iteration loop doesn't require touching any entity code.

### 3.3 Entity contract (forward-compat with ECS in M5+)

```js
{
  x, y, vx, vy,
  update(dt, world) {},   // world = { player, grid, monsters, gems, projectiles }
  render(ctx) {},         // ctx is the canvas 2D context (in world units)
  // type-specific fields: hp, damage, behavior, kind, value, ...
}
```

### 3.4 File structure (new + modified)

```
src/engine/
├── combat.js            # NEW — applyHit, resolveShape (arc/line/circle/cone), crit
├── monster.js           # NEW — createMonster(template, x, y) + tickMonster
├── projectile.js        # NEW — createProjectile(weapon, fromX, fromY, dirX) (placeholder; M3+ uses)
├── pickup.js            # NEW — createXpGem(x, y, amount) + tickXpGem (vacuum + collect)
├── damage.js            # MODIFY — already exists; add crit
├── behaviors/           # NEW
│   ├── strafe-lunge.js  # aswang AI
│   └── index.js         # BEHAVIORS registry: name → fn
├── xpsystem.js          # NEW — xpForLevel, grantXp, checkLevelUp
├── levelup.js           # NEW — applyLevelUpRewards
└── death.js             # NEW — triggerDeath (logic; the scene is scenes/death.js)

src/scenes/
├── dungeon.js           # MODIFY — spawn monsters, drive combat loop, render entities
├── death.js             # NEW — "YOU DIED" overlay, 1.5s timer, then hub
├── levelup.js           # NEW — "LEVEL UP!" flash, apply rewards, then dungeon
└── hub.js               # MODIFY — restore HP on enter, handle "dungeon complete" return

data/
├── weapons.json         # NEW
├── monsters.json        # NEW
├── abilities.json       # NEW
└── behaviors.json       # NEW
  // boot adds these alongside rooms/dungeons in GameDB

tools/asset-gen/
├── prompts/
│   ├── monster.js       # NEW — aswang prompt (PixelLab)
│   └── weapon.js        # NEW — kampilan prompt (PixelLab)
└── manifest.json        # MODIFY — register monster + weapon assets

tests/
├── engine/{combat,monster,pickup,projectile,xpsystem,levelup,death,behaviors-strafe-lunge}.test.js
├── scenes/{death,levelup}.test.js
└── data/{weapons,monsters,abilities}.test.js
```

## 4. Data Model

### 4.1 Weapon template

```js
{
  id: 'kampilan',
  name: 'Kampilan',
  type: 'melee',                       // melee|ranged|magic|summon
  element: 'spirit',                   // fire|water|earth|air|lightning|spirit
  spriteRef: 'weapons/kampilan',       // M2: placeholder; PixelLab in M2.1
  autoAttack: {
    range: 1.2,                        // world units
    shape: 'arc',                      // arc|line|circle|cone (per weapon/skill)
    arc: Math.PI / 2,                  // 90° for the kampilan
    tick: 0.6,                         // seconds between auto-attacks
    damage: 20,
  },
  abilities: ['lunging-strike'],       // 1 in M2; M4 raises to 4
}
```

### 4.2 Ability template

```js
{
  id: 'lunging-strike',
  name: 'Lunging Strike',
  element: 'spirit',
  damage: 30,
  cooldown: 3.0,                       // seconds
  range: 2.0,                          // how far the lunge carries the player
  aoe: { shape: 'arc', arc: Math.PI / 2, radius: 1.0 },
  fxRef: 'fx/lunge',                   // optional vfx sprite ref
}
```

### 4.3 Monster template

```js
{
  id: 'aswang',
  name: 'Aswang',
  hp: 30,
  damage: 8,                            // per second of contact
  speed: 1.5,                           // world units per second
  contactRange: 0.6,
  behavior: 'strafe-lunge',             // refs behaviors.json → src/engine/behaviors/<id>.js
  drops: [{ kind: 'xp', amount: 5, chance: 1.0 }],   // M2: always drops XP
  spriteRef: 'monsters/aswang',
  tags: ['melee', 'fodder'],
}
```

### 4.4 Behaviors registry

```js
// src/engine/behaviors/index.js
import { strafeLunge } from './strafe-lunge.js';
export const BEHAVIORS = { 'strafe-lunge': strafeLunge };
```

```js
// data/behaviors.json
[{ "id": "strafe-lunge", "file": "strafe-lunge.js" }]
```

### 4.5 Room JSON — monster spawns

Existing M1 room JSON gains a top-level `monsterSpawns` array (currently empty):

```js
{
  "id": "01-stub-sandbox",
  // ... existing fields ...
  "monsterSpawns": [
    { "monsterId": "aswang", "x": 8, "y": 4, "count": 3 }
  ]
}
```

### 4.6 Save payload v2 (additions over v1)

```js
{
  version: 2,
  createdAt, updatedAt,
  player: {
    classId, level, xp, hp, maxHp,        // level, xp are NEW
    stats: { str, dex, int, vit },
    attackPower: 1,                       // NEW
    materials: { talon: 12, kris: 3 }
  },
  weapons: [
    { slot: 'main', id: 'kampilan', abilitiesPicked: ['lunging-strike'] }  // NEW shape
  ],
  passives: [],
  clearedDungeons: ['balete-grove'],
  settings: { musicVolume, sfxVolume, fullscreen }
}
```

`migration.js` v1 → v2: set `attackPower = 1`, `level = 1`, `xp = 0`, default `weapons[0] = { slot: 'main', id: 'kampilan', abilitiesPicked: [] }`.

## 5. Combat model

### 5.1 Damage formula

```
final = base * (1 + 0.1 * (atkLevel - defLevel)) * elementMultiplier * critMultiplier
```

- `atkLevel` / `defLevel` = 1 in M2 (no classes yet)
- `elementMultiplier` = 1.0 in M2; element matchup table (fire > earth, water > fire, …) is **deferred to M5**
- `critMultiplier` = 1.5 with 10% chance (deterministic via seeded RNG so tests are reproducible)
- `takeDamage(target, amount)` from M1 is reused unchanged

### 5.2 Hit shape resolution

`combat.js` exposes `resolveShape(attacker, target, shape) → boolean`:

| Shape | Test |
|-------|------|
| `arc` | `angleBetween(attacker→target, attacker.facing) ≤ arc/2` AND `dist ≤ radius` |
| `line` | `distToLine(attacker→target, attacker→end) ≤ thickness` AND `dist(attacker, target) ≤ range` |
| `circle` | `dist(attacker, target) ≤ radius` |
| `cone` | `angle ≤ arc/2` AND `dist ≤ radius` (alias for arc; reserved for future distinction) |

### 5.3 Auto-attack tick (in dungeon.js update, after player.update)

1. If `now - player.weapon.lastAttackTime >= weapon.autoAttack.tick`:
   - Find nearest enemy within `weapon.autoAttack.range` (Euclidean)
   - If found AND `resolveShape(player, enemy, weapon.autoAttack)` is true: `applyHit(enemy, weapon.autoAttack.damage, player)`; set `lastAttackTime = now`
2. If `wasJustPressed('attack2')` AND `now - lastAbilityTime >= ability.cooldown`:
   - Execute ability (lunge motion: `player.vx = facing * (range / 0.2)` for 0.2s; hit all monsters in `aoe` → `applyHit`)
   - Set `lastAbilityTime = now`

### 5.4 Contact damage

For each monster within its `contactRange` of the player, deal `monster.damage * dt` (continuous, not per-frame). Apply a tiny push-back: `player.vx += -facing * 2 * dt` for 0.1s. This gives the player some recovery window without being a hard stagger.

### 5.5 Player weapon state (added to Player in M2)

```js
player.weapon = {
  id: 'kampilan',
  template: <weaponTemplate>,         // resolved from GameDB at spawn
  lastAttackTime: 0,
  lastAbilityTime: 0,
  attackPower: 1,                     // mirrors SaveManager field
}
```

### 5.6 New input binding

```js
// src/engine/input.js
attack2: ['KeyQ', 'ShiftLeft'],       // ability slot
```

## 6. Monster & pickup loop

### 6.1 Aswang AI (strafe + lunge)

```js
// src/engine/behaviors/strafe-lunge.js
export function strafeLunge(monster, dt, world) {
  const dx = world.player.x - monster.x;
  const dy = world.player.y - monster.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 3.0) {
    // Walk toward player
    monster.action = 'strafe';
    monster.vx = (dx / dist) * monster.speed;
    monster.vy = (dy / dist) * monster.speed;
  } else if (dist > 1.5) {
    // Strafe perpendicular to the player vector. Sign alternates each
    // frame (via monster.strafeSign, which is initialized to +1 and
    // flipped in monster.js) so the aswang orbits instead of drifting
    // in one direction.
    monster.action = 'strafe';
    const perpX = -dy / dist;
    const perpY = dx / dist;
    monster.vx = perpX * monster.strafeSign * monster.speed * 0.7;
    monster.vy = perpY * monster.strafeSign * monster.speed * 0.7;
  } else if (dist <= 1.5) {
    // In lunge range — if cooldown elapsed, lunge; else idle
    if (monster.lungeTimer <= 0) {
      monster.action = 'lunge';
      monster.vx = (dx / dist) * monster.speed * 2.0;     // 3.0 u/s
      monster.vy = (dy / dist) * monster.speed * 2.0;
      monster.lungeTimer = 1.5;                           // 1.5s cooldown
    } else {
      monster.action = 'idle';
      monster.vx = 0;
      monster.vy = 0;
    }
  }
  monster.lungeTimer = Math.max(0, monster.lungeTimer - dt);
  monster.facing = Math.sign(dx) || monster.facing;
  // Flip strafe sign after every strafe tick so the aswang orbits
  // (alternating left/right perpendicular) instead of drifting one way.
  if (monster.action === 'strafe') monster.strafeSign *= -1;
}
```

### 6.2 Pickup (XP gem) update

```js
// src/engine/pickup.js — tickXpGem
const dx = player.x - gem.x;
const dy = player.y - gem.y;
const dist = Math.hypot(dx, dy);

if (dist < 2.5 && dist > 0.001) {
  // Homing acceleration
  gem.vx += (dx / dist) * 25 * dt;
  gem.vy += (dy / dist) * 25 * dt;
}
integrate(gem, dt);

if (dist < 0.3) {
  player.xp += gem.amount;
  checkLevelUp(player);
  gem.alive = false;
}
```

### 6.3 Dungeon scene update order (after player update)

1. Tick all monsters → `monster.update(dt, { player, grid, monsters, gems })`
2. Apply monster contact damage to player (continuous)
3. Tick all gems → `gem.update(dt, { player })`
4. Tick all projectiles → (M2 has 0; placeholder for M3+ ranged weapons)
5. Remove dead entities (`alive === false`) from their arrays
6. Resolve death: if `player.isDead`, transition to `death` scene
7. Resolve level-up: if `player.pendingLevelUp`, transition to `levelup` scene
8. Camera + render

## 7. Death & level-up

### 7.1 Death scene

`src/scenes/death.js`:

```js
export const deathScene = {
  name: 'death',
  enter(ctx) {
    this._timer = 0;
    this._returnTo = ctx.returnTo || 'hub';
    this._dungeonId = ctx.dungeonId;
  },
  update(dt) {
    this._timer += dt;
    if (this._timer >= 1.5) {
      this._stateMachine.transition(this._returnTo, { dungeonId: this._dungeonId });
    }
  },
  render(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU DIED', ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.fillStyle = '#888';
    ctx.font = '20px monospace';
    ctx.fillText('Returning to hub...', ctx.canvas.width / 2, ctx.canvas.height / 2 + 48);
  },
};
```

### 7.2 Hub HP restore

`src/scenes/hub.js` `enter()`:

```js
if (this._player) {
  this._player.hp = MAX_HP;
  this._player.pendingLevelUp = false;
}
```

### 7.3 Level-up scene

`src/scenes/levelup.js`:

```js
export const levelupScene = {
  name: 'levelup',
  enter(ctx) {
    this._timer = 0;
    this._dungeonId = ctx.dungeonId;
    this._player = ctx.player;          // live ref; will mutate in exit()
  },
  update(dt) {
    this._timer += dt;
    if (this._timer >= 1.0) {
      this._stateMachine.transition('dungeon', { dungeonId: this._dungeonId, player: this._player });
    }
  },
  exit() {
    applyLevelUpRewards(this._player);
    this._player.pendingLevelUp = false;
    SaveManager.save(this._player);
  },
  render(ctx) {
    // Same overlay shape as death scene but green text: "LEVEL UP!"
  },
};
```

### 7.4 Level-up rewards

```js
// src/engine/levelup.js
export function applyLevelUpRewards(player) {
  player.level++;
  player.maxHp += 5;
  player.hp = player.maxHp;        // full heal on level-up
  player.attackPower += 1;          // +1 to all damage rolls
}
```

### 7.5 XP system

```js
// src/engine/xpsystem.js
export function xpForLevel(level) {
  return 10 + (level - 1) * 5;     // 10, 15, 20, 25, ...
}
export function grantXp(player, amount) {
  player.xp += amount;
  while (player.xp >= xpForLevel(player.level + 1)) {
    player.xp -= xpForLevel(player.level + 1);
    player.level++;
    player.pendingLevelUp = true;     // consumed by the dungeon scene
  }
}
```

## 8. Combat HUD (single bottom bar)

```
+----------------------------------+
|                          LVL 3   |
|                       Balete Grove|
|                                  |
|         [game world]             |
|                                  |
|                                  |
+----------------------------------+
| [████████ HP] | [███ XP] | [⚔][2.3s] |
+----------------------------------+
```

Layout (per the visual companion mockup, option C):

- **Top-right:** Level + zone/room name
- **Bottom strip (full width, ~54px):** HP bar (flex 1) | XP bar (flex 1, smaller) | ability icons (right-aligned)
- HP bar shows `HP current/max` in white text overlay
- XP bar shows `XP current/nextLevel` in white text overlay
- Ability icons: outlined box + icon character; cooldown overlays with `Ns` countdown

Implementation: extend `src/ui/hud.js` with `drawCombatHud(ctx, player, weapon, ability)`. Keep the existing `drawHud` (HP-only) for backwards compat in case M1 tests still call it.

## 9. Save system

- **Trigger:** auto-save at the start of each dungeon (M1, unchanged) **AND** after each level-up (M2 new)
- **Version:** 1 → 2; `migration.js` handles the bump
- **Payload additions:** `player.level`, `player.xp`, `player.attackPower`, `weapons[0] = { slot: 'main', id, abilitiesPicked }`
- **Backward compat:** v1 saves migrate forward without data loss

## 10. Asset pipeline (PixelLab.ai)

- New prompts: `tools/asset-gen/prompts/monster.js` (aswang), `tools/asset-gen/prompts/weapon.js` (kampilan)
- New manifest entries: `monsters/aswang/{idle,strafe,lunge}/0..N`, `weapons/kampilan/{idle,swing}/0..N`
- M2 ships placeholders (filled rects); asset generation is **deferred to a follow-up** (M2.1 or M3). The prompts and manifest entries are present so the work is scaffolded, but `npm run gen-assets` is not part of M2 acceptance.

## 11. Testing

### 11.1 Unit (vitest)

- `combat.test.js` — `resolveShape` for arc/line/circle/cone; `applyHit` with crit; cooldown gating
- `monster.test.js` — `createMonster` initializes fields; behavior tick (mocked world); contact damage applies at right rate
- `pickup.test.js` — gem in pickup radius accelerates; on contact → +xp, removed
- `behaviors-strafe-lunge.test.js` — deterministic with seeded RNG; strafe keeps distance, lunge triggers after cooldown
- `xpsystem.test.js` — `xpForLevel` formula; level-up triggers at threshold; multiple levels cascade; `grantXp` from gem collection
- `levelup.test.js` — `applyLevelUpRewards` sets maxHp/hp/attackPower
- `death.test.js` — `triggerDeath` marks player dead; death scene timer transitions to hub at 1.5s
- `weapons/monsters/abilities.json` validators — required fields, all id refs resolve, all sprite refs are either "pending" or point to existing files

### 11.2 E2E (Playwright)

Extend or replace `tests/e2e/movement.spec.js` with `tests/e2e/combat.spec.js`:

1. Boot → title → hub → dungeon
2. Spawn deterministic scenario: place 1 aswang at `(5, 1)` with `hp = 1` for the kill test
3. Wait 1.5s for first auto-attack to fire (player is at default spawn, aswang in range)
4. Verify console contains `[combat] hit: aswang for 20` log
5. Take contact damage, observe HP drop in HUD pixel-state snapshot
6. Kill the aswang (aswang has `hp = 1`); verify `[pickup] spawn: xp gem +5` log
7. Walk to gem, verify `[pickup] collected: +5 xp` log
8. Hold still to die (set hp=10 via test hook), verify `[dungeon] player died` log + `[death] enter` + `[scene] enter: hub` within 2s
9. Re-enter dungeon, verify HP restored to MAX_HP

## 12. Risks

1. **Combat feel tuning.** Auto-attack range, tick, and damage are all interdependent; a bad combo makes combat boring or unfair. **Mitigation:** all three are tunable in `weapons.json`; the M2.1 polish pass is dedicated to feel iteration.
2. **Entity growth.** The scene-as-director loop is O(n) per frame for n monsters. M2 has 3 aswangs; M3 adds 5-10 per room; M5 wants 30-100 on screen. **Mitigation:** entity contract is forward-compat with ECS; M5 can swap iteration without rewriting entities.
3. **Save corruption on death during level-up transition.** Race between levelup.exit() saving and dungeon.update() writing to player. **Mitigation:** save only on levelup.exit() (after rewards applied) and at dungeon.enter() (before any new writes).
4. **Hero sprite missing.** M2 ships placeholder rects for hero and monster. M2 polish (or M3) swaps in PixelLab-generated PNGs.
