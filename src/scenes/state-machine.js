/**
 * A tiny game state machine.
 *
 * Each state is an object with optional `enter()`, `exit()`, and `update(dt)` methods.
 * Only one state is active at a time. Transitions are explicit via `transition(name)`.
 *
 * On construction, the StateMachine injects a back-reference (`_stateMachine`)
 * into every registered scene so it can call `transition()` from within
 * `update()` or `enter()`. This avoids each scene needing its own
 * setter wired up at boot.
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
    // Inject the back-reference into every scene so any of them can
    // request a transition via `this._stateMachine.transition(...)`.
    for (const scene of Object.values(states)) {
      if (scene && typeof scene === 'object') scene._stateMachine = this;
    }
    states[initial].enter?.();
  }

  /** The name of the currently active state. */
  get current() { return this._current; }

  /**
   * Read-only view of the registered states, keyed by name. Useful for
   * tests and dev tools that need to inspect a scene's internal state
   * without reaching into the private `_states` field.
   */
  get scenes() {
    return this._states;
  }

  /**
   * Transition to a new state. Calls `exit()` on the old state, then `enter(ctx)` on the new.
   * @param {string} name
   * @param {object} [ctx] - optional context object forwarded to the new state's enter()
   */
  transition(name, ctx) {
    if (!this._states[name]) throw new Error(`StateMachine: unknown state "${name}"`);
    this._states[this._current].exit?.();
    this._current = name;
    this._states[name].enter?.(ctx);
  }

  /**
   * Update the active state.
   * @param {number} dt - delta time in seconds
   */
  update(dt) {
    this._states[this._current].update?.(dt);
  }

  /**
   * Render the active state.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    this._states[this._current].render?.(ctx);
  }
}
