import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from '../../src/scenes/state-machine.js';

describe('StateMachine', () => {
  it('starts in the initial state', () => {
    const sm = new StateMachine('title', { title: {} });
    expect(sm.current).toBe('title');
  });

  it('transitions to a new state, calling exit on old and enter on new', () => {
    const title = { enter: vi.fn(), exit: vi.fn(), update: vi.fn() };
    const hub = { enter: vi.fn(), exit: vi.fn(), update: vi.fn() };
    const sm = new StateMachine('title', { title, hub });
    sm.transition('hub');
    expect(title.exit).toHaveBeenCalledOnce();
    expect(hub.enter).toHaveBeenCalledOnce();
    expect(sm.current).toBe('hub');
  });

  it('update delegates to the active scene', () => {
    const title = { enter: vi.fn(), exit: vi.fn(), update: vi.fn() };
    const sm = new StateMachine('title', { title });
    sm.update(0.016);
    expect(title.update).toHaveBeenCalledWith(0.016);
  });

  it('throws on transition to unknown state', () => {
    const sm = new StateMachine('title', { title: {} });
    expect(() => sm.transition('nope')).toThrow(/unknown.*nope/);
  });

  it('throws if initial state is not registered', () => {
    expect(() => new StateMachine('nope', {})).toThrow(/unknown.*nope/);
  });
});
