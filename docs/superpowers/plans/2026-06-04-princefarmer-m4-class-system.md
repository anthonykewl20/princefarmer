# PrinceFarmer M4 Plan: Class System

**Date:** 2026-06-04
**Branch:** `m4-class-system`
**Depends on:** merged M2 + M3 on `main`
**Primary spec references:**
- `docs/superpowers/specs/2026-06-03-princefarmer-design.md` §3.6, §4.2, §10
- `docs/superpowers/specs/2026-06-04-princefarmer-m3-build-system-design.md` §12

## Goal

Ship the first playable class system:
- 5 named classes exist in data
- a new run chooses one class
- the chosen class seeds the player's starting build
- each class has 1 signature ability
- the chosen class persists in save data

This milestone should stay honest about current content limits. The repo only has a minimal weapon roster, so "distinct starting kits" cannot mean five materially different combat identities yet without inventing content that does not exist.

## Constraint

The original spec puts "5 classes with starting kits + signature ability" under milestone 4, but the current content set is still narrow:
- weapons in repo are still effectively `kampilan` + `baladaw`
- only one full combat loop enemy is implemented
- the M3 loadout flow is keyboard-only and only commits weapon/ability/passive choices

Because of that, M4 should be split conceptually:

1. **M4A: class system foundation**  
   data model, save model, class selection UI, starting build seeding, signature ability plumbing

2. **M4B: class differentiation pass**  
   broader weapon roster, more distinctive starter kits, tuning, VFX/audio, content that makes class choice feel meaningfully different

This plan covers **M4A**.

## Deliverable

At the end of M4A:
- player can start a new run as one of 5 classes
- save file persists `classId`
- title scene or a dedicated pre-run scene can select class on new game
- each class injects a defined starting loadout
- `attack2` triggers the class signature ability, not a placeholder
- existing M1-M3 flows remain green

## Proposed Scope

### 1. Data

Add:
- `data/classes.json`

Each class should define:
- `id`
- `name`
- `description`
- `starterLoadout`
- `signatureAbilityId`
- optional presentation fields for UI (`accent`, `blurb`)

The five class ids from the design spec:
- `lakan-alon`
- `datu-kidlat`
- `raha-salakay`
- `lakan-mayari`
- `datu-hiraya`

### 2. Engine / Registry

Add:
- `src/engine/classes.js` or extend `gamedb.js` with `loadClasses()`

Requirements:
- classes load the same way weapons/passives/monsters do
- tests validate all `signatureAbilityId` references
- tests validate every starter weapon id exists

### 3. Player + Save Model

Add to player state:
- `classId`
- `signatureAbility`
- any runtime cooldown fields needed for the signature ability

Persistence:
- bump save from `v3` to `v4`
- `v3 -> v4` migration seeds a default class for existing saves

Default migration choice:
- use `lakan-alon` as the fallback for migrated saves

### 4. Scene Flow

Current candidate surfaces:
- `title` scene: choose class before transitioning to hub
- alternate: new `class-select` scene between title and hub

Recommended:
- keep `title` simple and add a small dedicated `class-select` scene

Reason:
- cleaner state ownership
- avoids overloading title with a second mode
- easier to test transitions and future polish separately

### 5. Starting Build Seeding

Requirements:
- starting a new run applies the selected class starter loadout
- existing saved players keep their saved class and loadout
- class choice defines initial state only; later loadout edits remain player-driven

### 6. Signature Ability Plumbing

Current gap:
- `attack2` is wired, but dungeon ability execution is still a placeholder

M4A should:
- route `attack2` to the selected class signature ability
- make the ability data-driven
- support cooldown + basic effect execution through the existing combat loop

Keep the first slice narrow:
- choose simple signature effects that fit the current engine
- avoid requiring brand-new projectile systems unless a specific class absolutely needs one

### 7. UI / Input

M4A should stay keyboard-first, consistent with M3.

Minimum UX:
- arrow keys to change class
- Enter to confirm
- Esc to return
- visible summary of starter kit + signature ability

## Proposed Task Breakdown

1. Create `classes.json` and validation tests
2. Add class loader to the game DB
3. Add `classId` to player defaults and save migration `v3 -> v4`
4. Add `class-select` scene and register it in `main.js`
5. Thread class registry into scene transitions
6. Seed new players from chosen class data
7. Replace `attack2` placeholder with signature-ability execution
8. Add unit tests for class seeding and migration
9. Add scene tests for class selection flow
10. Add an E2E test: title -> class select -> hub -> dungeon -> use signature ability
11. Full verification pass

## Risks / Open Design Decisions

1. **Weapon roster is too small for strong class differentiation**
   - M4A should not fake five distinct classes if all five secretly play the same.
   - The honest approach is shared or lightly differentiated starter kits now, then widen the roster in M4B/M5.

2. **Signature ability execution surface is currently underspecified**
   - The cleanest approach is to model signatures as ordinary abilities with a `kind: "signature"` marker and route them through the same combat helpers.

3. **Save migration semantics**
   - Existing saves have no class concept. Defaulting to `lakan-alon` is safe, but should be documented in the migration test and PR notes.

4. **New-game vs existing-save behavior**
   - Class select should only gate fresh runs, not overwrite an existing saved player silently.

## Exit Criteria

M4A is done when:
- all five classes exist in data
- new game class selection is playable with keyboard only
- selected class persists across reload via save `v4`
- `attack2` performs a real signature action
- `npm test`, `npm run test:e2e`, and `npm run build` all pass

## Recommendation

Do **M4A class foundation first**, then decide whether the next branch is:
- **M4B class differentiation**, if we want class identity next
- **M5 content scale-up**, if the weapon and monster roster needs to expand before classes can feel real
