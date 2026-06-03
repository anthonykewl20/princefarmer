/**
 * Input handler — tracks keyboard state and exposes semantic actions.
 *
 * The game reads from this module; it does NOT add its own event listeners.
 * That makes input easy to mock in tests and easy to swap for gamepad/touch
 * later without changing consumers.
 */

/**
 * Map of semantic action names → list of acceptable KeyboardEvent.code values.
 * Adding a new control is one line here; the rest of the game references
 * actions by name (`input.isPressed('jump')`), not by key code.
 */
export const KEY_BINDINGS = {
  left:    ['ArrowLeft', 'KeyA'],
  right:   ['ArrowRight', 'KeyD'],
  up:      ['ArrowUp', 'KeyW'],
  down:    ['ArrowDown', 'KeyS'],
  jump:    ['Space'],
  escape:  ['Escape'],
  interact: ['KeyE', 'Enter'],
  attack2: ['KeyQ', 'ShiftLeft'],
};

/**
 * Create an input handler. Optionally pass a `window`-like object that
 * has `addEventListener`. When omitted (e.g. in tests), the handler
 * runs in "manual" mode and the caller drives state via `_set`.
 *
 * @param {object} [win] - window-like object
 * @returns {object} input handler
 */
export function createInput(win) {
  const down = new Set();          // currently-held key codes
  const justPressed = new Set();   // key codes pressed since last endFrame

  if (win && typeof win.addEventListener === 'function') {
    const onDown = (e) => {
      if (!down.has(e.code)) justPressed.add(e.code);
      down.add(e.code);
    };
    const onUp = (e) => { down.delete(e.code); };
    win.addEventListener('keydown', onDown);
    win.addEventListener('keyup', onUp);
  }

  /** Internal helper for tests to drive state. */
  function _set(code, isDown) {
    if (isDown) {
      if (!down.has(code)) justPressed.add(code);
      down.add(code);
    } else {
      down.delete(code);
    }
  }

  /**
   * @param {string} action - one of KEY_BINDINGS keys
   * @returns {boolean}
   */
  function isPressed(action) {
    const codes = KEY_BINDINGS[action];
    if (!codes) return false;
    return codes.some((c) => down.has(c));
  }

  /**
   * True only on the frame the action transitioned to pressed.
   * Multi-consumer safe: multiple polls in the same frame all see the
   * press; `endFrame()` (called once per game frame) is the only thing
   * that clears the flag.
   * @param {string} action
   * @returns {boolean}
   */
  function wasJustPressed(action) {
    const codes = KEY_BINDINGS[action];
    if (!codes) return false;
    return codes.some((c) => justPressed.has(c));
  }

  /** Clear the just-pressed flags. Call at end of each game frame. */
  function endFrame() {
    justPressed.clear();
  }

  return { isPressed, wasJustPressed, endFrame, _set };
}
