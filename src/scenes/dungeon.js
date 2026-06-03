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
