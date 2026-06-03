# PrinceFarmer M2 — Combat Basics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first end-to-end combat loop — kampilan auto-attack + 1 ability, aswang enemy (strafe-lunge AI), XP gem vacuum, level-up cascade, death scene, single-bottom-bar combat HUD, and a save-version bump (v1 → v2).

**Architecture:** Scene-as-director. The dungeon scene owns a flat list of entities (player, monsters, gems) and ticks them each frame. Each entity exposes `update(dt, world)` and `render(ctx)`. The contract is forward-compat with ECS for M5+ scaling to 30–100 enemies.

**Tech Stack:** LittleJS v1.18.17, Vite 5, vitest (unit), Playwright (E2E), IndexedDB via existing SaveManager, data-driven JSON templates loaded by GameDB via `import.meta.glob`.

**Spec:** `docs/superpowers/specs/2026-06-03-princefarmer-m2-combat-basics-design.md` (528 lines, 12 sections).

**M1 baseline:** Player physics, HUD, tile grid, dungeon scene, hub scene, save manager, indexed tests (80 unit + 3 E2E passing on `main`).

---

## File Structure (created or modified in this plan)

### New files

```
src/engine/combat.js                  # applyHit, resolveShape (arc/line/circle/cone)
src/engine/monster.js                 # createMonster + tickMonster
src/engine/projectile.js              # createProjectile (placeholder API; M3+ uses)
src/engine/pickup.js                  # createXpGem + tickXpGem
src/engine/xpsystem.js                # xpForLevel, grantXp, checkLevelUp
src/engine/levelup.js                 # applyLevelUpRewards
src/engine/death.js                   # triggerDeath
src/engine/behaviors/strafe-lunge.js  # aswang AI
src/engine/behaviors/index.js         # BEHAVIORS registry

src/scenes/death.js                   # "YOU DIED" overlay
src/scenes/levelup.js                 # "LEVEL UP!" flash

data/weapons.json                     # kampilan template
data/monsters.json                    # aswang template
data/abilities.json                   # lunging-strike template
data/behaviors.json                   # behavior registry

tools/asset-gen/prompts/monster.js    # aswang PixelLab prompt
tools/asset-gen/prompts/weapon.js     # kampilan PixelLab prompt

tests/engine/combat.test.js
tests/engine/monster.test.js
tests/engine/pickup.test.js
tests/engine/xpsystem.test.js
tests/engine/levelup.test.js
tests/engine/death.test.js
tests/engine/behaviors-strafe-lunge.test.js
tests/scenes/death.test.js
tests/scenes/levelup.test.js
tests/data/weapons.test.js
tests/data/monsters.test.js
tests/data/abilities.test.js
tests/e2e/combat.spec.js
```

### Modified files

```
src/engine/input.js                   # add `attack2` binding
src/engine/player.js                  # add weapon state, attackPower, xp/level, pendingLevelUp
src/engine/damage.js                  # add crit via seeded RNG
src/scenes/dungeon.js                 # spawn monsters, drive combat, render entities, transitions
src/scenes/hub.js                     # restore HP on enter
src/ui/hud.js                         # add drawCombatHud
src/persistence/save.js               # accept v2 payload (xp, level, attackPower, weapons[])
src/persistence/migration.js          # v1 → v2 migration
src/main.js                           # register new scenes; load new data files into GameDB
src/engine/gamedb.js                  # loadRooms/loadDungeons already exist; add weapons/monsters/abilities
data/rooms/01-stub-sandbox.json       # add monsterSpawns
tools/asset-gen/manifest.json         # register monster + weapon assets
```

### Boundaries

- `combat.js` is **pure functions only** — no game state, no entity references; takes a hit request and returns a result.
- `monster.js`, `pickup.js`, `projectile.js` are **entity factories + tick helpers** — each entity owns its own state.
- `behaviors/*` are **pure functions** that read/write a single monster's state.
- `xpsystem.js`, `levelup.js`, `death.js` are **pure functions** that mutate a player object.
- The dungeon scene is the **only** place that owns the entity arrays and ticks them.
- The death and levelup scenes are **leaf scenes** — they only know how to render their overlay and trigger their transition.

---

## Task 1: Extend `damage.js` with crit

**Files:**
- Modify: `src/engine/damage.js`
- Test: `tests/engine/damage.test.js` (existing)

M1's `damage.js` only handles fall damage. Add a generic `applyDamageWithCrit` that takes a base damage and a seeded RNG, rolls a 10% crit, and returns the final amount (1.5x on crit).

- [ ] **Step 1: Write the failing test**

Append to `tests/engine/damage.test.js`:

```js
import { applyDamageWithCrit } from '../../src/engine/damage.js';

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
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/damage.test.js`
Expected: FAIL — `applyDamageWithCrit is not a function`

- [ ] **Step 3: Implement `applyDamageWithCrit`**

In `src/engine/damage.js`, append:

```js
/**
 * Apply a base damage roll, possibly with a 1.5x crit.
 * Crit chance: 10% (rng() < 0.1).
 * @param {number} base
 * @param {() => number} rng - seeded RNG returning [0, 1)
 * @returns {number} final damage (integer)
 */
export function applyDamageWithCrit(base, rng) {
  const isCrit = rng() < 0.1;
  return Math.floor(base * (isCrit ? 1.5 : 1));
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/damage.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/damage.js tests/engine/damage.test.js
git commit -m "feat(damage): add crit roll via seeded RNG (M2)"
```

---

## Task 2: Create `combat.js` with `applyHit` and `resolveShape`

**Files:**
- Create: `src/engine/combat.js`
- Test: `tests/engine/combat.test.js`

Pure functions. `resolveShape` is the heart of per-weapon hit detection (arc / line / circle / cone). `applyHit` rolls a crit, applies the result via `takeDamage` from `damage.js`, and returns a result object the scene can log.

- [ ] **Step 1: Write the failing test**

Create `tests/engine/combat.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { resolveShape, applyHit } from '../../src/engine/combat.js';

describe('resolveShape', () => {
  const player = { x: 0, y: 0, facing: 1 }; // facing right (+x)

  it('arc: target in front of attacker within radius hits', () => {
    const target = { x: 1, y: 0.1 };
    expect(resolveShape(player, target, { shape: 'arc', arc: Math.PI / 2, radius: 1.2 })).toBe(true);
  });

  it('arc: target behind attacker misses', () => {
    const target = { x: -1, y: 0.1 };
    expect(resolveShape(player, target, { shape: 'arc', arc: Math.PI / 2, radius: 1.2 })).toBe(false);
  });

  it('arc: target outside radius misses', () => {
    const target = { x: 5, y: 0.1 };
    expect(resolveShape(player, target, { shape: 'arc', arc: Math.PI / 2, radius: 1.2 })).toBe(false);
  });

  it('circle: hits in any direction within radius', () => {
    expect(resolveShape(player, { x: -1, y: 0 }, { shape: 'circle', radius: 1.5 })).toBe(true);
    expect(resolveShape(player, { x: 0, y: 1 }, { shape: 'circle', radius: 1.5 })).toBe(true);
  });

  it('circle: misses outside radius', () => {
    expect(resolveShape(player, { x: 5, y: 0 }, { shape: 'circle', radius: 1.5 })).toBe(false);
  });

  it('line: target on the line within range hits', () => {
    const target = { x: 1, y: 0.05 };
    expect(resolveShape(player, target, { shape: 'line', range: 2.0, thickness: 0.1 })).toBe(true);
  });

  it('line: target far from line misses', () => {
    const target = { x: 1, y: 1.0 };
    expect(resolveShape(player, target, { shape: 'line', range: 2.0, thickness: 0.1 })).toBe(false);
  });
});

describe('applyHit', () => {
  it('deals base damage on a non-crit, marks the hit, returns result', () => {
    const target = { hp: 30, maxHp: 30, isDead: false };
    const attacker = { attackPower: 1 };
    const rng = () => 0.5; // non-crit
    const result = applyHit(target, 20, attacker, rng);
    expect(result.damage).toBe(20);
    expect(result.crit).toBe(false);
    expect(target.hp).toBe(10);
  });

  it('deals 1.5x on a crit and reports crit: true', () => {
    const target = { hp: 30, maxHp: 30, isDead: false };
    const attacker = { attackPower: 1 };
    const rng = () => 0.05; // crit
    const result = applyHit(target, 20, attacker, rng);
    expect(result.damage).toBe(30);
    expect(result.crit).toBe(true);
    expect(target.hp).toBe(0);
    expect(target.isDead).toBe(true);
  });

  it('clamps target HP to 0 (does not go negative)', () => {
    const target = { hp: 5, maxHp: 100, isDead: false };
    const rng = () => 0.5;
    applyHit(target, 20, { attackPower: 1 }, rng);
    expect(target.hp).toBe(0);
    expect(target.isDead).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/combat.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `combat.js`**

Create `src/engine/combat.js`:

```js
/**
 * Combat — pure functions for hit resolution and shape-based collision.
 *
 * All hit detection in the game flows through `resolveShape` so the per-
 * weapon hit shape (arc, line, circle, cone) is a property of the JSON
 * template, not a hard-coded check in the scene.
 */

import { applyDamageWithCrit } from './damage.js';

/**
 * Check whether a target is inside an attacker's hit shape.
 * @param {{x:number,y:number,facing:number}} attacker
 * @param {{x:number,y:number}} target
 * @param {{shape:string,arc?:number,radius?:number,range?:number,thickness?:number}} shape
 * @returns {boolean}
 */
export function resolveShape(attacker, target, shape) {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const dist = Math.hypot(dx, dy);

  if (shape.shape === 'arc' || shape.shape === 'cone') {
    if (dist > (shape.radius ?? Infinity)) return false;
    // facing: 1 = right (+x), -1 = left (-x)
    const facingX = attacker.facing;
    const facingY = 0;
    // angle between (facing) and (attacker→target)
    const cos = (dx * facingX + dy * facingY) / (dist || 1);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
    return angle <= (shape.arc ?? Math.PI) / 2;
  }

  if (shape.shape === 'circle') {
    return dist <= (shape.radius ?? Infinity);
  }

  if (shape.shape === 'line') {
    if (dist > (shape.range ?? Infinity)) return false;
    // distance from the line (attacker → (attacker.x + facing*range, attacker.y))
    // The line is horizontal here (y stays at attacker.y). thickness is the
    // half-width of the line hitbox.
    return Math.abs(dy) <= (shape.thickness ?? 0.1);
  }

  return false;
}

/**
 * Apply a hit to a target with crit rolled by the supplied RNG.
 * @param {{hp:number,maxHp:number,isDead?:boolean}} target
 * @param {number} baseDamage
 * @param {{attackPower:number}} attacker
 * @param {() => number} rng - seeded RNG returning [0, 1)
 * @returns {{damage:number, crit:boolean, killed:boolean}}
 */
export function applyHit(target, baseDamage, attacker, rng) {
  const damage = applyDamageWithCrit(baseDamage, rng);
  target.hp = Math.max(0, target.hp - damage);
  const killed = target.hp === 0;
  if (killed) target.isDead = true;
  return { damage, crit: damage > baseDamage, killed };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/combat.test.js`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/combat.js tests/engine/combat.test.js
git commit -m "feat(combat): add applyHit + resolveShape (arc/line/circle/cone) (M2)"
```

---

## Task 3: Add `attack2` input binding

**Files:**
- Modify: `src/engine/input.js`
- Test: `tests/engine/input.test.js` (existing)

The new `attack2` action maps to `KeyQ` and `ShiftLeft`. The existing test that maps `KEY_BINDINGS` keys should grow to include this.

- [ ] **Step 1: Update the failing test**

In `tests/engine/input.test.js`, update the `KEY_BINDINGS` test to include the new action:

```js
describe('KEY_BINDINGS', () => {
  it('maps semantic actions to a list of acceptable key codes', () => {
    expect(KEY_BINDINGS.left).toEqual(expect.arrayContaining(['ArrowLeft', 'KeyA']));
    expect(KEY_BINDINGS.right).toEqual(expect.arrayContaining(['ArrowRight', 'KeyD']));
    expect(KEY_BINDINGS.jump).toEqual(expect.arrayContaining(['Space']));
    expect(KEY_BINDINGS.up).toEqual(expect.arrayContaining(['ArrowUp', 'KeyW']));
    expect(KEY_BINDINGS.down).toEqual(expect.arrayContaining(['ArrowDown', 'KeyS']));
    expect(KEY_BINDINGS.escape).toEqual(expect.arrayContaining(['Escape']));
    expect(KEY_BINDINGS.interact).toEqual(expect.arrayContaining(['KeyE', 'Enter']));
    expect(KEY_BINDINGS.attack2).toEqual(expect.arrayContaining(['KeyQ', 'ShiftLeft']));
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/input.test.js`
Expected: FAIL — `attack2` not in KEY_BINDINGS

- [ ] **Step 3: Add the binding**

In `src/engine/input.js`, add to the `KEY_BINDINGS` object:

```js
export const KEY_BINDINGS = {
  left:    ['ArrowLeft', 'KeyA'],
  right:   ['ArrowRight', 'KeyD'],
  up:      ['ArrowUp', 'KeyW'],
  down:    ['ArrowDown', 'KeyS'],
  jump:    ['Space'],
  escape:  ['Escape'],
  interact: ['KeyE', 'Enter'],
  attack2: ['KeyQ', 'ShiftLeft'],
};
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/input.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/input.js tests/engine/input.test.js
git commit -m "feat(input): add attack2 binding (KeyQ / ShiftLeft) (M2)"
```

---

## Task 4: Create `xpsystem.js` (xpForLevel + grantXp)

**Files:**
- Create: `src/engine/xpsystem.js`
- Test: `tests/engine/xpsystem.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/engine/xpsystem.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { xpForLevel, grantXp } from '../../src/engine/xpsystem.js';

describe('xpForLevel', () => {
  it('returns 10 for level 1', () => {
    expect(xpForLevel(1)).toBe(10);
  });

  it('returns 15 for level 2, 20 for level 3, etc.', () => {
    expect(xpForLevel(2)).toBe(15);
    expect(xpForLevel(3)).toBe(20);
    expect(xpForLevel(4)).toBe(25);
  });
});

describe('grantXp', () => {
  it('adds XP and triggers a level-up when threshold is crossed', () => {
    const player = { level: 1, xp: 0, pendingLevelUp: false };
    grantXp(player, 5);
    expect(player.xp).toBe(5);
    expect(player.level).toBe(1);
    grantXp(player, 5);
    expect(player.xp).toBe(0);
    expect(player.level).toBe(2);
    expect(player.pendingLevelUp).toBe(true);
  });

  it('cascades multiple level-ups from one big grant', () => {
    // L1→L2 needs 10, L2→L3 needs 15, L3→L4 needs 20 — total 45
    const player = { level: 1, xp: 0, pendingLevelUp: false };
    grantXp(player, 45);
    expect(player.level).toBe(4);
    expect(player.xp).toBe(0);
    expect(player.pendingLevelUp).toBe(true);
  });

  it('resets pendingLevelUp to false on each call (one flash per call)', () => {
    const player = { level: 1, xp: 0, pendingLevelUp: false };
    grantXp(player, 100);
    expect(player.pendingLevelUp).toBe(true);
    player.pendingLevelUp = false; // simulate the scene consuming it
    grantXp(player, 5); // sub-threshold — no level-up
    expect(player.pendingLevelUp).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/xpsystem.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `xpsystem.js`**

Create `src/engine/xpsystem.js`:

```js
/**
 * XP system — pure functions for level-up math.
 *
 * The dungeon scene calls `grantXp` whenever a gem is collected. If the
 * XP crosses a level threshold, the player levels up (potentially
 * multiple times in one call) and `pendingLevelUp` is set. The scene
 * checks this flag and transitions to the levelup scene.
 */

/**
 * XP required to reach the given level from level - 1.
 * Formula: 10 + (level - 1) * 5 → 10, 15, 20, 25, ...
 * @param {number} level
 * @returns {number}
 */
export function xpForLevel(level) {
  return 10 + (level - 1) * 5;
}

/**
 * Grant XP to a player. May trigger one or more level-ups in a single
 * call. Sets `player.pendingLevelUp = true` if any level-up occurred.
 * @param {{level:number, xp:number, pendingLevelUp:boolean}} player
 * @param {number} amount
 */
export function grantXp(player, amount) {
  player.xp += amount;
  let leveledUp = false;
  while (player.xp >= xpForLevel(player.level + 1)) {
    player.xp -= xpForLevel(player.level + 1);
    player.level++;
    leveledUp = true;
  }
  if (leveledUp) player.pendingLevelUp = true;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/xpsystem.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/xpsystem.js tests/engine/xpsystem.test.js
git commit -m "feat(xpsystem): add xpForLevel + grantXp with level cascade (M2)"
```

---

## Task 5: Create `levelup.js` (applyLevelUpRewards)

**Files:**
- Create: `src/engine/levelup.js`
- Test: `tests/engine/levelup.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/engine/levelup.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { applyLevelUpRewards } from '../../src/engine/levelup.js';

describe('applyLevelUpRewards', () => {
  it('increments level, maxHp, attackPower; restores HP to full', () => {
    const player = { level: 1, maxHp: 100, hp: 30, attackPower: 1 };
    applyLevelUpRewards(player);
    expect(player.level).toBe(2);
    expect(player.maxHp).toBe(105);
    expect(player.hp).toBe(105);
    expect(player.attackPower).toBe(2);
  });

  it('stacks: a 2nd call from level 2 → level 3', () => {
    const player = { level: 2, maxHp: 105, hp: 50, attackPower: 2 };
    applyLevelUpRewards(player);
    expect(player.level).toBe(3);
    expect(player.maxHp).toBe(110);
    expect(player.hp).toBe(110);
    expect(player.attackPower).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/levelup.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `levelup.js`**

Create `src/engine/levelup.js`:

```js
/**
 * Level-up rewards — applied by the levelup scene's exit() hook.
 *
 * M2 rewards: +1 level, +5 maxHp, full HP restore, +1 attackPower.
 * The full-heal-on-level-up rule comes from the design spec: a
 * level-up is a meaningful power spike, not a minor bump.
 */

/**
 * Apply level-up rewards to the player in place.
 * @param {{level:number, maxHp:number, hp:number, attackPower:number}} player
 */
export function applyLevelUpRewards(player) {
  player.level++;
  player.maxHp += 5;
  player.hp = player.maxHp;
  player.attackPower += 1;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/levelup.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/levelup.js tests/engine/levelup.test.js
git commit -m "feat(levelup): add applyLevelUpRewards (+maxHp, full heal, +attackPower) (M2)"
```

---

## Task 6: Create `death.js` (triggerDeath + isDead helpers)

**Files:**
- Create: `src/engine/death.js`
- Test: `tests/engine/death.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/engine/death.test.js`:

```js
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
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/death.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `death.js`**

Create `src/engine/death.js`:

```js
/**
 * Death — pure helpers for the death-to-hub flow.
 *
 * The dungeon scene calls `triggerDeath` when it observes the player at
 * 0 HP, then transitions to the death scene. `isDead` is a small
 * predicate the scene uses to gate input/movement.
 */

/**
 * Mark the player as dead.
 * @param {{hp:number, isDead?:boolean}} player
 */
export function triggerDeath(player) {
  player.hp = 0;
  player.isDead = true;
}

/** @returns {boolean} */
export function isDead(player) {
  return player.isDead === true;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/death.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/death.js tests/engine/death.test.js
git commit -m "feat(death): add triggerDeath + isDead helpers (M2)"
```

---

## Task 7: Create `monster.js` (createMonster + tickMonster)

**Files:**
- Create: `src/engine/monster.js`
- Test: `tests/engine/monster.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/engine/monster.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createMonster, tickMonster } from '../../src/engine/monster.js';

const ASWANG = {
  id: 'aswang',
  hp: 30,
  damage: 8,
  speed: 1.5,
  contactRange: 0.6,
  behavior: 'strafe-lunge',
  drops: [{ kind: 'xp', amount: 5, chance: 1.0 }],
};

describe('createMonster', () => {
  it('initializes all fields from the template', () => {
    const m = createMonster(ASWANG, 5, 5);
    expect(m.id).toBe('aswang');
    expect(m.hp).toBe(30);
    expect(m.maxHp).toBe(30);
    expect(m.damage).toBe(8);
    expect(m.speed).toBe(1.5);
    expect(m.contactRange).toBe(0.6);
    expect(m.x).toBe(5);
    expect(m.y).toBe(5);
    expect(m.action).toBe('idle');
    expect(m.strafeSign).toBe(1);
    expect(m.lungeTimer).toBe(0);
    expect(m.template).toBe(ASWANG);
    expect(typeof m.update).toBe('function');
    expect(typeof m.render).toBe('function');
  });
});

describe('tickMonster', () => {
  it('looks up the behavior in BEHAVIORS and invokes it; integrates motion', () => {
    const m = createMonster(ASWANG, 0, 0);
    const world = { player: { x: 10, y: 0 } };
    tickMonster(m, 0.1, world);
    // After tick: monster should have moved toward the player
    expect(m.x).toBeGreaterThan(0);
    expect(m.action).toBe('strafe'); // far away → walk
  });

  it('decrements lungeTimer', () => {
    const m = createMonster(ASWANG, 0, 0);
    m.lungeTimer = 1.0;
    tickMonster(m, 0.5, { player: { x: 10, y: 0 } });
    expect(m.lungeTimer).toBeCloseTo(0.5, 5);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/monster.test.js`
Expected: FAIL — module not found (also, BEHAVIORS isn't created yet; that's Task 8)

- [ ] **Step 3: Implement `monster.js`**

Create `src/engine/monster.js`:

```js
/**
 * Monster — entity factory + tick helper.
 *
 * M2 ships one monster (aswang). The factory returns a plain object
 * with the entity contract (x, y, vx, vy, update, render). The scene
 * owns the array of monsters and calls `tickMonster` for each.
 *
 * Monster AI is delegated to a behavior function registered in
 * `src/engine/behaviors/index.js`. The behavior reads the player and
 * world, writes the monster's vx/vy/action/lungeTimer/facing.
 *
 * After the behavior runs, `tickMonster` integrates motion and flips
 * `strafeSign` so orbital behaviors (e.g. strafe-lunge) alternate
 * direction each frame.
 */

import { integrate } from './physics.js';
import { BEHAVIORS } from './behaviors/index.js';

const FAKE_CTX = {
  fillStyle: '',
  fillRect: () => {},
};

/**
 * Create a monster entity.
 * @param {object} template - from data/monsters.json
 * @param {number} x
 * @param {number} y
 * @returns {object} monster entity
 */
export function createMonster(template, x, y) {
  return {
    id: template.id,
    x, y, vx: 0, vy: 0,
    hp: template.hp,
    maxHp: template.hp,
    damage: template.damage,
    speed: template.speed,
    contactRange: template.contactRange,
    action: 'idle',
    lungeTimer: 0,
    strafeSign: 1,
    facing: 1,
    template,
    alive: true,
    update(dt, world) { tickMonster(this, dt, world); },
    render(ctx) { drawMonster(this, ctx); },
  };
}

/**
 * Tick a monster: invoke its behavior, flip strafe sign, integrate.
 * @param {object} m
 * @param {number} dt
 * @param {{player:{x:number,y:number}, grid?:object, monsters?:object[], gems?:object[]}} world
 */
export function tickMonster(m, dt, world) {
  const fn = BEHAVIORS[m.template.behavior];
  if (fn) fn(m, dt, world);
  if (m.action === 'strafe') m.strafeSign *= -1;
  integrate(m, dt);
}

/**
 * Placeholder renderer — filled rect sized by contact range.
 * Replaced by PixelLab-generated sprite in M2.1.
 */
function drawMonster(m, ctx) {
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(m.x - 0.4, m.y - 0.4, 0.8, 0.8);
}
```

- [ ] **Step 4: Run the test, verify it will fail (BEHAVIORS not yet created)**

This test depends on Task 8. Mark this task as complete after Task 8 lands. For now, run the test — it will fail because `BEHAVIORS` doesn't exist.

- [ ] **Step 5: Commit (after Task 8 lands)**

```bash
git add src/engine/monster.js tests/engine/monster.test.js
git commit -m "feat(monster): add createMonster + tickMonster with behavior dispatch (M2)"
```

---

## Task 8: Create `behaviors/strafe-lunge.js` and `behaviors/index.js`

**Files:**
- Create: `src/engine/behaviors/strafe-lunge.js`
- Create: `src/engine/behaviors/index.js`
- Test: `tests/engine/behaviors-strafe-lunge.test.js`

This is the aswang AI: walk toward if far, strafe perpendicular if mid-range, lunge if in range and cooldown elapsed.

- [ ] **Step 1: Write the failing test**

Create `tests/engine/behaviors-strafe-lunge.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { strafeLunge } from '../../src/engine/behaviors/strafe-lunge.js';
import { createMonster } from '../../src/engine/monster.js';

const ASWANG = {
  id: 'aswang', hp: 30, damage: 8, speed: 1.5,
  contactRange: 0.6, behavior: 'strafe-lunge', drops: [],
};

describe('strafeLunge behavior', () => {
  it('walks toward the player when far (>3u)', () => {
    const m = createMonster(ASWANG, 0, 0);
    strafeLunge(m, 0.1, { player: { x: 10, y: 0 } });
    expect(m.action).toBe('strafe');
    expect(m.vx).toBeGreaterThan(0);
    expect(m.vy).toBeCloseTo(0, 5);
    expect(m.facing).toBe(1);
  });

  it('strafes perpendicular when at mid-range (1.5u < dist <= 3u)', () => {
    const m = createMonster(ASWANG, 0, 0);
    strafeLunge(m, 0.1, { player: { x: 2, y: 0 } });
    expect(m.action).toBe('strafe');
    // Perpendicular to (2,0) is (0, ±1) → vy non-zero
    expect(Math.abs(m.vy)).toBeGreaterThan(0);
  });

  it('lunges when in range and cooldown is ready', () => {
    const m = createMonster(ASWANG, 0, 0);
    strafeLunge(m, 0.1, { player: { x: 1, y: 0 } });
    expect(m.action).toBe('lunge');
    expect(m.lungeTimer).toBeCloseTo(1.5, 5);
    expect(m.vx).toBeGreaterThan(0);
  });

  it('idles when in range but cooldown is active', () => {
    const m = createMonster(ASWANG, 0, 0);
    m.lungeTimer = 1.0; // mid-cooldown
    strafeLunge(m, 0.1, { player: { x: 1, y: 0 } });
    expect(m.action).toBe('idle');
    expect(m.vx).toBe(0);
    expect(m.vy).toBe(0);
  });

  it('decrements lungeTimer each tick', () => {
    const m = createMonster(ASWANG, 0, 0);
    m.lungeTimer = 0.5;
    strafeLunge(m, 0.1, { player: { x: 10, y: 0 } });
    expect(m.lungeTimer).toBeCloseTo(0.4, 5);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/behaviors-strafe-lunge.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `strafe-lunge.js`**

Create `src/engine/behaviors/strafe-lunge.js`:

```js
/**
 * Aswang AI: strafe + lunge.
 *
 * Per the M2 design:
 *   dist > 3.0       → walk toward the player
 *   1.5 < dist ≤ 3.0 → strafe perpendicular (alternates sign each tick)
 *   dist ≤ 1.5       → lunge if cooldown ready, else idle
 *
 * Lunge: 3.0 u/s for the duration of the tick, 1.5s cooldown.
 * Strafe: 0.7 × speed perpendicular.
 */

const LUNGE_RANGE = 1.5;
const APPROACH_RANGE = 3.0;
const LUNGE_COOLDOWN = 1.5;
const LUNGE_SPEED_MULT = 2.0;
const STRAFE_SPEED_MULT = 0.7;

/**
 * @param {object} monster
 * @param {number} dt
 * @param {{player:{x:number,y:number}}} world
 */
export function strafeLunge(monster, dt, world) {
  const dx = world.player.x - monster.x;
  const dy = world.player.y - monster.y;
  const dist = Math.hypot(dx, dy);

  if (dist > APPROACH_RANGE) {
    // Walk toward
    monster.action = 'strafe'; // treated as "approach" by the motion code
    monster.vx = (dx / dist) * monster.speed;
    monster.vy = (dy / dist) * monster.speed;
  } else if (dist > LUNGE_RANGE) {
    // Strafe perpendicular (alternates sign via strafeSign)
    monster.action = 'strafe';
    const perpX = -dy / dist;
    const perpY = dx / dist;
    monster.vx = perpX * monster.strafeSign * monster.speed * STRAFE_SPEED_MULT;
    monster.vy = perpY * monster.strafeSign * monster.speed * STRAFE_SPEED_MULT;
  } else {
    // In lunge range
    if (monster.lungeTimer <= 0) {
      monster.action = 'lunge';
      monster.vx = (dx / dist) * monster.speed * LUNGE_SPEED_MULT;
      monster.vy = (dy / dist) * monster.speed * LUNGE_SPEED_MULT;
      monster.lungeTimer = LUNGE_COOLDOWN;
    } else {
      monster.action = 'idle';
      monster.vx = 0;
      monster.vy = 0;
    }
  }

  monster.lungeTimer = Math.max(0, monster.lungeTimer - dt);
  monster.facing = Math.sign(dx) || monster.facing;
}
```

- [ ] **Step 4: Implement `behaviors/index.js`**

Create `src/engine/behaviors/index.js`:

```js
/**
 * Behaviors registry.
 *
 * Each key is a behavior id referenced from a monster template's
 * `behavior` field. Each value is a pure function that reads the world
 * and mutates the monster's vx/vy/action/lungeTimer/facing.
 *
 * To add a new behavior: implement the function, add it here, and
 * reference it from the monster template.
 */

import { strafeLunge } from './strafe-lunge.js';

export const BEHAVIORS = {
  'strafe-lunge': strafeLunge,
};
```

- [ ] **Step 5: Run all related tests, verify they pass**

Run: `npm test -- tests/engine/behaviors-strafe-lunge.test.js tests/engine/monster.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/behaviors/ tests/engine/behaviors-strafe-lunge.test.js
git commit -m "feat(behaviors): add strafe-lunge AI + registry (M2)"
```

---

## Task 9: Create `pickup.js` (createXpGem + tickXpGem)

**Files:**
- Create: `src/engine/pickup.js`
- Test: `tests/engine/pickup.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/engine/pickup.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createXpGem, tickXpGem } from '../../src/engine/pickup.js';

describe('createXpGem', () => {
  it('initializes a gem with the given position, amount, and alive flag', () => {
    const g = createXpGem(3, 4, 5);
    expect(g.kind).toBe('xp');
    expect(g.x).toBe(3);
    expect(g.y).toBe(4);
    expect(g.amount).toBe(5);
    expect(g.alive).toBe(true);
    expect(typeof g.update).toBe('function');
    expect(typeof g.render).toBe('function');
  });
});

describe('tickXpGem', () => {
  it('gem outside the pickup radius is unaffected by player', () => {
    const g = createXpGem(0, 0, 5);
    const player = { x: 10, y: 0, xp: 0, level: 1, pendingLevelUp: false };
    tickXpGem(g, 0.1, player);
    expect(g.x).toBeCloseTo(0, 5);
    expect(g.alive).toBe(true);
  });

  it('gem inside the pickup radius accelerates toward the player', () => {
    const g = createXpGem(0, 0, 5);
    const player = { x: 2, y: 0, xp: 0, level: 1, pendingLevelUp: false };
    tickXpGem(g, 0.1, player);
    // Gem should have moved toward the player
    expect(g.x).toBeGreaterThan(0);
    expect(g.alive).toBe(true);
  });

  it('on contact (dist < 0.3): grants XP, removes gem (alive=false)', () => {
    const g = createXpGem(0, 0, 5);
    const player = { x: 0.1, y: 0.1, xp: 0, level: 1, pendingLevelUp: false };
    tickXpGem(g, 0.1, player);
    expect(player.xp).toBe(5);
    expect(g.alive).toBe(false);
  });

  it('level-up cascade fires when XP crosses threshold', () => {
    const g = createXpGem(0, 0, 10); // exactly level-1 threshold
    const player = { x: 0.1, y: 0.1, xp: 0, level: 1, pendingLevelUp: false };
    tickXpGem(g, 0.1, player);
    expect(player.level).toBe(2);
    expect(player.pendingLevelUp).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/pickup.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `pickup.js`**

Create `src/engine/pickup.js`:

```js
/**
 * Pickup (XP gem) — entity factory + tick helper.
 *
 * When a monster dies, the dungeon scene spawns a gem at the monster's
 * position. The gem sits still until the player comes within
 * PICKUP_RADIUS; then it homes in. On contact, the player gains XP and
 * the gem is marked dead (the scene filters dead entities each frame).
 */

import { integrate } from './physics.js';
import { grantXp } from './xpsystem.js';

const PICKUP_RADIUS = 2.5;
const COLLECT_RADIUS = 0.3;
const HOMING_ACCEL = 25; // units/sec^2 along player direction

/**
 * Create an XP gem entity.
 * @param {number} x
 * @param {number} y
 * @param {number} amount - XP value when collected
 * @returns {object} gem entity
 */
export function createXpGem(x, y, amount) {
  return {
    kind: 'xp',
    x, y, vx: 0, vy: 0,
    amount,
    alive: true,
    update(dt, world) { tickXpGem(this, dt, world.player); },
    render(ctx) { drawXpGem(this, ctx); },
  };
}

/**
 * Tick an XP gem: home toward the player if in range, collect on contact.
 * @param {object} gem
 * @param {number} dt
 * @param {{x:number,y:number,xp:number,level:number,pendingLevelUp:boolean}} player
 */
export function tickXpGem(gem, dt, player) {
  const dx = player.x - gem.x;
  const dy = player.y - gem.y;
  const dist = Math.hypot(dx, dy);

  if (dist > COLLECT_RADIUS && dist < PICKUP_RADIUS && dist > 0.001) {
    gem.vx += (dx / dist) * HOMING_ACCEL * dt;
    gem.vy += (dy / dist) * HOMING_ACCEL * dt;
  }
  integrate(gem, dt);

  // Re-check after integration
  const finalDx = player.x - gem.x;
  const finalDy = player.y - gem.y;
  const finalDist = Math.hypot(finalDx, finalDy);
  if (finalDist < COLLECT_RADIUS) {
    grantXp(player, gem.amount);
    gem.alive = false;
  }
}

function drawXpGem(gem, ctx) {
  ctx.fillStyle = '#5a8cc8';
  ctx.fillRect(gem.x - 0.1, gem.y - 0.1, 0.2, 0.2);
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/pickup.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/pickup.js tests/engine/pickup.test.js
git commit -m "feat(pickup): add createXpGem + tickXpGem with homing vacuum (M2)"
```

---

## Task 10: Create `projectile.js` (placeholder API)

**Files:**
- Create: `src/engine/projectile.js`
- Test: `tests/engine/projectile.test.js`

M2 doesn't use projectiles (kampilan is melee). But the entity contract needs to be in place so the dungeon scene's projectile loop doesn't break. M3+ (ranged weapons, boss spit) will fill in the implementation.

- [ ] **Step 1: Write the failing test**

Create `tests/engine/projectile.test.js`:

```js
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
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/projectile.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `projectile.js`**

Create `src/engine/projectile.js`:

```js
/**
 * Projectile — entity factory + tick helper.
 *
 * M2 ships no ranged weapons, so this is a minimal placeholder: the
 * entity contract (x, y, vx, vy, update, render) is in place so the
 * dungeon scene's projectile array loop doesn't break, but no actual
 * projectile spawning happens. M3+ will extend this with hit detection,
 * expiry, and per-weapon projectile types.
 */

const DEFAULT_SPEED = 5.0;

/**
 * Create a projectile entity.
 * @param {number} x
 * @param {number} y
 * @param {number} dirX
 * @param {number} dirY
 * @param {number} damage
 * @returns {object} projectile entity
 */
export function createProjectile(x, y, dirX, dirY, damage) {
  const len = Math.hypot(dirX, dirY) || 1;
  return {
    x, y,
    vx: (dirX / len) * DEFAULT_SPEED,
    vy: (dirY / len) * DEFAULT_SPEED,
    damage,
    alive: true,
    update(dt, world) { /* placeholder; M3+ adds motion + hit detection */ },
    render(ctx) {
      ctx.fillStyle = '#c89a3a';
      ctx.fillRect(this.x - 0.05, this.y - 0.05, 0.1, 0.1);
    },
  };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/projectile.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/engine/projectile.js tests/engine/projectile.test.js
git commit -m "feat(projectile): add placeholder factory for M3+ ranged weapons (M2)"
```

---

## Task 11: Add `data/weapons.json` with kampilan

**Files:**
- Create: `data/weapons.json`
- Test: `tests/data/weapons.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/data/weapons.test.js`:

```js
import { describe, it, expect } from 'vitest';
import weapons from '../../data/weapons.json' with { type: 'json' };

describe('weapons.json', () => {
  it('contains the kampilan', () => {
    const k = weapons.find((w) => w.id === 'kampilan');
    expect(k).toBeTruthy();
    expect(k.name).toBe('Kampilan');
    expect(k.type).toBe('melee');
    expect(k.element).toBe('spirit');
    expect(k.autoAttack.shape).toBe('arc');
    expect(k.autoAttack.arc).toBeCloseTo(Math.PI / 2, 5);
    expect(k.autoAttack.range).toBe(1.2);
    expect(k.autoAttack.tick).toBe(0.6);
    expect(k.autoAttack.damage).toBe(20);
    expect(k.abilities).toEqual(['lunging-strike']);
  });

  it('every weapon has required fields', () => {
    for (const w of weapons) {
      expect(w.id).toBeTruthy();
      expect(w.name).toBeTruthy();
      expect(['melee', 'ranged', 'magic', 'summon']).toContain(w.type);
      expect(['fire', 'water', 'earth', 'air', 'lightning', 'spirit']).toContain(w.element);
      expect(w.autoAttack).toBeTruthy();
      expect(typeof w.autoAttack.range).toBe('number');
      expect(typeof w.autoAttack.tick).toBe('number');
      expect(typeof w.autoAttack.damage).toBe('number');
      expect(['arc', 'line', 'circle', 'cone']).toContain(w.autoAttack.shape);
      expect(Array.isArray(w.abilities)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/data/weapons.test.js`
Expected: FAIL — file not found

- [ ] **Step 3: Create `data/weapons.json`**

```json
[
  {
    "id": "kampilan",
    "name": "Kampilan",
    "type": "melee",
    "element": "spirit",
    "spriteRef": "weapons/kampilan",
    "autoAttack": {
      "range": 1.2,
      "shape": "arc",
      "arc": 1.5707963267948966,
      "tick": 0.6,
      "damage": 20
    },
    "abilities": ["lunging-strike"]
  }
]
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/data/weapons.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add data/weapons.json tests/data/weapons.test.js
git commit -m "feat(data): add kampilan weapon template (M2)"
```

---

## Task 12: Add `data/monsters.json` with aswang

**Files:**
- Create: `data/monsters.json`
- Test: `tests/data/monsters.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/data/monsters.test.js`:

```js
import { describe, it, expect } from 'vitest';
import monsters from '../../data/monsters.json' with { type: 'json' };
import behaviors from '../../data/behaviors.json' with { type: 'json' };

describe('monsters.json', () => {
  it('contains the aswang', () => {
    const a = monsters.find((m) => m.id === 'aswang');
    expect(a).toBeTruthy();
    expect(a.name).toBe('Aswang');
    expect(a.hp).toBe(30);
    expect(a.damage).toBe(8);
    expect(a.speed).toBe(1.5);
    expect(a.contactRange).toBe(0.6);
    expect(a.behavior).toBe('strafe-lunge');
    expect(a.drops).toEqual([{ kind: 'xp', amount: 5, chance: 1.0 }]);
  });

  it('every monster references a registered behavior', () => {
    const ids = new Set(behaviors.map((b) => b.id));
    for (const m of monsters) {
      expect(ids.has(m.behavior)).toBe(true);
    }
  });

  it('every monster has required fields', () => {
    for (const m of monsters) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(typeof m.hp).toBe('number');
      expect(typeof m.damage).toBe('number');
      expect(typeof m.speed).toBe('number');
      expect(typeof m.contactRange).toBe('number');
      expect(typeof m.behavior).toBe('string');
      expect(Array.isArray(m.drops)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/data/monsters.test.js`
Expected: FAIL — file not found

- [ ] **Step 3: Create `data/monsters.json`**

```json
[
  {
    "id": "aswang",
    "name": "Aswang",
    "hp": 30,
    "damage": 8,
    "speed": 1.5,
    "contactRange": 0.6,
    "behavior": "strafe-lunge",
    "drops": [{ "kind": "xp", "amount": 5, "chance": 1.0 }],
    "spriteRef": "monsters/aswang",
    "tags": ["melee", "fodder"]
  }
]
```

- [ ] **Step 4: Create `data/behaviors.json` (required for the test)**

```json
[
  { "id": "strafe-lunge", "file": "strafe-lunge.js" }
]
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npm test -- tests/data/monsters.test.js`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add data/monsters.json data/behaviors.json tests/data/monsters.test.js
git commit -m "feat(data): add aswang monster + behaviors registry (M2)"
```

---

## Task 13: Add `data/abilities.json` with lunging-strike

**Files:**
- Create: `data/abilities.json`
- Test: `tests/data/abilities.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/data/abilities.test.js`:

```js
import { describe, it, expect } from 'vitest';
import abilities from '../../data/abilities.json' with { type: 'json'';

describe('abilities.json', () => {
  it('contains lunging-strike', () => {
    const a = abilities.find((x) => x.id === 'lunging-strike');
    expect(a).toBeTruthy();
    expect(a.name).toBe('Lunging Strike');
    expect(a.damage).toBe(30);
    expect(a.cooldown).toBe(3.0);
    expect(a.range).toBe(2.0);
    expect(a.aoe.shape).toBe('arc');
    expect(a.aoe.arc).toBeCloseTo(Math.PI / 2, 5);
    expect(a.aoe.radius).toBe(1.0);
  });

  it('every ability has required fields', () => {
    for (const a of abilities) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(typeof a.damage).toBe('number');
      expect(typeof a.cooldown).toBe('number');
      expect(typeof a.range).toBe('number');
      expect(a.aoe).toBeTruthy();
      expect(['arc', 'line', 'circle', 'cone']).toContain(a.aoe.shape);
    }
  });
});
```

Note: vitest's JSON import uses the `with` clause in v1.6. If your version doesn't support that, use a dynamic import:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const abilities = JSON.parse(readFileSync(join(__dirname, '../../data/abilities.json'), 'utf8'));
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/data/abilities.test.js`
Expected: FAIL — file not found

- [ ] **Step 3: Create `data/abilities.json`**

```json
[
  {
    "id": "lunging-strike",
    "name": "Lunging Strike",
    "element": "spirit",
    "damage": 30,
    "cooldown": 3.0,
    "range": 2.0,
    "aoe": {
      "shape": "arc",
      "arc": 1.5707963267948966,
      "radius": 1.0
    },
    "fxRef": "fx/lunge"
  }
]
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/data/abilities.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add data/abilities.json tests/data/abilities.test.js
git commit -m "feat(data): add lunging-strike ability template (M2)"
```

---

## Task 14: Add room-level `monsterSpawns` to the stub-sandbox room

**Files:**
- Modify: `data/rooms/01-stub-sandbox.json`
- Test: `tests/data/rooms.test.js` (existing — update if it validates the schema)

- [ ] **Step 1: Check the existing test for the room schema**

Read `tests/data/rooms.test.js` to see what fields it asserts. If it asserts the full tile/array shape, the new `monsterSpawns` field won't break it (it just adds a new key). If it does strict equality on the whole object, update the test to allow the new field.

- [ ] **Step 2: Modify the room JSON**

Add a `monsterSpawns` array to `data/rooms/01-stub-sandbox.json` (after the existing `props` array):

```json
{
  "id": "01-stub-sandbox",
  "type": "platforming",
  "width": 20,
  "height": 12,
  "spawn": { "x": 2, "y": 9 },
  "exit": { "x": 18, "y": 2 },
  "tiles": [
    "....................",
    "....................",
    "...............#####",
    "....................",
    "............###.....",
    "....L...............",
    "...###..............",
    "....................",
    "............#####...",
    "....................",
    "####################",
    "####################"
  ],
  "props": [
    { "kind": "ladder", "x": 4, "y": 6, "height": 3 }
  ],
  "monsterSpawns": [
    { "monsterId": "aswang", "x": 8, "y": 4, "count": 3 },
    { "monsterId": "aswang", "x": 15, "y": 9, "count": 1 }
  ]
}
```

- [ ] **Step 3: Run the room test, verify it passes**

Run: `npm test -- tests/data/rooms.test.js`
Expected: PASS (existing test shouldn't break; if it does, update it to allow the new field)

- [ ] **Step 4: Commit**

```bash
git add data/rooms/01-stub-sandbox.json tests/data/rooms.test.js
git commit -m "feat(data): add monsterSpawns to stub sandbox room (M2)"
```

---

## Task 15: Extend `gamedb.js` to load weapons, monsters, abilities

**Files:**
- Modify: `src/engine/gamedb.js`
- Test: `tests/engine/gamedb.test.js` (existing — extend)

- [ ] **Step 1: Update the failing test**

Add to `tests/engine/gamedb.test.js`:

```js
import { loadWeapons, loadMonsters, loadAbilities } from '../../src/engine/gamedb.js';

describe('loadWeapons', () => {
  it('loads weapons.json and indexes by id', () => {
    const weapons = loadWeapons();
    expect(weapons.get('kampilan')).toBeTruthy();
  });
});

describe('loadMonsters', () => {
  it('loads monsters.json and indexes by id', () => {
    const monsters = loadMonsters();
    expect(monsters.get('aswang')).toBeTruthy();
  });
});

describe('loadAbilities', () => {
  it('loads abilities.json and indexes by id', () => {
    const abilities = loadAbilities();
    expect(abilities.get('lunging-strike')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/gamedb.test.js`
Expected: FAIL — `loadWeapons is not a function`

- [ ] **Step 3: Add the new loaders to `gamedb.js`**

Append to `src/engine/gamedb.js`:

```js
import weaponsData from '../../data/weapons.json' with { type: 'json' };
import monstersData from '../../data/monsters.json' with { type: 'json' };
import abilitiesData from '../../data/abilities.json' with { type: 'json' };

export function loadWeapons() {
  return new Map(weaponsData.map((w) => [w.id, w]));
}

export function loadMonsters() {
  return new Map(monstersData.map((m) => [m.id, m]));
}

export function loadAbilities() {
  return new Map(abilitiesData.map((a) => [a.id, a]));
}
```

If the import-with syntax isn't supported in your vitest version, use the dynamic-import fallback shown in Task 13.

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/gamedb.test.js`
Expected: PASS (with 3 new tests added)

- [ ] **Step 5: Commit**

```bash
git add src/engine/gamedb.js tests/engine/gamedb.test.js
git commit -m "feat(gamedb): load weapons, monsters, abilities (M2)"
```

---

## Task 16: Extend `player.js` with weapon state, xp, level, pendingLevelUp

**Files:**
- Modify: `src/engine/player.js`
- Test: `tests/engine/player.test.js` (existing — extend)

The M1 player doesn't have `weapon`, `attackPower`, `xp`, `level`, or `pendingLevelUp`. Add them with sensible defaults so existing tests don't break.

- [ ] **Step 1: Update the failing test**

Add to `tests/engine/player.test.js`:

```js
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
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/engine/player.test.js`
Expected: FAIL — `player.weapon` is undefined

- [ ] **Step 3: Extend `createPlayer`**

In `src/engine/player.js`, update `createPlayer`:

```js
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
    animState: 'idle',
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
  };
  player.update = (dt) => updatePlayer(player, dt);
  player.takeDamage = (amount) => takeDamage(player, amount);
  player.heal = (amount) => heal(player, amount);
  return player;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/engine/player.test.js`
Expected: PASS (existing 18 tests + 2 new tests = 20)

- [ ] **Step 5: Commit**

```bash
git add src/engine/player.js tests/engine/player.test.js
git commit -m "feat(player): add weapon state, xp, level, attackPower (M2)"
```

---

## Task 17: Create the `death` scene

**Files:**
- Create: `src/scenes/death.js`
- Test: `tests/scenes/death.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/scenes/death.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deathScene } from '../../src/scenes/death.js';

describe('death scene', () => {
  beforeEach(() => { deathScene.exit(); });

  it('enter() stores the timer and returnTo target', () => {
    deathScene.enter({ dungeonId: 'd1', returnTo: 'hub' });
    expect(deathScene._timer).toBe(0);
    expect(deathScene._returnTo).toBe('hub');
    expect(deathScene._dungeonId).toBe('d1');
  });

  it('update() ticks the timer; transitions at 1.5s', () => {
    const sm = { transition: vi.fn() };
    deathScene._stateMachine = sm;
    deathScene.enter({ dungeonId: 'd1', returnTo: 'hub' });
    deathScene.update(1.0);
    expect(sm.transition).not.toHaveBeenCalled();
    deathScene.update(0.6); // total 1.6s
    expect(sm.transition).toHaveBeenCalledWith('hub', { dungeonId: 'd1' });
  });

  it('render() draws "YOU DIED" overlay', () => {
    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      fillRect: vi.fn(),
      font: '',
      textAlign: '',
      fillText: vi.fn(),
    };
    deathScene.render(ctx);
    expect(ctx.fillText).toHaveBeenCalledWith('YOU DIED', 400, 300);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/scenes/death.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `death.js`**

Create `src/scenes/death.js`:

```js
/**
 * Death scene.
 *
 * Shows a "YOU DIED" overlay for 1.5s, then transitions to the hub.
 * M2 keeps this simple: no stats screen, no run summary. The hub's
 * enter() restores the player's HP.
 */

const OVERLAY_DURATION = 1.5; // seconds

export const deathScene = {
  name: 'death',
  enter(ctx = {}) {
    this._timer = 0;
    this._returnTo = ctx.returnTo || 'hub';
    this._dungeonId = ctx.dungeonId;
  },
  exit() {
    this._timer = 0;
    this._returnTo = null;
    this._dungeonId = null;
  },
  update(dt) {
    this._timer += dt;
    if (this._timer >= OVERLAY_DURATION) {
      this._stateMachine.transition(this._returnTo, { dungeonId: this._dungeonId });
    }
  },
  render(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU DIED', w / 2, h / 2);
    ctx.fillStyle = '#888';
    ctx.font = '20px monospace';
    ctx.fillText('Returning to hub...', w / 2, h / 2 + 48);
  },
};
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/scenes/death.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/death.js tests/scenes/death.test.js
git commit -m "feat(death): add death scene with 1.5s overlay (M2)"
```

---

## Task 18: Create the `levelup` scene

**Files:**
- Create: `src/scenes/levelup.js`
- Test: `tests/scenes/levelup.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/scenes/levelup.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { levelupScene } from '../../src/scenes/levelup.js';

describe('levelup scene', () => {
  beforeEach(() => { levelupScene.exit(); });

  it('enter() stores the timer, dungeonId, and player', () => {
    const p = { level: 1, maxHp: 100, hp: 100, attackPower: 1 };
    levelupScene.enter({ dungeonId: 'd1', player: p });
    expect(levelupScene._timer).toBe(0);
    expect(levelupScene._dungeonId).toBe('d1');
    expect(levelupScene._player).toBe(p);
  });

  it('update() ticks timer; transitions to dungeon at 1.0s', () => {
    const p = { level: 1, maxHp: 100, hp: 100, attackPower: 1 };
    const sm = { transition: vi.fn() };
    levelupScene._stateMachine = sm;
    levelupScene.enter({ dungeonId: 'd1', player: p });
    levelupScene.update(0.5);
    expect(sm.transition).not.toHaveBeenCalled();
    levelupScene.update(0.6); // total 1.1s
    expect(sm.transition).toHaveBeenCalledWith('dungeon', { dungeonId: 'd1', player: p });
  });

  it('exit() applies rewards, clears pendingLevelUp, saves', () => {
    const p = { level: 1, maxHp: 100, hp: 50, attackPower: 1, pendingLevelUp: true };
    levelupScene._player = p;
    // Stub the SaveManager import (we don't have a save here)
    vi.mock('../../src/persistence/save.js', () => ({ SaveManager: { save: vi.fn() } }));
    levelupScene.exit();
    expect(p.level).toBe(2);
    expect(p.maxHp).toBe(105);
    expect(p.hp).toBe(105);
    expect(p.attackPower).toBe(2);
    expect(p.pendingLevelUp).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/scenes/levelup.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `levelup.js`**

Create `src/scenes/levelup.js`:

```js
/**
 * Level-up scene.
 *
 * Shows a "LEVEL UP!" flash for 1.0s, then transitions back to the
 * dungeon. The rewards (level++, maxHp, full HP, attackPower) are
 * applied in exit() so the dungeon scene resumes with the player in
 * the post-level-up state.
 */

import { applyLevelUpRewards } from '../engine/levelup.js';
import { SaveManager } from '../persistence/save.js';

const FLASH_DURATION = 1.0; // seconds

export const levelupScene = {
  name: 'levelup',
  enter(ctx = {}) {
    this._timer = 0;
    this._dungeonId = ctx.dungeonId;
    this._player = ctx.player;
  },
  exit() {
    if (this._player) {
      applyLevelUpRewards(this._player);
      this._player.pendingLevelUp = false;
      try { SaveManager.save(this._player); } catch (e) { /* best-effort */ }
    }
  },
  update(dt) {
    this._timer += dt;
    if (this._timer >= FLASH_DURATION) {
      this._stateMachine.transition('dungeon', { dungeonId: this._dungeonId, player: this._player });
    }
  },
  render(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a8c5a';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', w / 2, h / 2);
    ctx.fillStyle = '#888';
    ctx.font = '20px monospace';
    ctx.fillText(`Lv ${this._player?.level ?? '?'} · HP restored · +1 ATK`, w / 2, h / 2 + 48);
  },
};
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/scenes/levelup.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/levelup.js tests/scenes/levelup.test.js
git commit -m "feat(levelup): add levelup scene with 1.0s flash + reward application (M2)"
```

---

## Task 19: Wire monsters + combat into `dungeon.js`

**Files:**
- Modify: `src/scenes/dungeon.js`
- Test: `tests/scenes/dungeon.test.js` (existing — extend)

This is the big integration task. The dungeon scene:
1. Spawns monsters from `room.monsterSpawns` on enter
2. Ticks monsters, applies contact damage, ticks gems
3. Resolves death (transitions to death) and level-up (transitions to levelup)
4. Drives the player's auto-attack and ability cooldowns
5. Logs combat events for the E2E test

- [ ] **Step 1: Update the failing test**

Add to `tests/scenes/dungeon.test.js`:

```js
describe('update — combat', () => {
  it('auto-attack fires when an enemy is in range and on cooldown', () => {
    const { dungeon, room } = setupDungeon({
      room: {
        width: 10, height: 5,
        spawn: { x: 1, y: 3 },
        exit: { x: 8, y: 1 },
        tiles: ['..........', '..........', '..........', '..........', '..........'],
        props: [],
        monsterSpawns: [{ monsterId: 'aswang', x: 2, y: 3, count: 1 }],
      },
    });
    const roomObj = { id: 'r1', ...room };
    setDungeons(new Map([[dungeon.id, dungeon]]));
    dungeonScene.enter({
      dungeonId: dungeon.id,
      rooms: new Map([[roomObj.id, roomObj]]),
      weapons: new Map([['kampilan', { id: 'kampilan', autoAttack: { range: 1.2, shape: 'arc', arc: Math.PI / 2, tick: 0.6, damage: 20 }, abilities: [] }]]),
      monsters: new Map([['aswang', { id: 'aswang', hp: 30, damage: 8, speed: 1.5, contactRange: 0.6, behavior: 'strafe-lunge', drops: [] }]]),
      abilities: new Map(),
      hubTransition: vi.fn(),
    });

    // Set the player's weapon and force a cooldowned state
    const p = dungeonScene._player;
    p.weapon.id = 'kampilan';
    p.weapon.template = dungeonScene._weapons.get('kampilan');
    p.weapon.lastAttackTime = -1; // long ago, ready to fire
    p.x = 1; p.y = 3;

    // Player is at (1, 3), aswang at (2, 3) — distance 1.0, in range
    dungeonScene.update(0.1);

    // The aswang should have taken damage
    const aswang = dungeonScene._monsters[0];
    expect(aswang.hp).toBeLessThan(30);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/scenes/dungeon.test.js`
Expected: FAIL — `dungeonScene._weapons` doesn't exist yet; combat loop not wired

- [ ] **Step 3: Modify `dungeon.js`**

This is a large rewrite. Replace the existing `dungeon.js` with the M2 version:

```js
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
import { createProjectile } from '../engine/projectile.js';

// Seeded RNG factory — deterministic for tests; non-deterministic in prod.
function makeRng(seed) {
  let s = seed ?? Math.floor(Math.random() * 1e9);
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const PROJECTILE_DEFAULT = { speed: 5.0 };

export const dungeonScene = {
  name: 'dungeon',

  enter(ctx = {}) {
    const { dungeonId, rooms, weapons, monsters, abilities, hubTransition } = ctx;
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
    this._player = createPlayer(room.spawn.x, room.spawn.y, this._input);
    this._camera = createCamera(this._player, { width: room.width, height: room.height });
    this._grid = grid;
    this._room = room;
    this._hubTransition = hubTransition;

    // M2: entity arrays + registries
    this._weapons = weapons || new Map();
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
          p.weapon.lastAttackTime = now;
          if (result.killed) this._onMonsterKilled(target);
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

    // M2: clean up dead entities
    this._monsters = this._monsters.filter((m) => m.alive);
    this._gems = this._gems.filter((g) => g.alive);

    // M2: resolve death
    if (p.hp <= 0 && !p.isDead) {
      triggerDeath(p);
      console.log('[dungeon] player died');
      this._stateMachine.transition('death', { dungeonId: this._dungeonId });
      return;
    }

    // M2: resolve level-up
    if (p.pendingLevelUp) {
      this._stateMachine.transition('levelup', { dungeonId: this._dungeonId, player: p });
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

  _onMonsterKilled(monster) {
    console.log(`[pickup] spawn: xp gem +${monster.template.drops[0].amount}`);
    for (const drop of monster.template.drops) {
      if (drop.kind === 'xp' && Math.random() < (drop.chance ?? 1.0)) {
        this._gems.push(createXpGem(monster.x, monster.y, drop.amount));
      }
    }
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
    // M2: combat HUD (bottom bar)
    drawCombatHud(ctx, p, this._room, p.weapon.template);
  },
};

let dungeons = null;
export function setDungeons(db) { dungeons = db; }
```

Note: the scene also needs to use the new `drawCombatHud`. The existing `drawHud` call is removed (the M2 HUD is the single bottom bar). This is a behavior change for any test that asserts `drawHud` is called; update those if they break.

- [ ] **Step 4: Run the dungeon test, verify it passes**

Run: `npm test -- tests/scenes/dungeon.test.js`
Expected: PASS (existing tests + new combat test)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/dungeon.js tests/scenes/dungeon.test.js
git commit -m "feat(dungeon): spawn monsters, drive auto-attack + contact damage + level/death transitions (M2)"
```

---

## Task 20: Extend `hud.js` with `drawCombatHud`

**Files:**
- Modify: `src/ui/hud.js`
- Test: `tests/ui/hud.test.js` (existing — extend)

- [ ] **Step 1: Update the failing test**

Add to `tests/ui/hud.test.js`:

```js
import { drawCombatHud } from '../../src/ui/hud.js';

describe('drawCombatHud', () => {
  it('draws HP bar, XP bar, ability icon, and level/zone label', () => {
    const ctx = {
      fillStyle: '', font: '', textAlign: '',
      fillRect: vi.fn(), fillText: vi.fn(),
    };
    const p = { hp: 80, maxHp: 100, xp: 0, level: 3 };
    const room = { id: '01-stub-sandbox' };
    const weapon = { abilities: ['lunging-strike'] };
    drawCombatHud(ctx, p, room, weapon);
    // HP bar bg + HP fill = 2 fillRects just for HP
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(3);
    // Level text drawn
    expect(ctx.fillText).toHaveBeenCalled();
    // Zone/room label
    const labels = ctx.fillText.mock.calls.map((c) => c[0]);
    expect(labels.some((l) => typeof l === 'string' && l.includes('01-stub-sandbox'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/ui/hud.test.js`
Expected: FAIL — `drawCombatHud is not a function`

- [ ] **Step 3: Implement `drawCombatHud`**

Append to `src/ui/hud.js`:

```js
import { xpForLevel } from '../engine/xpsystem.js';

const HUD_HEIGHT = 54;
const HUD_PADDING = 12;

/**
 * Draw the M2 combat HUD: single bottom bar with HP, XP, abilities,
 * plus a top-right level/zone label.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{hp:number,maxHp:number,xp:number,level:number}} player
 * @param {{id:string}} room
 * @param {{abilities:string[]}|null} weapon
 */
export function drawCombatHud(ctx, player, room, weapon) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // Top-right: level + zone
  ctx.fillStyle = '#f0f0f0';
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Lv ${player.level}`, w - HUD_PADDING, HUD_PADDING + 14);
  if (room?.id) {
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(room.id, w - HUD_PADDING, HUD_PADDING + 30);
  }

  // Bottom strip background
  ctx.fillStyle = 'rgba(15, 15, 26, 0.92)';
  ctx.fillRect(0, h - HUD_HEIGHT, w, HUD_HEIGHT);

  // HP bar (left)
  const hpX = HUD_PADDING;
  const hpY = h - HUD_HEIGHT + 12;
  const hpW = (w - 2 * HUD_PADDING) * 0.4;
  const hpH = 18;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(hpX, hpY, hpW, hpH);
  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#5a8c5a' : hpRatio > 0.25 ? '#c89a3a' : '#c0392b';
  ctx.fillRect(hpX, hpY, Math.floor(hpW * hpRatio), hpH);
  ctx.fillStyle = '#f0f0f0';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${player.hp}/${player.maxHp}`, hpX + 4, hpY + 13);

  // XP bar (middle)
  const xpX = hpX + hpW + HUD_PADDING;
  const xpY = hpY + 5;
  const xpW = (w - 2 * HUD_PADDING) * 0.3;
  const xpH = 8;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(xpX, xpY, xpW, xpH);
  const need = xpForLevel(player.level + 1);
  ctx.fillStyle = '#5a8cc8';
  ctx.fillRect(xpX, xpY, Math.floor(xpW * (player.xp / need)), xpH);
  ctx.fillStyle = '#888';
  ctx.font = '10px monospace';
  ctx.fillText(`XP ${player.xp}/${need}`, xpX + 4, xpY + 22);

  // Ability icons (right)
  const abilSize = 36;
  const abilX = w - HUD_PADDING - abilSize;
  const abilY = h - HUD_HEIGHT + (HUD_HEIGHT - abilSize) / 2;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(abilX, abilY, abilSize, abilSize);
  ctx.strokeStyle = '#c89a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(abilX, abilY, abilSize, abilSize);
  ctx.fillStyle = '#c89a3a';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚔', abilX + abilSize / 2, abilY + 24);
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/ui/hud.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/hud.js tests/ui/hud.test.js
git commit -m "feat(hud): add drawCombatHud (single bottom bar) (M2)"
```

---

## Task 21: Restore HP in `hub.js` enter()

**Files:**
- Modify: `src/scenes/hub.js`
- Test: `tests/scenes/hub.test.js` (existing — extend)

- [ ] **Step 1: Update the failing test**

Add to `tests/scenes/hub.test.js`:

```js
describe('hub HP restore on enter', () => {
  it('restores a damaged player to full HP and clears pendingLevelUp', () => {
    hubScene._player = { hp: 0, maxHp: 100, pendingLevelUp: true };
    // Re-enter to trigger the restore
    hubScene.enter();
    // After enter(), the scene re-creates _player, so test the new one
    expect(hubScene._player.hp).toBe(100);
    expect(hubScene._player.pendingLevelUp).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/scenes/hub.test.js`
Expected: FAIL — HP not restored (existing enter() doesn't restore)

- [ ] **Step 3: Modify `hub.js` enter()**

In `src/scenes/hub.js`, update the `enter()` method to restore the player's HP if a player object was passed in. Update the function signature to accept a ctx:

```js
enter(ctx = {}) {
  console.log('[scene] enter: hub');
  this._input = createInput(globalThis);
  this._playerX = 0;
  this._playerY = 1;
  if (ctx.player) {
    // Restore HP after death or level-up return
    ctx.player.hp = ctx.player.maxHp ?? 100;
    ctx.player.pendingLevelUp = false;
  }
  this._player = ctx.player || null;
},
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- tests/scenes/hub.test.js`
Expected: PASS (existing + 1 new)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/hub.js tests/scenes/hub.test.js
git commit -m "feat(hub): restore HP on enter when player is passed in (M2)"
```

---

## Task 22: Save version bump v1 → v2 with migration

**Files:**
- Modify: `src/persistence/save.js`
- Modify: `src/persistence/migration.js`
- Test: `tests/persistence/migration.test.js` (existing — extend)

- [ ] **Step 1: Update the failing test**

Add to `tests/persistence/migration.test.js`:

```js
describe('migrate v1 → v2', () => {
  it('adds attackPower=1, level=1, xp=0, default weapons array', () => {
    const v1 = {
      version: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      player: { classId: 'farmer', hp: 50, maxHp: 100 },
      weapons: [],
      passives: [],
      clearedDungeons: [],
      settings: {},
    };
    const v2 = migrate(v1);
    expect(v2.version).toBe(2);
    expect(v2.player.attackPower).toBe(1);
    expect(v2.player.level).toBe(1);
    expect(v2.player.xp).toBe(0);
    expect(v2.player.classId).toBe('farmer'); // preserved
    expect(Array.isArray(v2.weapons)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- tests/persistence/migration.test.js`
Expected: FAIL — migration doesn't produce v2

- [ ] **Step 3: Implement the v1 → v2 migration**

In `src/persistence/migration.js`, add (or extend) a migration step:

```js
export function migrate(save) {
  let s = save;
  if (s.version === 1) s = migrateV1ToV2(s);
  // future migrations
  return s;
}

function migrateV1ToV2(s) {
  return {
    ...s,
    version: 2,
    player: {
      ...s.player,
      level: s.player.level ?? 1,
      xp: s.player.xp ?? 0,
      attackPower: s.player.attackPower ?? 1,
    },
    weapons: s.weapons ?? [
      { slot: 'main', id: 'kampilan', abilitiesPicked: [] },
    ],
  };
}
```

- [ ] **Step 4: Update SaveManager to call migrate on load**

In `src/persistence/save.js`, ensure the load path runs `migrate()` on the loaded save. (If this already happens in M1's code, just verify; if not, add it.)

- [ ] **Step 5: Run the test, verify it passes**

Run: `npm test -- tests/persistence/migration.test.js tests/persistence/save.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/persistence/migration.js src/persistence/save.js tests/persistence/migration.test.js
git commit -m "feat(save): add v1→v2 migration (level, xp, attackPower, weapons) (M2)"
```

---

## Task 23: Wire new scenes + data into `main.js`

**Files:**
- Modify: `src/main.js`
- Test: manual — boot the dev server, verify no console errors

- [ ] **Step 1: Read `main.js` to see the current scene registration**

Read `src/main.js` to see how `dungeonScene`, `hubScene`, `titleScene` are registered.

- [ ] **Step 2: Register the new scenes and load the new data**

In `src/main.js`:

1. Import `deathScene` and `levelupScene`
2. Import `loadWeapons`, `loadMonsters`, `loadAbilities` from `gamedb.js`
3. Add the scenes to the StateMachine
4. Pass `weapons`, `monsters`, `abilities` Maps to the dungeon scene's enter() context

Example additions:

```js
import { deathScene } from './scenes/death.js';
import { levelupScene } from './scenes/levelup.js';
import { loadWeapons, loadMonsters, loadAbilities } from './engine/gamedb.js';

// ... existing code ...

const weapons = loadWeapons();
const monsters = loadMonsters();
const abilities = loadAbilities();
window.__pf = { sm, weapons, monsters, abilities, ... };

// Update the dungeon transition to pass them:
sm.transition('dungeon', { dungeonId, rooms, weapons, monsters, abilities, hubTransition });
```

- [ ] **Step 3: Boot the dev server and verify no console errors**

Run: `npm run dev` and visit `http://localhost:5173/`. Open the browser console. Verify no errors. Walk through: title → hub → dungeon (aswang should spawn and start chasing).

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat(main): register death/levelup scenes; pass new data to dungeon (M2)"
```

---

## Task 24: E2E combat flow test

**Files:**
- Create: `tests/e2e/combat.spec.js`

- [ ] **Step 1: Write the E2E test**

Create `tests/e2e/combat.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.describe('M2 combat E2E', () => {
  test('hero fights aswang, gains XP, dies and respawns at hub', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    await page.goto('/');
    await expect(page.locator('#game-canvas')).toBeAttached();
    await page.waitForFunction(() => window.__pf !== undefined);

    // Title → Hub
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__pf.sm.current === 'hub', { timeout: 5000 });

    // Hub → Dungeon
    // (Use the test hook on __pf to skip the walk-to-entrance dance)
    await page.evaluate(() => {
      window.__pf.sm.transition('dungeon', {
        dungeonId: '01-stub-sandbox',
        rooms: window.__pf.rooms,
        weapons: window.__pf.weapons,
        monsters: window.__pf.monsters,
        abilities: window.__pf.abilities,
        hubTransition: () => window.__pf.sm.transition('hub'),
      });
    });
    await page.waitForFunction(() => window.__pf.sm.current === 'dungeon', { timeout: 5000 });
    expect(logs.some((l) => l.includes('[dungeon] enter'))).toBe(true);

    // Verify 4 aswangs spawned (3 + 1 from the room config)
    const monsterCount = await page.evaluate(() => window.__pf.sm.scenes.dungeon._monsters.length);
    expect(monsterCount).toBe(4);

    // Force the nearest aswang to 1 HP for a deterministic kill
    await page.evaluate(() => {
      const m = window.__pf.sm.scenes.dungeon._monsters[0];
      m.hp = 1;
    });

    // Wait for auto-attack to fire (1s gives plenty of time at 0.6s tick)
    await page.waitForTimeout(1500);

    // Verify the aswang was killed
    const afterCount = await page.evaluate(() => window.__pf.sm.scenes.dungeon._monsters.length);
    expect(afterCount).toBe(3);
    expect(logs.some((l) => l.includes('[pickup] spawn: xp gem'))).toBe(true);

    // Force-kill the player to test the death flow
    await page.evaluate(() => {
      const p = window.__pf.sm.scenes.dungeon._player;
      p.hp = 0;
    });

    // Wait for the death transition
    await page.waitForFunction(() => window.__pf.sm.current === 'death', { timeout: 2000 });
    expect(logs.some((l) => l.includes('[dungeon] player died'))).toBe(true);

    // Wait for the death overlay to expire and transition to hub
    await page.waitForFunction(() => window.__pf.sm.current === 'hub', { timeout: 3000 });

    // Verify HP is restored on hub enter
    const hubPlayerHp = await page.evaluate(() => window.__pf.sm.scenes.hub._player?.hp);
    expect(hubPlayerHp).toBe(100);
  });
});
```

- [ ] **Step 2: Run the E2E test, verify it passes**

Run: `npm run test:e2e -- tests/e2e/combat.spec.js`
Expected: PASS

If it fails, iterate on the test or scene wiring until it passes consistently.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/combat.spec.js
git commit -m "test(e2e): add M2 combat flow (spawn → fight → kill → die → respawn) (M2)"
```

---

## Task 25: Asset pipeline scaffolding (PixelLab prompts + manifest entries)

**Files:**
- Create: `tools/asset-gen/prompts/monster.js`
- Create: `tools/asset-gen/prompts/weapon.js`
- Modify: `tools/asset-gen/manifest.json`

Asset generation is **deferred to a follow-up** (M2.1 or M3). This task only scaffolds the prompts and manifest entries so the work is documented. No `gen-assets` run is required for M2 acceptance.

- [ ] **Step 1: Create `tools/asset-gen/prompts/monster.js`**

```js
/**
 * Aswang (Filipino folklore ghoul) sprite prompt.
 * Per the M2 spec: silhouette is "fodder melee chaser" with glowing eyes.
 */

export const ASWANG_BASE = 'Filipino aswang folklore creature, hunched ghoul silhouette, glowing yellow eyes, maw with fangs, lean and feral, dark earthy skin, tattered cloth wraps, modern pixel art';

export function aswangPrompt(anim = 'idle', frame = 0) {
  return `${ASWANG_BASE}, ${anim} pose, frame ${frame}, 32x32 canvas, no background`;
}
```

- [ ] **Step 2: Create `tools/asset-gen/prompts/weapon.js`**

```js
/**
 * Kampilan (Filipino curved sword) sprite prompt.
 */

export const KAMPILAN_BASE = 'Filipino kampilan curved single-edged sword, ornate hilt with brass pommel, wooden grip wrapped in cord, dramatic curve, modern pixel art';

export function kampilanPrompt(anim = 'idle', frame = 0) {
  return `${KAMPILAN_BASE}, ${anim} pose, frame ${frame}, 32x32 canvas, no background`;
}
```

- [ ] **Step 3: Update `tools/asset-gen/manifest.json`**

Add entries for the aswang and kampilan (status: 'missing' — generation deferred):

```json
{
  "assets": [
    { "id": "monsters/aswang/idle/0", "type": "monster", "size": [32, 32], "file": "assets/sprites/monsters/aswang/idle-0.png", "status": "missing" },
    { "id": "monsters/aswang/strafe/0", "type": "monster", "size": [32, 32], "file": "assets/sprites/monsters/aswang/strafe-0.png", "status": "missing" },
    { "id": "monsters/aswang/lunge/0", "type": "monster", "size": [32, 32], "file": "assets/sprites/monsters/aswang/lunge-0.png", "status": "missing" },
    { "id": "weapons/kampilan/idle/0", "type": "weapon", "size": [32, 32], "file": "assets/sprites/weapons/kampilan/idle-0.png", "status": "missing" },
    { "id": "weapons/kampilan/swing/0", "type": "weapon", "size": [32, 32], "file": "assets/sprites/weapons/kampilan/swing-0.png", "status": "missing" }
  ]
}
```

(Append to the existing manifest's `assets` array; preserve any existing entries.)

- [ ] **Step 4: Commit**

```bash
git add tools/asset-gen/prompts/monster.js tools/asset-gen/prompts/weapon.js tools/asset-gen/manifest.json
git commit -m "chore(assets): scaffold aswang + kampilan prompts (generation deferred) (M2)"
```

---

## Task 26: Final full-suite verification

**Files:** none (verification task)

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: All tests pass (existing 95 + new M2 tests ≈ 130+)

- [ ] **Step 2: Run the full E2E test suite**

Run: `npm run test:e2e`
Expected: All tests pass (existing 3 + new combat test = 4)

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Boot the dev server and manually walk through the loop**

Run: `npm run dev` and visit `http://localhost:5173/`. Walk through: title → hub → dungeon. Verify:
- Aswangs spawn and chase
- Auto-attack swings fire and damage the aswang
- Aswang dies, gem spawns
- Walk to gem, vacuum pulls it in, XP increases
- Take enough damage to die, "YOU DIED" appears, transition to hub
- HP restored on hub

- [ ] **Step 5: Commit a CHANGELOG entry (if a CHANGELOG.md exists)**

If a `CHANGELOG.md` file exists at the repo root, add an M2 entry summarizing what shipped. If not, skip this step.

- [ ] **Step 6: Final commit**

If any tweaks were made during verification, commit them:

```bash
git add -A
git commit -m "chore: M2 final verification + cleanup"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task(s) |
|--------------|---------|
| §3 Architecture (scene-as-director, entity contract) | Task 7 (monster), Task 9 (pickup), Task 10 (projectile) |
| §3.4 File structure | Every task creates/modifies the right files |
| §4.1 Weapon template | Task 11 (data/weapons.json) |
| §4.2 Ability template | Task 13 (data/abilities.json) |
| §4.3 Monster template | Task 12 (data/monsters.json) |
| §4.4 Behaviors registry | Task 8 (behaviors/index.js), Task 12 (behaviors.json) |
| §4.5 Room monsterSpawns | Task 14 (room JSON) |
| §4.6 Save v2 additions | Task 22 (migration) |
| §5.1 Damage formula | Task 1 (crit), Task 2 (applyHit) |
| §5.2 Hit shape resolution | Task 2 (resolveShape) |
| §5.3 Auto-attack tick | Task 19 (dungeon.js) |
| §5.4 Contact damage | Task 19 (dungeon.js) |
| §5.5 Player weapon state | Task 16 (player.js) |
| §5.6 New input binding | Task 3 (input.js) |
| §6.1 Aswang AI | Task 8 (strafe-lunge.js) |
| §6.2 Pickup vacuum | Task 9 (pickup.js) |
| §6.3 Dungeon update order | Task 19 (dungeon.js) |
| §7.1 Death scene | Task 17 (death.js) |
| §7.2 Hub HP restore | Task 21 (hub.js) |
| §7.3 Level-up scene | Task 18 (levelup.js) |
| §7.4 Level-up rewards | Task 5 (levelup.js) |
| §7.5 XP system | Task 4 (xpsystem.js) |
| §8 Combat HUD | Task 20 (drawCombatHud) |
| §9 Save system v1→v2 | Task 22 (migration) |
| §10 Asset pipeline | Task 25 (prompts + manifest) |
| §11.1 Unit tests | Tasks 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 18, 20, 21 |
| §11.2 E2E | Task 24 |

All spec sections are covered.

**2. Placeholder scan:** No TBD/TODO/"fill in details" found. The only intentionally deferred work is in §10 (asset generation) and is explicitly noted as out-of-scope for M2 acceptance.

**3. Type consistency:**
- `player.weapon` shape defined in Task 16, used in Tasks 19 (dungeon.js) and 20 (hud.js). All references use `{ id, template, lastAttackTime, lastAbilityTime, attackPower }`. ✓
- `monster.alive` defined in Task 7, used in Task 19 cleanup. ✓
- `gem.alive` defined in Task 9, used in Task 19 cleanup. ✓
- `resolveShape(attacker, target, shape)` signature defined in Task 2 and used identically in Task 19. ✓
- `applyHit(target, baseDamage, attacker, rng)` signature defined in Task 2 and used identically in Task 19. ✓
- `createMonster(template, x, y)` defined in Task 7, used identically in Task 19 spawn loop. ✓
- `createXpGem(x, y, amount)` defined in Task 9, used identically in Task 19 `_onMonsterKilled`. ✓
- `BEHAVIORS['strafe-lunge']` defined in Task 8, referenced in Task 12 monster template. ✓

No inconsistencies found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-03-princefarmer-m2-combat-basics.md` (26 tasks).

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
