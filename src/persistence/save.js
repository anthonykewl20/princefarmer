import { migrate, UPGRADES } from './migration.js';

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
   * The save is run through `migrate()` so callers always receive the
   * current save version.
   * @returns {Promise<object|null>}
   */
  async load() {
    const db = await this._dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._storeName, 'readonly');
      const req = tx.objectStore(this._storeName).get(this._key);
      req.onsuccess = () => {
        const raw = req.result ?? null;
        if (raw == null) return resolve(null);
        // M2: default currentVersion to the highest version we have an
        // upgrade for. Bump this when v3 lands.
        const currentVersion = Math.max(...Object.keys(UPGRADES).map(Number), 1);
        try {
          resolve(migrate(raw, { currentVersion, upgrades: UPGRADES }));
        } catch (e) {
          // Migration is best-effort: if the save is unrecoverable,
          // surface the error so the caller can decide what to do.
          reject(e);
        }
      };
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

  /**
   * Static convenience: open a default SaveManager and write the data.
   * For game-level saves, you don't need a custom dbName.
   * @param {object} data
   * @returns {Promise<void>}
   */
  static async save(data) {
    const mgr = new SaveManager('princefarmer-save');
    await mgr._ready();
    return mgr.write(data);
  }
}
