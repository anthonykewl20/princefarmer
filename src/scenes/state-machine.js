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
}
