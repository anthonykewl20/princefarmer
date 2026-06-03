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
