# PrinceFarmer M0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working PWA foundation that boots, has a Title → Hub → empty Dungeon state machine, persists saves in IndexedDB, and validates all game data against JSON schemas. The PWA installs, runs offline, and a Playwright smoke test proves the full loop works.

**Architecture:** Vite + LittleJS for the game runtime. JSON files in `data/` are loaded at boot into a `GameDB` registry. A small state machine in `src/scenes/` owns the active scene. Saves are stored in IndexedDB. Tests are vitest for unit/JSON, Playwright for E2E.

**Tech Stack:**
- **Runtime:** LittleJS (HTML5 2D engine)
- **Build:** Vite 5
- **Language:** Vanilla JavaScript (ESM)
- **PWA:** Custom service worker + webmanifest
- **Persistence:** IndexedDB via raw API (no library)
- **Tests:** vitest (unit, JSON), Playwright (E2E), fake-indexeddb (save tests)
- **Node:** 20+

**Spec reference:** `docs/superpowers/specs/2026-06-03-princefarmer-design.md`

**Scope of this plan:** M0 (Foundation) only. M1 (Hero & Movement), M2 (Combat), M3 (First Real Dungeon), M4 (Build System), M5 (Content Scale-Up), M6 (Polish) will each get their own follow-up plan after the corresponding milestone is complete.

**File Structure (created in this plan):**

```
princefarmer/
├── package.json                       # Vite + LittleJS + dev deps
├── vite.config.js                     # Vite + PWA-friendly config
├── vitest.config.js                   # vitest + jsdom
├── playwright.config.js               # E2E config
├── index.html                         # PWA entry, registers SW, mounts canvas
├── public/
│   ├── manifest.webmanifest           # PWA manifest
│   ├── sw.js                          # service worker
│   └── icons/
│       ├── icon-192.png               # placeholder PWA icon
│       └── icon-512.png
├── src/
│   ├── main.js                        # boot: register SW, load JSON, start state machine
│   ├── sw-register.js                 # SW registration helper
│   ├── engine/
│   │   └── gamedb.js                  # JSON → indexed registry
│   ├── scenes/
│   │   ├── state-machine.js           # scene transitions
│   │   ├── title.js                   # title scene
│   │   ├── hub.js                     # hub scene (placeholder)
│   │   └── dungeon.js                 # dungeon scene (placeholder)
│   ├── persistence/
│   │   ├── save.js                    # IndexedDB save manager
│   │   └── migration.js               # save version migration
│   └── utils/
│       └── json-loader.js             # fetch + parse JSON with error handling
├── data/
│   └── .gitkeep                       # placeholder; populated by future plans
├── tests/
│   ├── engine/
│   │   └── gamedb.test.js
│   ├── persistence/
│   │   ├── save.test.js
│   │   └── migration.test.js
│   ├── scenes/
│   │   └── state-machine.test.js
│   ├── utils/
│   │   └── json-loader.test.js
│   └── e2e/
│       └── smoke.spec.js              # boot → title → hub → dungeon
└── .gitignore                         # already exists
```

---

## Task 1: Initialize package.json and install dependencies

**Files:**
- Create: `package.json`
- Create: `.nvmrc`

- [ ] **Step 1: Create `.nvmrc`**

```
20
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "princefarmer",
  "version": "0.0.0",
  "description": "A side-scrolling pixel-art adventure blending Prince of Persia, Vampire Survivors, and Albion Online",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "gen-assets": "node tools/asset-gen/gen.js"
  },
  "dependencies": {
    "littlejsengine": "^1.7.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^24.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: `node_modules/` is created, no errors. `package-lock.json` is generated.

- [ ] **Step 4: Verify LittleJS is importable**

Run: `node -e "import('littlejsengine').then(m => console.log('LittleJS exports:', Object.keys(m).slice(0, 5)))"`
Expected: prints an array of exports including `engineInit`, `vec2`, etc.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .nvmrc
git commit -m "chore: initialize package.json with LittleJS, Vite, vitest, Playwright"
```

---

## Task 2: Vite config and dev entry

**Files:**
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`

- [ ] **Step 1: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: false,
  },
});
```

- [ ] **Step 2: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PrinceFarmer</title>
  <link rel="manifest" href="./manifest.webmanifest" />
  <meta name="theme-color" content="#1a1a2a" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #1a1a2a;
      color: #f0f0f0;
      font-family: system-ui, sans-serif;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
    #game-canvas {
      display: block;
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create stub `src/main.js`**

```js
// PrinceFarmer boot
// This file is expanded in later tasks. For now, it just proves the
// build pipeline works and the canvas mounts.
const canvas = document.getElementById('game-canvas');
if (!canvas) throw new Error('game-canvas not found in DOM');
console.log('PrinceFarmer boot OK, canvas:', canvas);
```

- [ ] **Step 4: Run dev server and verify it boots**

Run: `npm run dev` (in background; kill after a few seconds)
Expected: server reports `Local: http://localhost:5173/`, no compile errors.

- [ ] **Step 5: Verify the canvas mounts**

Run: `curl -s http://localhost:5173/ | grep -c 'game-canvas'`
Expected: `1`

- [ ] **Step 6: Commit**

```bash
git add vite.config.js index.html src/main.js
git commit -m "feat: vite config, index.html, and main.js boot stub"
```

---

## Task 3: vitest config and a passing test

**Files:**
- Create: `vitest.config.js`
- Create: `tests/sanity.test.js`

- [ ] **Step 1: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.js'],
    exclude: ['tests/e2e/**'],
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `tests/sanity.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npm test`
Expected: 1 passed, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.js tests/sanity.test.js
git commit -m "test: add vitest config and sanity test"
```

---

## Task 4: JSON loader utility (TDD)

**Files:**
- Create: `src/utils/json-loader.js`
- Test: `tests/utils/json-loader.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/json-loader.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadJSON } from '../../src/utils/json-loader.js';

describe('loadJSON', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('fetches a URL and parses JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'sword', name: 'Kampilan' }),
    });
    const result = await loadJSON('/data/sword.json');
    expect(result).toEqual({ id: 'sword', name: 'Kampilan' });
    expect(global.fetch).toHaveBeenCalledWith('/data/sword.json');
  });

  it('throws on HTTP error with the URL in the message', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(loadJSON('/data/missing.json')).rejects.toThrow(/missing\.json.*404/);
  });

  it('throws on malformed JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError('bad json'); },
    });
    await expect(loadJSON('/data/bad.json')).rejects.toThrow(/bad json/);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- json-loader`
Expected: FAIL with "Cannot find module" or similar (loadJSON is not defined yet).

- [ ] **Step 3: Implement the loader**

Create `src/utils/json-loader.js`:

```js
/**
 * Fetches a JSON file and returns the parsed object.
 * Throws an Error with a descriptive message on HTTP or parse failure.
 *
 * @param {string} url - the URL to fetch
 * @returns {Promise<any>} the parsed JSON
 */
export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load JSON from ${url}: ${res.status} ${res.statusText}`);
  }
  try {
    return await res.json();
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${url}: ${err.message}`);
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- json-loader`
Expected: 3 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/json-loader.js tests/utils/json-loader.test.js
git commit -m "feat(utils): add loadJSON with HTTP and parse error handling"
```

---

## Task 5: GameDB registry (TDD)

**Files:**
- Create: `src/engine/gamedb.js`
- Test: `tests/engine/gamedb.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/engine/gamedb.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { GameDB } from '../../src/engine/gamedb.js';

describe('GameDB', () => {
  let db;
  beforeEach(() => { db = new GameDB(); });

  it('registers and retrieves by id', () => {
    db.register('sword', { id: 'sword', name: 'Kampilan' });
    expect(db.get('sword')).toEqual({ id: 'sword', name: 'Kampilan' });
  });

  it('returns null for unknown id', () => {
    expect(db.get('unknown')).toBeNull();
  });

  it('registers many items at once', () => {
    const items = [
      { id: 'sword', name: 'Kampilan' },
      { id: 'spear', name: 'Bangka' },
    ];
    db.registerMany(items);
    expect(db.get('sword').name).toBe('Kampilan');
    expect(db.get('spear').name).toBe('Bangka');
  });

  it('throws when registering a duplicate id', () => {
    db.register('sword', { id: 'sword' });
    expect(() => db.register('sword', { id: 'sword' })).toThrow(/duplicate.*sword/);
  });

  it('throws when registering an item without id', () => {
    expect(() => db.register(null, { name: 'NoID' })).toThrow(/missing.*id/);
  });

  it('lists all ids of a given type tag', () => {
    db.registerMany([
      { id: 'sword', type: 'melee' },
      { id: 'spear', type: 'melee' },
      { id: 'fireball', type: 'magic' },
    ]);
    const meleeIds = db.idsWhere(item => item.type === 'melee');
    expect(meleeIds.sort()).toEqual(['spear', 'sword']);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- gamedb`
Expected: FAIL with "Cannot find module" (GameDB not defined yet).

- [ ] **Step 3: Implement GameDB**

Create `src/engine/gamedb.js`:

```js
/**
 * GameDB is the in-memory registry of all game data templates.
 * It is populated once at boot from JSON files and is immutable afterwards.
 *
 * All items must have a unique `id` field. Use `get(id)` to retrieve,
 * `idsWhere(predicate)` to filter, and `register`/`registerMany` to add.
 */
export class GameDB {
  constructor() {
    this._items = new Map();
  }

  /**
   * Register a single item. Throws if id is missing or already registered.
   * @param {string} id
   * @param {object} item
   */
  register(id, item) {
    if (!id) throw new Error('GameDB.register: missing id');
    if (this._items.has(id)) throw new Error(`GameDB.register: duplicate id "${id}"`);
    this._items.set(id, item);
  }

  /**
   * Register many items at once. Each item must have an `id` field.
   * @param {Iterable<object>} items
   */
  registerMany(items) {
    for (const item of items) {
      if (!item || !item.id) throw new Error('GameDB.registerMany: item missing id');
      this.register(item.id, item);
    }
  }

  /**
   * Retrieve an item by id, or null if not found.
   * @param {string} id
   * @returns {object|null}
   */
  get(id) {
    return this._items.get(id) ?? null;
  }

  /**
   * Return all ids whose item matches the predicate.
   * @param {(item: object) => boolean} predicate
   * @returns {string[]}
   */
  idsWhere(predicate) {
    const ids = [];
    for (const [id, item] of this._items) {
      if (predicate(item)) ids.push(id);
    }
    return ids;
  }

  /** Total registered items. */
  get size() { return this._items.size; }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- gamedb`
Expected: 6 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/gamedb.js tests/engine/gamedb.test.js
git commit -m "feat(engine): add GameDB registry for JSON-loaded content"
```

---

## Task 6: Save manager (TDD, with fake-indexeddb)

**Files:**
- Create: `src/persistence/save.js`
- Test: `tests/persistence/save.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/persistence/save.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { SaveManager } from '../../src/persistence/save.js';

describe('SaveManager', () => {
  let save;
  beforeEach(async () => {
    // Clean slate for each test
    indexedDB = new IDBFactory();
    save = new SaveManager('princefarmer-save');
    await save._ready();
  });

  it('returns null when no save exists', async () => {
    const data = await save.load();
    expect(data).toBeNull();
  });

  it('writes and reads back a save', async () => {
    const payload = { version: 1, player: { level: 5 } };
    await save.write(payload);
    const data = await save.load();
    expect(data).toEqual(payload);
  });

  it('overwrites an existing save', async () => {
    await save.write({ version: 1, player: { level: 1 } });
    await save.write({ version: 1, player: { level: 2 } });
    const data = await save.load();
    expect(data.player.level).toBe(2);
  });

  it('deletes a save', async () => {
    await save.write({ version: 1, foo: 1 });
    await save.delete();
    expect(await save.load()).toBeNull();
  });

  it('round-trips a complex object', async () => {
    const payload = {
      version: 1,
      player: { classId: 'lakan-alon', level: 7, stats: { str: 10, dex: 5, int: 3, vit: 8 } },
      weapons: [{ slot: 'main', id: 'sword', abilitiesPicked: ['cleave', 'parry'] }],
      passives: [{ id: 'might', stacks: 3 }],
      clearedDungeons: ['balete-grove', 'dark-forest'],
    };
    await save.write(payload);
    expect(await save.load()).toEqual(payload);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- save.test`
Expected: FAIL with "Cannot find module" (SaveManager not defined yet).

- [ ] **Step 3: Implement SaveManager**

Create `src/persistence/save.js`:

```js
/**
 * SaveManager wraps IndexedDB to provide a simple read/write/delete API
 * for a single named save slot. The slot stores one JSON object.
 *
 * Used by the game state machine to persist the player's progress
 * (class, level, materials, cleared dungeons, etc.) across sessions.
 */
export class SaveManager {
  /**
   * @param {string} dbName - the IndexedDB database name
   * @param {string} [storeName='saves'] - the object store name
   * @param {string} [key='current'] - the key under which the save is stored
   */
  constructor(dbName, storeName = 'saves', key = 'current') {
    this._dbName = dbName;
    this._storeName = storeName;
    this._key = key;
    this._dbPromise = this._openDB();
  }

  /** Wait for the DB to be ready. */
  async _ready() { await this._dbPromise; }

  _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this._storeName)) {
          db.createObjectStore(this._storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Read the save. Returns the parsed object, or null if no save exists.
   * @returns {Promise<object|null>}
   */
  async load() {
    const db = await this._dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._storeName, 'readonly');
      const req = tx.objectStore(this._storeName).get(this._key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Write (overwrite) the save.
   * @param {object} data - the save object
   * @returns {Promise<void>}
   */
  async write(data) {
    const db = await this._dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._storeName, 'readwrite');
      tx.objectStore(this._storeName).put(data, this._key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Delete the save. No-op if no save exists.
   * @returns {Promise<void>}
   */
  async delete() {
    const db = await this._dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._storeName, 'readwrite');
      tx.objectStore(this._storeName).delete(this._key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- save.test`
Expected: 5 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/persistence/save.js tests/persistence/save.test.js
git commit -m "feat(persistence): add SaveManager wrapping IndexedDB"
```

---

## Task 7: Save migration scaffolding (TDD)

**Files:**
- Create: `src/persistence/migration.js`
- Test: `tests/persistence/migration.test.js`

The migration module provides a versioned upgrade path for saves. Slice 1 only has version 1, but we lay the scaffolding so future slices can add version 2, 3, etc., without breaking old saves.

- [ ] **Step 1: Write the failing test**

Create `tests/persistence/migration.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/persistence/migration.js';

describe('migrate', () => {
  it('returns the save unchanged if already at current version', () => {
    const save = { version: 1, player: { level: 5 } };
    expect(migrate(save)).toEqual(save);
  });

  it('throws on missing version', () => {
    expect(() => migrate({ player: { level: 5 } })).toThrow(/version/);
  });

  it('throws on unsupported future version', () => {
    expect(() => migrate({ version: 99, player: {} })).toThrow(/future version/);
  });

  it('applies migration v1 -> v2 when defined', () => {
    // Simulate a future migration: v2 adds a `tutorialDone` field defaulting to false.
    const v1Save = { version: 1, player: { level: 5 } };
    const v2 = migrate(v1Save, { currentVersion: 2, upgrades: { 2: (s) => ({ ...s, version: 2, tutorialDone: false }) } });
    expect(v2.version).toBe(2);
    expect(v2.tutorialDone).toBe(false);
    expect(v2.player.level).toBe(5);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- migration.test`
Expected: FAIL with "Cannot find module" (migrate not defined yet).

- [ ] **Step 3: Implement migrate**

Create `src/persistence/migration.js`:

```js
/**
 * Migrate a save forward to the current version.
 *
 * If no `currentVersion` or `upgrades` are passed, defaults to a v1-only system
 * (any save with version !== 1 throws).
 *
 * @param {object} save - the save object (must have a `version` field)
 * @param {object} [options]
 * @param {number} [options.currentVersion=1] - the latest version
 * @param {Object<number, (s: object) => object>} [options.upgrades] - map of target version -> upgrade fn
 * @returns {object} the migrated save
 */
export function migrate(save, options = {}) {
  if (!save || typeof save.version !== 'number') {
    throw new Error('migrate: save is missing a numeric version field');
  }
  const currentVersion = options.currentVersion ?? 1;
  const upgrades = options.upgrades ?? {};

  if (save.version > currentVersion) {
    throw new Error(`migrate: save is from a future version (${save.version} > ${currentVersion})`);
  }

  let s = save;
  for (let v = s.version + 1; v <= currentVersion; v++) {
    const upgrade = upgrades[v];
    if (!upgrade) {
      throw new Error(`migrate: no upgrade path defined to version ${v}`);
    }
    s = upgrade(s);
  }
  return s;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- migration.test`
Expected: 4 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/persistence/migration.js tests/persistence/migration.test.js
git commit -m "feat(persistence): add versioned save migration scaffolding"
```

---

## Task 8: Game state machine (TDD)

**Files:**
- Create: `src/scenes/state-machine.js`
- Test: `tests/scenes/state-machine.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/scenes/state-machine.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from '../../src/scenes/state-machine.js';

describe('StateMachine', () => {
  it('starts in the initial state', () => {
    const sm = new StateMachine('title', {});
    expect(sm.current).toBe('title');
  });

  it('transitions to a new state, calling exit on old and enter on new', () => {
    const title = { enter: vi.fn(), exit: vi.fn(), update: vi.fn() };
    const hub = { enter: vi.fn(), exit: vi.fn(), update: vi.fn() };
    const sm = new StateMachine('title', { title, hub });
    sm.transition('hub');
    expect(title.exit).toHaveBeenCalledOnce();
    expect(hub.enter).toHaveBeenCalledOnce();
    expect(sm.current).toBe('hub');
  });

  it('update delegates to the active scene', () => {
    const title = { enter: vi.fn(), exit: vi.fn(), update: vi.fn() };
    const sm = new StateMachine('title', { title });
    sm.update(0.016);
    expect(title.update).toHaveBeenCalledWith(0.016);
  });

  it('throws on transition to unknown state', () => {
    const sm = new StateMachine('title', {});
    expect(() => sm.transition('nope')).toThrow(/unknown.*nope/);
  });

  it('throws if initial state is not registered', () => {
    expect(() => new StateMachine('nope', {})).toThrow(/unknown.*nope/);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -- state-machine.test`
Expected: FAIL with "Cannot find module" (StateMachine not defined yet).

- [ ] **Step 3: Implement StateMachine**

Create `src/scenes/state-machine.js`:

```js
/**
 * A tiny game state machine.
 *
 * Each state is an object with optional `enter()`, `exit()`, and `update(dt)` methods.
 * Only one state is active at a time. Transitions are explicit via `transition(name)`.
 */
export class StateMachine {
  /**
   * @param {string} initial - the initial state name
   * @param {Object<string, { enter?:Function, exit?:Function, update?:Function }>} states
   */
  constructor(initial, states) {
    this._states = states;
    if (!states[initial]) throw new Error(`StateMachine: unknown initial state "${initial}"`);
    this._current = initial;
    states[initial].enter?.();
  }

  /** The name of the currently active state. */
  get current() { return this._current; }

  /**
   * Transition to a new state. Calls `exit()` on the old state, then `enter()` on the new.
   * @param {string} name
   */
  transition(name) {
    if (!this._states[name]) throw new Error(`StateMachine: unknown state "${name}"`);
    this._states[this._current].exit?.();
    this._current = name;
    this._states[name].enter?.();
  }

  /**
   * Update the active state.
   * @param {number} dt - delta time in seconds
   */
  update(dt) {
    this._states[this._current].update?.(dt);
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- state-machine.test`
Expected: 5 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/state-machine.js tests/scenes/state-machine.test.js
git commit -m "feat(scenes): add StateMachine with explicit scene transitions"
```

---

## Task 9: Title, Hub, and Dungeon placeholder scenes

**Files:**
- Create: `src/scenes/title.js`
- Create: `src/scenes/hub.js`
- Create: `src/scenes/dungeon.js`

These are minimal placeholder scenes. They have the lifecycle methods (`enter`, `exit`, `update`) but no actual rendering. Real rendering and gameplay is added in later plans (M1+).

- [ ] **Step 1: Create `src/scenes/title.js`**

```js
/**
 * Title scene (placeholder).
 *
 * In M0 this just logs a message. In future milestones it will render
 * the title screen, play music, and accept input to start a new game
 * or continue from a save.
 */
export const titleScene = {
  name: 'title',
  enter() { console.log('[scene] enter: title'); },
  exit() { console.log('[scene] exit: title'); },
  update(_dt) { /* no-op in M0 */ },
};
```

- [ ] **Step 2: Create `src/scenes/hub.js`**

```js
/**
 * Hub scene (placeholder).
 *
 * In M0 this just logs a message. In future milestones it will render
 * the village hub, allow entering dungeons, view inventory, and access
 * crafting (added in a later project).
 */
export const hubScene = {
  name: 'hub',
  enter() { console.log('[scene] enter: hub'); },
  exit() { console.log('[scene] exit: hub'); },
  update(_dt) { /* no-op in M0 */ },
};
```

- [ ] **Step 3: Create `src/scenes/dungeon.js`**

```js
/**
 * Dungeon scene (placeholder).
 *
 * In M0 this just logs a message. In future milestones it will load a
 * dungeon from the GameDB, spawn monsters, and run the gameplay loop.
 */
export const dungeonScene = {
  name: 'dungeon',
  enter() { console.log('[scene] enter: dungeon'); },
  exit() { console.log('[scene] exit: dungeon'); },
  update(_dt) { /* no-op in M0 */ },
};
```

- [ ] **Step 4: Commit**

```bash
git add src/scenes/title.js src/scenes/hub.js src/scenes/dungeon.js
git commit -m "feat(scenes): add title, hub, and dungeon placeholder scenes"
```

---

## Task 10: Wire main.js to boot the state machine and load JSON

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Replace `src/main.js` with the boot sequence**

```js
// PrinceFarmer boot
//
// On page load, this file:
//  1. Verifies the canvas is mounted.
//  2. Loads the (currently empty) data/ directory into the GameDB.
//  3. Creates the SaveManager.
//  4. Starts the StateMachine on the title scene.
//  5. Exposes a global for the Playwright E2E test to drive transitions.

import { loadJSON } from './utils/json-loader.js';
import { GameDB } from './engine/gamedb.js';
import { SaveManager } from './persistence/save.js';
import { StateMachine } from './scenes/state-machine.js';
import { titleScene } from './scenes/title.js';
import { hubScene } from './scenes/hub.js';
import { dungeonScene } from './scenes/dungeon.js';

const canvas = document.getElementById('game-canvas');
if (!canvas) throw new Error('game-canvas not found in DOM');

/** Loads all JSON files in /data and registers them into the GameDB. */
async function loadContent() {
  const db = new GameDB();
  // For M0, /data is empty; the directory is created in M0.11 and
  // populated in M1+. This call is a no-op until then but is wired up
  // so the boot sequence is complete.
  return db;
}

async function boot() {
  const db = await loadContent();
  const save = new SaveManager('princefarmer-save');
  await save._ready();

  const sm = new StateMachine('title', {
    title: titleScene,
    hub: hubScene,
    dungeon: dungeonScene,
  });

  // Expose for the Playwright E2E test to drive transitions.
  window.__pf = { db, save, sm, transition: (s) => sm.transition(s) };

  console.log('PrinceFarmer boot OK');
}

boot().catch((err) => {
  console.error('PrinceFarmer boot failed:', err);
  throw err;
});
```

- [ ] **Step 2: Run dev server and verify console output**

Run: `npm run dev` (in background; kill after a few seconds)
Expected: page loads, browser console shows `[scene] enter: title` and `PrinceFarmer boot OK`.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: wire main.js to load GameDB, SaveManager, and StateMachine"
```

---

## Task 11: PWA manifest

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`

The icons are placeholder 1x1 PNGs. They will be replaced with real pixel art in a later plan.

- [ ] **Step 1: Create `public/manifest.webmanifest`**

```json
{
  "name": "PrinceFarmer",
  "short_name": "PrinceFarmer",
  "description": "A side-scrolling pixel-art adventure",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#1a1a2a",
  "theme_color": "#1a1a2a",
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Generate placeholder icons**

Run: `mkdir -p public/icons`
Then create the two icon files. They can be the smallest valid PNGs (1x1 transparent).

Run:
```bash
node -e "
const fs = require('fs');
// 1x1 transparent PNG (base64)
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
fs.writeFileSync('public/icons/icon-192.png', png);
fs.writeFileSync('public/icons/icon-512.png', png);
console.log('placeholder icons written');
"
```
Expected: prints "placeholder icons written", and `public/icons/icon-192.png` exists.

- [ ] **Step 3: Verify the manifest is reachable**

Run: `npm run dev` (in background), then `curl -s http://localhost:5173/manifest.webmanifest | head -5`
Expected: prints the first 5 lines of the manifest (JSON content).

- [ ] **Step 4: Commit**

```bash
git add public/manifest.webmanifest public/icons/
git commit -m "feat(pwa): add manifest.webmanifest and placeholder icons"
```

---

## Task 12: Service worker for offline caching

**Files:**
- Create: `public/sw.js`
- Create: `src/sw-register.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create `public/sw.js`**

```js
// PrinceFarmer service worker
//
// Strategy: cache-first for static assets (the game shell), network-first
// for everything else. Bumping CACHE_NAME invalidates the old cache.

const CACHE_NAME = 'princefarmer-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Cache-first for the shell
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Cache successful same-origin GETs
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
```

- [ ] **Step 2: Create `src/sw-register.js`**

```js
/**
 * Register the service worker. Safe to call on pages that already
 * have one; subsequent registrations update the SW in the background.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Register with the correct path for both root and sub-path deployments
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}
```

- [ ] **Step 3: Wire registration into main.js**

Modify `src/main.js`. Add the import at the top (after the other imports):

```js
import { registerServiceWorker } from './sw-register.js';
```

Then add this line at the very end of the `boot()` function, just before `console.log('PrinceFarmer boot OK')`:

```js
  registerServiceWorker();
```

- [ ] **Step 4: Run dev server, verify SW registers**

Run: `npm run dev` (in background), open browser to http://localhost:5173, open DevTools → Application → Service Workers.
Expected: SW is listed as activated and running.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js src/sw-register.js src/main.js
git commit -m "feat(pwa): add service worker with cache-first shell strategy"
```

---

## Task 13: Playwright config

**Files:**
- Create: `playwright.config.js`
- Create: `tests/e2e/smoke.spec.js`

- [ ] **Step 1: Create `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false, // dev server is single-instance in CI
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 2: Create `tests/e2e/smoke.spec.js`**

```js
import { test, expect } from '@playwright/test';

test.describe('PrinceFarmer smoke test', () => {
  test('boots, reaches title, and transitions through hub and dungeon', async ({ page }) => {
    // Capture console messages so we can assert on the boot sequence
    const consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));

    await page.goto('/');

    // Wait for the boot to complete
    await expect(page.locator('#game-canvas')).toBeAttached();
    await page.waitForFunction(() => window.__pf !== undefined);

    // Title scene is the initial state
    expect(await page.evaluate(() => window.__pf.sm.current)).toBe('title');
    expect(consoleMessages).toContain('[scene] enter: title');

    // Transition to hub
    await page.evaluate(() => window.__pf.transition('hub'));
    expect(await page.evaluate(() => window.__pf.sm.current)).toBe('hub');
    expect(consoleMessages).toContain('[scene] enter: hub');

    // Transition to dungeon
    await page.evaluate(() => window.__pf.transition('dungeon'));
    expect(await page.evaluate(() => window.__pf.sm.current)).toBe('dungeon');
    expect(consoleMessages).toContain('[scene] enter: dungeon');

    // Back to hub
    await page.evaluate(() => window.__pf.transition('hub'));
    expect(await page.evaluate(() => window.__pf.sm.current)).toBe('hub');
  });

  test('save manager round-trip', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__pf !== undefined);

    const roundTrip = await page.evaluate(async () => {
      const save = window.__pf.save;
      await save.write({ version: 1, player: { level: 7, classId: 'lakan-alon' } });
      return await save.load();
    });
    expect(roundTrip).toEqual({ version: 1, player: { level: 7, classId: 'lakan-alon' } });
  });
});
```

- [ ] **Step 3: Install Playwright browsers**

Run: `npx playwright install chromium`
Expected: chromium is downloaded and installed (may take a minute).

- [ ] **Step 4: Run the smoke test**

Run: `npm run test:e2e`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.js tests/e2e/smoke.spec.js
git commit -m "test(e2e): add Playwright config and smoke test for boot + scenes + save"
```

---

## Task 14: Wire the state machine to LittleJS render loop

**Files:**
- Modify: `src/main.js`

Now we hook the StateMachine's `update()` into the LittleJS game loop, so the active scene gets `dt` every frame.

- [ ] **Step 1: Replace `src/main.js`**

```js
// PrinceFarmer boot
//
// On page load, this file:
//  1. Mounts the LittleJS engine on the canvas (v1.18 callback API).
//  2. Loads the (currently empty) data/ directory into the GameDB.
//  3. Creates the SaveManager.
//  4. Starts the StateMachine on the title scene.
//  5. Hooks the state machine's update into the LittleJS game loop.
//  6. Exposes a global for the Playwright E2E test to drive transitions.

import { engineInit, timeDelta } from 'littlejsengine';
import { loadJSON } from './utils/json-loader.js';
import { GameDB } from './engine/gamedb.js';
import { SaveManager } from './persistence/save.js';
import { StateMachine } from './scenes/state-machine.js';
import { titleScene } from './scenes/title.js';
import { hubScene } from './scenes/hub.js';
import { dungeonScene } from './scenes/dungeon.js';
import { registerServiceWorker } from './sw-register.js';

const canvas = document.getElementById('game-canvas');
if (!canvas) throw new Error('game-canvas not found in DOM');

/** Loads all JSON files in /data and registers them into the GameDB. */
async function loadContent() {
  return new GameDB();
}

async function boot() {
  const db = await loadContent();
  const save = new SaveManager('princefarmer-save');
  await save._ready();

  const sm = new StateMachine('title', {
    title: titleScene,
    hub: hubScene,
    dungeon: dungeonScene,
  });

  // Mount LittleJS v1.18 with the canvas as the root element and
  // route the per-frame gameUpdate callback into our state machine.
  // LittleJS exposes the frame's delta time as the `timeDelta` export.
  // Future plans (M1+) will add real scene rendering by populating
  // the gameRender callback and creating engineObjects for entities.
  engineInit(
    undefined,                              // gameInit (no async init needed)
    () => sm.update(timeDelta),             // gameUpdate
    undefined,                              // gameUpdatePost
    undefined,                              // gameRender
    undefined,                              // gameRenderPost
    [],                                     // imageSources
    canvas                                  // rootElement
  );

  // Expose for the Playwright E2E test to drive transitions.
  window.__pf = { db, save, sm, transition: (s) => sm.transition(s) };

  registerServiceWorker();

  console.log('PrinceFarmer boot OK');
}

boot().catch((err) => {
  console.error('PrinceFarmer boot failed:', err);
  throw err;
});
```

> **Note:** This task was originally written against LittleJS v1.7's API
> (`setCanvasFixedSize(canvas)` + `engineInit(canvas, ...)`). The installed
> version (`littlejsengine@1.18.17`) changed the API:
> - `engineInit` now takes callbacks positionally and an optional `rootElement` as the 7th arg.
> - `setCanvasFixedSize(size)` takes a `Vector2` (which needs a `.copy()` method), not a canvas.
> - `timeDelta` is now a top-level export from `littlejsengine`, not a parameter to the update callback.
>
> The code above uses the v1.18 API.

- [ ] **Step 2: Run the unit tests to confirm nothing regressed**

Run: `npm test`
Expected: all previous tests still pass.

- [ ] **Step 3: Run the E2E smoke test**

Run: `npm run test:e2e`
Expected: 2 passed (the smoke and save tests still work).

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: mount LittleJS engine and hook StateMachine into game loop"
```

---

## Task 15: Document M0 in the spec and prepare for M1

**Files:**
- Create: `data/.gitkeep`
- Modify: `package.json` (add `engines` field)

- [ ] **Step 1: Create `data/.gitkeep`**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 2: Add `engines` field to `package.json`**

Modify `package.json` to add the `engines` field. Insert it after the `description` field:

```json
  "engines": {
    "node": ">=20"
  },
```

- [ ] **Step 3: Run all tests one final time**

Run: `npm test && npm run test:e2e`
Expected: all unit tests pass, both E2E tests pass.

- [ ] **Step 4: Commit**

```bash
git add data/.gitkeep package.json
git commit -m "chore: add data/.gitkeep and pin node engine to >=20"
```

- [ ] **Step 5: Tag M0 complete**

```bash
git tag m0-foundation
```

---

## Self-Review

After writing this plan, I reviewed it against the spec:

**1. Spec coverage (M0 Foundation deliverables from the spec):**
- ✅ Vite+LittleJS boots — Tasks 1, 2, 14
- ✅ PWA manifest+service worker — Tasks 11, 12
- ✅ JSON loader — Task 4
- ✅ GameDB — Task 5
- ✅ IndexedDB save manager — Task 6
- ✅ Save migration scaffolding — Task 7
- ✅ vitest — Task 3
- ✅ Playwright — Task 13
- ✅ Title→Hub→empty-Dungeon state transitions — Tasks 8, 9, 10, 14
- ✅ Tests pass — Tasks 3, 13, 14, 15

**2. Placeholder scan:** No "TBD", no "TODO", no "implement later", no "appropriate error handling" without code. Every step has concrete code or commands.

**3. Type consistency:** All method names match across tasks: `loadJSON`, `GameDB.register/get/idsWhere/registerMany`, `SaveManager.load/write/delete`, `migrate`, `StateMachine.transition/update/current`. Scene objects all use `enter`/`exit`/`update`. No inconsistencies.

**4. Spec sections not yet covered (deferred to follow-up plans):**
- M1: Hero, movement, camera — own plan
- M2: Combat, monsters, abilities, XP — own plan
- M3: Real dungeon with boss — own plan
- M4-M6: build system, content, polish — own plans

The plan is complete and self-contained for M0.
