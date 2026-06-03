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
