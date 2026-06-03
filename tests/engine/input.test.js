import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInput, KEY_BINDINGS } from '../../src/engine/input.js';

describe('input', () => {
  let input;
  beforeEach(() => { input = createInput(); });

  describe('KEY_BINDINGS', () => {
    it('maps semantic actions to a list of acceptable key codes', () => {
      expect(KEY_BINDINGS.left).toEqual(expect.arrayContaining(['ArrowLeft', 'KeyA']));
      expect(KEY_BINDINGS.right).toEqual(expect.arrayContaining(['ArrowRight', 'KeyD']));
      expect(KEY_BINDINGS.jump).toEqual(expect.arrayContaining(['Space']));
      expect(KEY_BINDINGS.up).toEqual(expect.arrayContaining(['ArrowUp', 'KeyW']));
      expect(KEY_BINDINGS.down).toEqual(expect.arrayContaining(['ArrowDown', 'KeyS']));
      expect(KEY_BINDINGS.escape).toEqual(expect.arrayContaining(['Escape']));
      expect(KEY_BINDINGS.interact).toEqual(expect.arrayContaining(['KeyE', 'Enter']));
    });
  });

  describe('isPressed', () => {
    it('returns false for an unbound action', () => {
      expect(input.isPressed('attack')).toBe(false);
    });

    it('returns true when any binding is currently down', () => {
      input._set('KeyA', true);
      expect(input.isPressed('left')).toBe(true);
      input._set('KeyA', false);
      expect(input.isPressed('left')).toBe(false);
    });

    it('returns true when any of multiple bindings are down', () => {
      input._set('ArrowLeft', true);
      expect(input.isPressed('left')).toBe(true);
    });
  });

  describe('wasJustPressed', () => {
    it('returns true only on the frame the key transitioned from up to down', () => {
      input._set('Space', true);
      expect(input.wasJustPressed('jump')).toBe(true);
      // On the next poll, it should no longer be "just pressed"
      expect(input.wasJustPressed('jump')).toBe(false);
    });

    it('returns false when the key was already down', () => {
      input._set('Space', true);
      input.wasJustPressed('jump'); // first poll — true
      expect(input.wasJustPressed('jump')).toBe(false); // second poll — false
    });

    it('returns false for an unbound action', () => {
      expect(input.wasJustPressed('attack')).toBe(false);
    });
  });

  describe('endFrame', () => {
    it('clears the just-pressed flags when called', () => {
      input._set('Space', true);
      input.wasJustPressed('jump');
      input.endFrame();
      expect(input.wasJustPressed('jump')).toBe(false);
    });
  });

  describe('window event integration', () => {
    it('listens to keydown and keyup on construction (when window is provided)', () => {
      const win = { addEventListener: vi.fn() };
      createInput(win);
      expect(win.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(win.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });
  });
});
