# PrinceFarmer M3 — Build System Design Spec

**Date:** 2026-06-04
**Status:** Draft, pending user approval
**Depends on:** M2 (combat basics), M1 (hero movement), M0 (foundation)
**Supersedes:** None
**Deferred to M4+:** 5 named classes, class-specific signature abilities

---

## 1. Summary

M3 ships the **Albion-style build system** that the game's full design hinges on: two weapon slots, a pre-run ability picker (2 of 8), six passive slots filled from a growing owned pool, mid-run passive level-up choices, two-tier item evolutions, and a six-element damage model. The build system is data-driven: weapons, passives, and evolution recipes live in JSON; a new pure-function module `src/engine/build.js` resolves loadout into player stats at dungeon enter; a new `loadout` scene in the hub hosts the picker UI.

The save format bumps from v2 to v3 with a migration that adds the new fields and seeds sensible defaults so a fresh player has a working build on day one. No classes ship in M3 — they remain a M4+ concern once the weapon roster is wider.

## 2. Goals & Non-Goals

### Goals
- Two weapon slots (main + off-hand) with persistent loadout saved across runs.
- Pre-run ability picker in the hub: pick 2 of 8 abilities (4 from each equipped weapon).
- 6 passive slots drawn from an owned pool that grows via mid-run level-up choices.
- Two-tier evolution: tier 1 declarative recipes (auto at run start) and tier 2 in-run threshold + element-driven paths.
- Six elements (fire, water, earth, air, lightning, spirit) drive evolution paths, damage tagging, and multi-element combo bonuses.
- Save migration v2 → v3, automatic on load.
- E2E coverage of the build flow (loadout, evolution) on top of the M2 combat E2E.

### Non-Goals (deferred)
- 5 named Filipino-themed classes (M4+).
- Class-specific signature abilities (M4+).
- Per-element weakness/resistance matrix (6×6 balance data; deferred).
- Item-evolution tier 3+ (M3 stops at tier 2).
- In-run ability swaps (M3 locks the loadout for the run).
- Procedural passive generation (M3 is a fixed registry).

## 3. Architecture

### High-level

```
+---------------------------------+
|  HUB                            |
|    [Tab] inventory              |
|    [L]  loadout (NEW)           |
+--------+------------------------+
         | player.loadout
         v
+---------------------------------+
|  LOADOUT SCENE (NEW)            |
|  Step 1: pick 2 weapons         |
|  Step 2: pick 2 abilities/weapon|
|  Step 3: pick 6 passives        |
|  Confirm → save.loadout         |
+---------------------------------+
         |
         v
+---------------------------------+
|  DUNGEON                        |
|  enter() resolves loadout:      |
|  - main.weapon auto-attacks     |
|  - picked abilities fire on Q/E |
|  - evolutionState evaluated     |
+---------------------------------+

NEW MODULE
  src/engine/build.js
    Pure functions: validate, compute bonuses, resolve evolution.

NEW SCENE
  src/scenes/loadout.js
    Sub-scene of hub. Reads/writes player.loadout.

MODIFIED
  player.js: +loadout field
  dungeon.js: enter() resolves loadout; main weapon drives auto-attack
  hub.js: opens loadout sub-scene on L
  save.js: v2 → v3 migration in UPGRADES registry
  gamedb.js: loadPassives() (new loader)
```

### Boundaries
- `build.js` is **pure** — no game state, no entity references. Returns new objects or numbers.
- `passivedrop.js` is **pure** — takes a player + registry, returns 3 passive ids.
- The `loadout` scene is a **leaf** — it reads/writes the player's loadout, then transitions back to the hub.
- The dungeon scene **owns** the live auto-attack loop and reads the resolved loadout once at enter(); no in-run swaps.
- The `levelup` scene **owns** the level-up choice UI and writes to `ownedPassives` + `loadout.passives`.

## 4. Data Model

### Player (M2 → M3)
```js
player = {
  ...m2Fields,                          // hp, maxHp, xp, level, attackPower, weapon, etc.
  loadout: {
    main:     { weaponId, abilitiesPicked: [abilityId, abilityId] },
    offhand:  { weaponId, abilitiesPicked: [abilityId, abilityId] },
    // 6 discrete slots. A passive id can appear in multiple slots up to
    // its `maxStacks` limit — this is how stacking works without
    // changing the slot count.
    passives: [passiveId | null × 6],
  },
  ownedPassives: Set<passiveId>,        // grows during runs
  evolutionState: {
    [weaponId]: { tier: 0|1|2, kills: 0, elementDamage: {fire:0,...} },
  },
}
```

**Stacking rule:** a passive with `maxStacks: 5` (e.g. might) can fill 1–5 of the 6 slots. The 6th slot can hold a different passive (or be null). The loadout scene enforces this constraint on the picker — you can't put might in 6 slots if its maxStacks is 5.

### Weapon template (M2 → M3)
```json
{
  "id": "kampilan",
  "name": "Kampilan",
  "type": "melee",
  "element": "spirit",                  // NEW: drives evolution paths
  "spriteRef": "weapons/kampilan",
  "autoAttack": { "range": 1.2, "shape": "arc", "arc": 1.57, "tick": 0.6, "damage": 20 },
  "abilities": ["lunging-strike", "sweep", "thrust", "shield-bash"],
  "evolvesInto": {                      // NEW: tier-1 evolution recipes
    "withPassive:might:stack:5":  "tiger-claw",
    "withPassive:haste:stack:5":  "windcutter"
  }
}
```

### Evolved weapon (tier 2)
```json
{
  "id": "tiger-claw",
  "parentId": "kampilan",
  "tier": 2,
  "element": "earth",
  "autoAttack": { "range": 1.2, "shape": "arc", "arc": 2.0, "tick": 0.5, "damage": 35 },
  "abilities": ["lunge-3", "tiger-roar"],
  "evolutionTrigger": "kills:200",
  "tier2Paths": [
    { "id": "phoenix-edge", "dominantElement": "fire",      "elementDamageThreshold": 0.4 },
    { "id": "stormcaller",  "dominantElement": "lightning", "elementDamageThreshold": 0.4 }
  ]
}
```

### Passive template (new file `data/passives.json`)
```json
{
  "id": "might",
  "name": "Might",
  "effect": { "stat": "attackPower", "op": "add", "value": 1 },
  "element": null,
  "maxStacks": 5,
  "tier": 1
}
```

### Save v3
```json
{
  "version": 3,
  "createdAt": "...",
  "updatedAt": "...",
  "player": { "classId": "lakan-alon", "hp": 50, "maxHp": 100, "level": 1, "xp": 0, "attackPower": 1, "pendingLevelUp": false },
  "weapons": [
    { "slot": "main",    "id": "kampilan", "abilitiesPicked": ["lunging-strike", "sweep"] },
    { "slot": "offhand", "id": null,       "abilitiesPicked": [] }
  ],
  "loadout":     { "passives": [null, null, null, null, null, null] },
  "ownedPassives": [],
  "evolutionState": {},
  "clearedDungeons": [],
  "settings": {}
}
```

### Element registry (`src/engine/elements.js`)
- 6 elements: `fire`, `water`, `earth`, `air`, `lightning`, `spirit`.
- Each has a display name and color (HUD-friendly).
- Centralized so weapons/passives/UI share the source of truth.

## 5. Element System + Damage Pipeline

### Pipeline (M2 → M3)
```
1. M2 applyHit
   base × crit × attackPower
2. M3 multiply by element multiplier
   damage × computeElementMultiplier(player, ability)
3. M3 multiply by combo bonus
   damage × computeComboBonus(loadout)
4. result applied to target
```

### `computeElementMultiplier(player, ability)`
- Base: 1.0
- For each slot in `loadout.passives` whose passive's `element === ability.element`: `+0.15`.
- "Stacks" here = number of slots containing that passive (so might with maxStacks:5 in 3 slots = +0.45).
- Returns `{ multiplier, dominantElement }`.

### `computeComboBonus(loadout)`
- 3+ distinct elements touched by weapons + passives: `1.10`
- 5+ distinct elements: `1.25`
- Otherwise: `1.00`

### Element coverage
- The 6 elements are distributed across the starter weapons and passives so test fixtures exercise every path.

## 6. Loadout Scene UI

The loadout scene is a sub-scene of the hub — opened with `L`, returned to hub with `Esc` or after confirm.

### 3-step wizard
1. **Weapons** — pick main + offhand from the owned weapons pool.
2. **Abilities** — for each equipped weapon, pick 2 of its 4 abilities.
3. **Passives** — fill 6 slots from `ownedPassives` (any slot can be `null` for empty).

### Flow
```
HUB (player presses L)
   ↓
LOADOUT (step 1: weapons)
   ↓ [Next →]
LOADOUT (step 2: abilities)
   ↓ [Next →]
LOADOUT (step 3: passives)
   ↓ [Confirm]
save.loadout persisted → HUB
   ↓ [Esc]
HUB (discard changes)
```

### Why a separate scene, not a modal
- The hub already owns walk + dungeon entrance input.
- The loadout scene can have its own state machine and inputs.
- Tests run the loadout scene in isolation against a fake player.

### Inputs
- `L`: open from hub
- `Esc`: cancel (discard), back to hub
- `Enter`: confirm step / final save
- `↑`/`↓`/`Tab`: navigate slot
- `Click`: (deferred to M4+ — M3 is keyboard-only)

## 7. Item Evolutions

### Tier 1 — auto, declarative
- Each weapon declares `evolvesInto` recipes in JSON: `withPassive:<id>:count:<n> → evolvedId`.
  - `count:n` means "passive `<id>` appears in at least `n` of the 6 loadout slots".
- At dungeon `enter()`, `build.js#resolveEvolutionTier1(weapon, loadout)` evaluates recipes.
- If multiple match, **highest resulting tier wins**; ties broken by **first declared in JSON**.
- Tier-1 evolution logs: `[evolution] kampilan → tiger-claw`.
- The evolved form replaces the weapon's `autoAttack` and `abilities` for the run.

### Tier 2 — threshold + element
- Each tier-2 weapon has `evolutionTrigger: "kills:N"`.
- The dungeon tracks `player.evolutionState[weaponId].kills` and `.elementDamage[element]`.
- On hit: `elementDamage[ability.element] += damage`.
- On kill: `kills++`. When `kills >= threshold` AND the current weapon form's `tier === 1` (eligible to evolve further), fire the tier-2 picker.
- Tier-2 path: pick the `tier2Paths` entry whose `dominantElement` matches the dominant element of `elementDamage` AND whose share exceeds `elementDamageThreshold`.
- If no path matches, the weapon stays at tier 1 for the run.

### Tracking
- `player.evolutionState[weaponId] = { tier, kills, elementDamage: {fire:0,...}, lastEvolutionAt: 0 }`.
- Persisted on save so cross-session continuity is possible (M3+).

### Edge cases
- A weapon can only have one active form (parent or one evolution) per run.
- Tier-2 paths are exclusive: the first matching path is the one chosen.
- Tier-2 evolution logs: `[evolution] tiger-claw → phoenix-edge`.

## 8. Mid-Run Level-Up Choices

The M2 `levelup` scene (1.0s flash + apply rewards) extends to: after the flash, the player picks 1 of 3 passives, which is added to `ownedPassives` and (if a slot is empty) placed in `loadout.passives`.

### Choice selection
- New pure module `src/engine/passivedrop.js`:
  - `pickPassiveChoices(player, registry, count=3, rng)` returns 3 passive ids.
  - Tier weights: 60% tier 1, 30% tier 2, 10% tier 3.
  - **Never offer a passive the player already owns** (encourages pool expansion).
  - Fallback: when the player owns every passive in the registry, offer stack-upgrades of owned passives (a stack-upgrade increases the slot count of that passive by 1, up to its `maxStacks`). Stack-upgrades are still useful for tier-1 evolution recipes that require `count:N` of a specific passive.

### Scene flow
```
PLAYER LEVELS UP
   ↓
LEVELUP SCENE
  - 1.0s flash (existing M2)
  - show 3 choices
  - on Enter: pick one
  - applyLevelUpRewards (M2)
  - if the pick is a new passive: add to ownedPassives; if loadout.passives
    has a null slot, place there; else pool-only
  - if the pick is a stack-upgrade of an owned passive (fallback path):
    increment the passive's slot count up to maxStacks; if a null slot
    is available, the upgrade goes there; else pool-only
   ↓
sm.transition('dungeon', { player })
```

### Tests
- `passivedrop.test.js`: 15+ tests covering weights, never-owned, fallback, seeded determinism.
- `levelup.test.js` (extend M2): 5+ new tests for the choice UI and pool updates.

## 9. Save Migration v2 → v3

```js
function migrateV2ToV3(s) {
  return {
    ...s,
    version: 3,
    weapons: s.weapons ?? [
      { slot: 'main', id: 'kampilan', abilitiesPicked: ['lunging-strike', 'sweep'] },
    ],
    loadout: { passives: Array(6).fill(null) },
    ownedPassives: [],
    evolutionState: {},
  };
}
```

- Added to the `UPGRADES` registry at key `3`.
- `SaveManager.load()` already runs the chain — no other change.
- Default new-player loadout: `kampilan` (main) with `lunging-strike` + `sweep` pre-picked so the player has a working build on first run.

## 10. Testing Strategy

### New unit test files
```
tests/engine/build.test.js            (40+ tests)
tests/engine/passivedrop.test.js      (15+ tests)
tests/engine/elements.test.js         (10+ tests)
tests/data/passives.test.js           (5+ tests)
tests/data/evolutions.test.js         (5+ tests)
tests/scenes/loadout.test.js          (15+ tests)
tests/scenes/levelup.test.js          (extend M2: 5+ new tests)
```

### E2E
```
tests/e2e/build.spec.js               (2 tests)
  - loadout flow: open, equip, confirm, save round-trip
  - evolution flow: tier-1 evolves at run start
```

### Total
- ~95 new unit tests, 2 new E2E tests.
- Combined with M2: ~260 unit + 6 E2E.

### Test fixtures
- `data/passives.json`: 6 starter passives spanning all 6 elements.
- 1 new weapon (`baladaw`, fire) so the off-hand has a real option.
- `data/evolutions.json` not needed — evolutions live inside each weapon's `evolvesInto`.

## 11. File Structure

### New files
```
src/engine/build.js              # resolveLoadout, computeBonuses, evolution
src/engine/passivedrop.js        # pickPassiveChoices (pure)
src/engine/elements.js           # element registry + constants
src/scenes/loadout.js            # 3-step wizard scene

data/passives.json               # 6 starter passives
data/weapons.json                # +baladaw (fire) + tier-2 forms
```

### Modified files
```
src/engine/player.js             # +loadout, +ownedPassives, +evolutionState
src/engine/dungeon.js            # enter() resolves loadout; tier-2 tracking
src/scenes/hub.js                # opens loadout scene on L
src/scenes/levelup.js            # adds 3-choice picker before transition
src/persistence/migration.js     # +migrateV2ToV3
src/persistence/save.js          # currentVersion bump
src/main.js                      # registers loadout scene
src/engine/gamedb.js             # +loadPassives()
```

### Boundaries
- `build.js`, `passivedrop.js`, `elements.js` are pure.
- The `loadout` scene is a leaf.
- The `dungeon` scene owns the live loadout resolution at enter(); no in-run swaps.
- The `levelup` scene owns passive pool + slot updates.

## 12. Out of Scope (deferred to M4+)
- 5 named classes with starting kit differentiation.
- Class-specific signature abilities.
- Per-element weakness/resistance matrix.
- In-run ability swaps.
- Item evolution tier 3+.
- Click-based UI for the loadout picker.
- Procedural passive generation.
