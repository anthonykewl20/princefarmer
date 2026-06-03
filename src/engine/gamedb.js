/**
 * GameDB is the in-memory registry of all game data templates.
 * It is populated once at boot from JSON files and is immutable afterwards.
 *
 * All items must have a unique `id` field. Use `get(id)` to retrieve,
 * `idsWhere(predicate)` to filter, and `register`/`registerMany` to add.
 */

// Vite glob imports — these resolve at build time to all matching JSON files.
// Each is a map: { './path/to/file.json': ModuleObject }.
const roomModules = import.meta.glob('../../data/rooms/*.json', { eager: true });
const dungeonModules = import.meta.glob('../../data/dungeons/*.json', { eager: true });
const weaponModules = import.meta.glob('../../data/weapons.json', { eager: true });
const monsterModules = import.meta.glob('../../data/monsters.json', { eager: true });
const abilityModules = import.meta.glob('../../data/abilities.json', { eager: true });

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

/** Load all room JSON into a new GameDB. */
export function loadRooms() {
  const db = new GameDB();
  for (const mod of Object.values(roomModules)) {
    db.register(mod.id, mod);
  }
  return db;
}

/** Load all dungeon JSON into a new GameDB. */
export function loadDungeons() {
  const db = new GameDB();
  for (const mod of Object.values(dungeonModules)) {
    db.register(mod.id, mod);
  }
  return db;
}

/** Load all weapons into a new GameDB. */
export function loadWeapons() {
  const db = new GameDB();
  for (const mod of Object.values(weaponModules)) {
    const data = mod.default ?? mod;
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      db.register(item.id, item);
    }
  }
  return db;
}

/** Load all monsters into a new GameDB. */
export function loadMonsters() {
  const db = new GameDB();
  for (const mod of Object.values(monsterModules)) {
    const data = mod.default ?? mod;
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      db.register(item.id, item);
    }
  }
  return db;
}

/** Load all abilities into a new GameDB. */
export function loadAbilities() {
  const db = new GameDB();
  for (const mod of Object.values(abilityModules)) {
    const data = mod.default ?? mod;
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      db.register(item.id, item);
    }
  }
  return db;
}
