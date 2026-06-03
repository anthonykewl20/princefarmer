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
