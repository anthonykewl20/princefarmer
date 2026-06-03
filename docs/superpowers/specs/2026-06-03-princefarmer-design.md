# PrinceFarmer — Slice 1 Design Spec

**Date:** 2026-06-03
**Status:** Draft, pending user approval

## 1. Summary

PrinceFarmer is a side-scrolling 2D pixel-art adventure inspired by the combination of *Vampire Survivors*, *Prince of Persia*, and *Albion Online*. The player is a farmer whose village is threatened by Filipino folklore monsters, who learns to fight by venturing into themed dungeons, gathering materials, building a class+weapon+passive loadout, and growing in power across a 8+ dungeon campaign.

This document describes **Slice 1**: the single-player adventure core. The player-driven economy, cooking (kakanin), and farming planned in the original concept are explicitly out of scope and are deferred to follow-on projects that will add a Node.js backend and additional game systems.

## 2. Goals & Non-Goals

### Goals
- A complete, polished single-player game slice that can be played start-to-finish
- 8+ hand-crafted dungeons forming a full campaign arc
- 12+ weapon types with deep build variety (Albion-style)
- 5 named Filipino-themed classes with distinct starting kits and signature abilities
- 3 distinct monster types (aswang, manananggal, kapre) each with unique AI behaviors
- A working automated asset generation pipeline (PixelLab.ai)
- A PWA that installs, runs offline, and persists save data in IndexedDB

### Non-Goals (deferred)
- Player-driven economy (requires a server backend; out of scope for a PWA-only slice)
- Cooking system (kakanin recipes)
- Farming (crop plots in hub)
- Procedural dungeon generation
- Multiplayer / co-op
- Mobile-first UI redesign (PWA is touch-friendly via LittleJS on-screen gamepad but is not phone-first)

## 3. Core Game Design

### 3.1 The blend: PoP + VS + Albion
- **Prince of Persia provides:** side-scrolling 2D perspective, climbing, jumping, traps, pixel-art aesthetic
- **Vampire Survivors provides:** auto-attack primary weapon, manual abilities on cooldowns, XP-gem drops, vacuum pickup, exponential scaling, 30-100 enemies on screen, build variety via passives
- **Albion Online provides:** two-weapon-slot system (main + off-hand), each weapon brings 4 abilities of which 2 are picked, combinatorially many builds, elemental affinities, item evolutions

### 3.2 The hero
The player is a **farmer whose village is threatened by monsters**. Not a prince, not a chosen one — an ordinary person who has to learn to fight. Tone: underdog, working-class, defending home.

### 3.3 Structure: open hub with dungeons
- A single **village hub** that the player returns to between dungeons
- **8+ hand-crafted dungeons** accessible from the hub
- Each dungeon has multiple rooms: platforming puzzle, wave-clear, treasure, boss
- Win condition: clear all 8+ dungeons
- Future content (farming plots, NPC shops, marketplace) slots into the hub without engine changes

### 3.4 Combat
- **Auto-attack:** primary weapon fires on a timer toward the nearest enemy in range
- **Manual abilities (limited):** dash, special attack, parry — each on its own cooldown
- **Camera:** default close (PoP feel), zooms out during combat to fit 30-100 enemies, custom-framed for boss arenas
- **Movement:** always manual — running, jumping, climbing, ledge-grab

### 3.5 Build system (Albion-style)
- **Two weapon slots:** main + off-hand
- **Each weapon contributes:** an auto-attack pattern and a pool of 4 abilities
- **Ability pick:** of 8 total abilities across both weapons, pick 2 to bring into the run
- **6 passive slots** that drop from enemies and chests during a run
- **Stacking passives:** 5 max per type (VS-lite)
- **Item evolutions:** specific weapon + specific passive = evolved form with new behavior
- **Elemental affinities:** each weapon has an element (fire, water, earth, air, lightning, spirit). Passives can boost specific elements. Multi-element builds get combo bonuses.

### 3.6 Classes (5 named)
The 5 Filipino-themed classes are:
- **Lakan Alon**
- **Datu Kidlat**
- **Raha Salakay**
- **Lakan Mayari**
- **Datu Hiraya**

Each class:
- Starts with a specific 2-weapon kit (specific weapon assignments are a design decision for M4, after the full weapon roster is locked in)
- Has 1 unique signature ability
- Player can swap to any weapon they find during a run; class only defines the starting state and the signature ability

### 3.7 Progression
- **Hybrid XP + crafting:**
  - XP drops from kills (gems) and dungeon completion
  - XP fills a level bar; level-up = stat point OR new passive choice
  - Materials dropped by monsters and chests
  - Materials are stored in the hub and used to craft/upgrade gear (slice 1 has a minimal crafting UI; full crafting UI in a later project)

### 3.8 Monsters (slice 1 set)
- **Aswang** — shape-shifting ghoul. Fodder melee. Basic chaser behavior.
- **Manananggal** — splits upper body, flies. Boss-tier mini-boss and end-of-dungeon boss. Distinct flying torso silhouette.
- **Kapre** — towering tree-giant, slow, high HP, ranged cigar attacks. Forces players to use terrain and range.

### 3.9 Save system
- **Auto-save at the start of each dungeon**
- One save slot per device (IndexedDB)
- Mid-dungeon progress is not preserved; on death, the player restarts the dungeon with their persistent build
- This is a deliberate forgiving-but-lossy trade-off appropriate for a survivors-style game

## 4. Architecture

### 4.1 High-level
```
Content (JSON, Tiled)  →  Engine (code)  →  Game State Machine  →  Persistence (IndexedDB)
                                       ↑
                       Behaviors (small fns referenced by templates)
```

### 4.2 Data-driven templates
- Weapons, monsters, abilities, passives, evolutions, materials, classes, dungeons, rooms — all defined as **JSON** loaded at boot
- A few core classes (`Player`, `Monster`, `Projectile`, `Pickup`, `Room`, `CameraController`) consume the templates
- Complex AI behavior (manananggal split, kapre tree-teleport) lives in plain JS functions in `src/engine/behaviors/`. Templates reference behaviors by name string.

### 4.3 Game state machine
```
TITLE ──▶ HUB ◀──▶ DUNGEON ──▶ DEATH ──▶ HUB
              │           │
              │           ├──▶ VICTORY (boss clear) ──▶ HUB
              │           │
              │           └──▶ PAUSE (overlay, returns to DUNGEON)
              │
              └──▶ INVENTORY (overlay, returns to HUB)
```

Only one scene is active at a time. Overlays (PAUSE, INVENTORY) freeze the underlying scene's update but keep its draw on screen.

## 5. Data Model

```js
Class = {
  id, name,
  startingWeapons: [weaponId, weaponId],     // 2 weapons
  signatureAbility: abilityId,
  spriteRef, lore
}

Weapon = {
  id, name, type,                            // melee|ranged|magic|summon
  element,                                   // fire|water|earth|air|lightning|spirit
  autoAttack: { range, damage, tick, projectileSprite },
  abilities: [abilityId, abilityId, abilityId, abilityId]   // 4 candidates
}

Ability = {
  id, name, element,
  damage, cooldown, range, aoe,
  effects: [], spriteRef, soundRef
}

Monster = {
  id, name, hp, damage, speed, contactRange,
  behavior,                                  // refs src/engine/behaviors/<id>.js
  drops: [{ item, chance }, ...],
  spriteRef, tags
}

Passive = {
  id, name, stat, value, stackable, maxStacks
}

Evolution = {
  requiresWeapon: weaponId,
  requiresPassive: { id, stacks },
  resultWeapon: weaponId
}

Material = { id, name, rarity }

Dungeon = {
  id, name, theme,
  monsterPool: [monsterId, ...],
  rooms: [roomId, ...],
  reward: { xp, materials }
}

Room = {
  id, type,                                  // platforming|wave|treasure|boss
  layout,                                    // tilemap ref
  enemySpawns: [...], hazards: [...]
}
```

## 6. File & Module Structure

```
princefarmer/
├── index.html                      # PWA entry, registers service worker
├── manifest.webmanifest
├── sw.js                           # service worker (offline caching)
├── package.json                    # Vite + LittleJS
├── vite.config.js
│
├── data/                           # All game content as JSON
│   ├── classes.json
│   ├── weapons.json
│   ├── abilities.json
│   ├── monsters.json
│   ├── behaviors.json              # name → behavior-id cross-ref
│   ├── passives.json
│   ├── evolutions.json
│   ├── materials.json
│   ├── dungeons/
│   │   ├── 01-balete-grove.json
│   │   ├── 02-bahay-na-bato.json
│   │   ├── 03-dark-forest.json
│   │   └── ...                     # 8+ files
│   └── rooms/                      # reusable room templates
│
├── src/
│   ├── main.js                     # boot
│   ├── engine/
│   │   ├── player.js
│   │   ├── monster.js
│   │   ├── projectile.js
│   │   ├── pickup.js
│   │   ├── camera.js
│   │   ├── damage.js
│   │   ├── behaviors/              # AI behaviors as small functions
│   │   └── gamedb.js               # JSON → indexed registry
│   ├── scenes/
│   │   ├── title.js
│   │   ├── hub.js
│   │   ├── dungeon.js
│   │   ├── death.js
│   │   └── victory.js
│   ├── ui/
│   │   ├── hud.js
│   │   ├── inventory.js
│   │   ├── levelup.js
│   │   └── dialogue.js
│   ├── persistence/
│   │   ├── save.js                 # IndexedDB
│   │   └── migration.js
│   └── utils/
│       ├── random.js               # seeded RNG
│       └── tween.js
│
├── tools/
│   └── asset-gen/                  # PixelLab.ai integration
│       ├── gen.js                  # CLI
│       ├── style-guide.json        # base prompt + anchor
│       ├── prompts/                # per-asset templates
│       │   ├── hero.js
│       │   ├── monster.js
│       │   ├── weapon.js
│       │   └── environment.js
│       └── manifest.json           # asset status tracker
│
├── assets/
│   ├── sprites/                    # generated PNGs
│   ├── tilemaps/                   # Tiled JSON
│   └── audio/
│
└── tests/
    ├── engine/                     # vitest unit tests
    ├── data/                       # JSON validation
    └── e2e/                        # Playwright smoke tests
```

### Conventions
- **Engine layer:** pure logic, no JSON knowledge, no UI. Takes data via constructor.
- **Scene layer:** orchestrates engine objects. Knows about the game state machine.
- **UI layer:** draws to canvas overlay, listens to events from scenes.
- **Data layer:** JSON, loaded once at boot. Immutable after load.
- **Behaviors:** plain functions `(monster, dt, world) → nextAction`. JSON templates reference them by name string.

## 7. Persistence

IndexedDB store: `princefarmer-save`. Single slot per device.

```js
{
  version: 1,
  createdAt, updatedAt,
  player: {
    classId, level, xp, hp, maxHp,
    stats: { str, dex, int, vit },
    materials: { talon: 12, kris: 3 }
  },
  weapons: [
    { slot: 'main',    id: 'sword',    abilitiesPicked: ['cleave','parry'] },
    { slot: 'offhand', id: 'shield',   abilitiesPicked: ['bash','guard'] }
  ],
  passives: [{ id: 'might', stacks: 3 }, { id: 'swift', stacks: 2 }],
  clearedDungeons: ['balete-grove'],
  settings: { musicVolume, sfxVolume, fullscreen }
}
```

`migration.js` handles version bumps. Old saves are transformed forward; never silently lost.

## 8. Asset Pipeline (PixelLab.ai)

- **`tools/asset-gen/style-guide.json`** — shared base prompt (e.g. "modern pixel art, 16x24 sprite, limited 16-color palette, dark fantasy Filipino, painted-by-Frank-Solleveld-look") + a **style anchor image** generated once and referenced for consistency
- **`tools/asset-gen/prompts/`** — per-asset templates combining style guide with the asset's specific prompt
- **`tools/asset-gen/manifest.json`** — tracks every needed asset: `{ id, type, status: 'missing'|'generating'|'done', file }`
- **`gen.js` workflow:**
  1. Read manifest
  2. Find `status: 'missing'`
  3. Build prompt from style guide + asset template
  4. Call PixelLab API
  5. Save PNG, update manifest to `done`
- **Run modes:**
  - `npm run gen-assets` — generate all missing
  - `npm run gen-assets -- --type=monster` — only monsters
  - `npm run gen-assets -- --id=aswang` — only one asset
- **Cost guard:** daily cap (configurable) so credits aren't burned during iteration
- **Style iteration loop:** generate test pack (1 hero + 1 monster + 1 environment tile) → review → tweak style guide → regenerate → repeat until consistent → THEN scale up

**Fallback:** if PixelLab API proves problematic during M0, assets are authored by hand in Aseprite or Piskel and dropped into the same folders. The data layer doesn't care where sprites come from.

## 9. Testing

- **Unit (vitest):** `damage.js` (element matchups, crits), `evolution.js` (trigger conditions), `behaviors/*.js` (deterministic given a seeded RNG), JSON validators
- **JSON validation:** every template has required fields, all `id` references resolve, all sprite refs point to existing files (or are flagged "needs generation")
- **E2E (Playwright):** boot → title → hub → enter dungeon → kill one enemy → die → see death screen → return to hub. One smoke test that proves the loop works
- **Visual regression:** low priority, optional — canvas snapshots at key moments

## 10. Milestones

| # | Milestone | Deliverable | ~Weeks |
|---|-----------|-------------|--------|
| **0** | **Foundation** | Vite+LittleJS boots, PWA manifest+service worker, JSON loader, GameDB, IndexedDB save manager, vitest+Playwright, Title→Hub→empty-Dungeon state transitions | 1-2 |
| **1** | **Hero & Movement** | Player sprite, side-scroll movement (run, jump, climb, ledge), camera close/zoom, HP+death, 1 stub dungeon (1 room) | 1-2 |
| **2** | **Combat Basics** | 1 weapon (sword) auto-attack, 1 ability, damage+elements, 1 monster (aswang) chase, XP gems+vacuum, level-up screen, HUD | 2 |
| **3** | **First Real Dungeon** | 3 room types (platforming, wave, boss), boss = manananggal (split-and-fly), treasure chest, dungeon-clear→hub, parallax background | 2 |
| **4** | **Build System** | 2 weapon slots, ability pick UI (2 of 8), 6 passive slots w/ drop+stacking, 1-2 item evolutions, 5 classes with starting kits + signature ability | 3 |
| **5** | **Content Scale-Up** | All 12+ weapons, all 3 monster types with distinct behaviors, 8+ dungeons (themed per monster), elemental combo bonuses, material drops, hub storage | 3-4 |
| **6** | **Polish** | All UI, ZzFX sounds, music, save/load with corruption recovery, PWA install+offline verified, visual asset pass, smoke tests green | 2-3 |

**Iteration principle:** every milestone ends with something playable. If M3 feels bad in play, we don't add M4 content — we tune the M3 core first.

## 11. Risks

1. **PixelLab.ai API quirks.** I confirmed it has an API and supports animations + style-consistent generation, but exact endpoint docs were not retrievable at design time. We will discover rate limits, image dimensions, and format during M0. **Mitigation:** fallback to hand-authored Aseprite/Piskel assets, which slot into the same folders.

2. **Side-scrolling survivor is a novel genre.** I haven't found a perfect reference combining PoP platforming with VS horde mechanics. The camera/feel in M2-M3 will need iteration. Plan for extra time there.

3. **Auto-save at dungeon start is forgiving-but-lossy.** If the player dies 30 minutes into a dungeon, they restart the dungeon with their persistent build. Appropriate for a survivors game, but a deliberate trade-off vs. mid-dungeon checkpoints.

## 12. Future Work (out of scope for slice 1)

The original concept included a player-driven economy (sell, trade, buy materials and farm produce), cooking (kakanin recipes), and farming (crop plots in hub). These are deferred to follow-on projects. The architecture leaves room for them:
- **Economy:** requires a Node.js backend (Supabase, Firebase, or custom) outside LittleJS. Out of scope for a PWA-only slice.
- **Cooking:** new `data/recipes.json` schema, new `Kitchen` UI scene, hooked into the existing `materials` system.
- **Farming:** new `Plot` entity in the hub, tied to the existing tick / time-of-day system.

Each can be a focused sub-project with its own spec → plan → implementation cycle.
