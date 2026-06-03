/**
 * Tile grid + collision helpers.
 *
 * Tiles are stored as a 2D array of single-character codes:
 *   '.' = empty / passable
 *   '#' = solid (blocks movement)
 *   'L' = ladder (climbable)
 *
 * World units: 1 tile = 1 world unit by default. Adjust TILE_SIZE if you
 * want larger tiles (e.g. 16x16 pixel tiles in a 320x180 viewport).
 */

/** Tile type: empty (passable). */
export const TILE_EMPTY = '.';

/** Tile type: solid (blocks movement). */
export const TILE_SOLID = '#';

/** Tile type: ladder (climbable, replaces gravity when on it). */
export const TILE_LADDER = 'L';

/** Size of one tile in world units. */
export const TILE_SIZE = 1;

/**
 * Create a tile grid from a 2D array of strings.
 * @param {string[]} rows - each string is one row, top to bottom
 * @returns {{ width:number, height:number, rows:string[] }}
 */
export function createTileGrid(rows) {
  const width = rows[0]?.length ?? 0;
  for (const row of rows) {
    if (row.length !== width) {
      throw new Error(`createTileGrid: inconsistent row width (expected ${width}, got ${row.length})`);
    }
  }
  return { width, height: rows.length, rows };
}

/**
 * Get the tile at grid coordinates (x, y). Out-of-bounds returns TILE_EMPTY.
 * @param {{width:number, height:number, rows:string[]}} grid
 * @param {number} x - column
 * @param {number} y - row
 * @returns {string} the tile character
 */
export function getTile(grid, x, y) {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return TILE_EMPTY;
  return grid.rows[y][x];
}

/** @returns {boolean} */
export function isSolid(tile) { return tile === TILE_SOLID; }

/** @returns {boolean} */
export function isLadder(tile) { return tile === TILE_LADDER; }
