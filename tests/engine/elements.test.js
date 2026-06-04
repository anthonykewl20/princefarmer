import { describe, it, expect } from 'vitest';
import { ELEMENTS, isElement, getElement } from '../../src/engine/elements.js';

describe('ELEMENTS', () => {
  it('has exactly 6 elements', () => {
    expect(ELEMENTS.length).toBe(6);
  });

  it('contains all 6 element ids', () => {
    const ids = ELEMENTS.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['fire', 'water', 'earth', 'air', 'lightning', 'spirit']));
  });

  it('each element has a display name and color', () => {
    for (const e of ELEMENTS) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('ids are unique', () => {
    const ids = ELEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('isElement', () => {
  it('returns true for known ids', () => {
    expect(isElement('fire')).toBe(true);
    expect(isElement('spirit')).toBe(true);
  });
  it('returns false for unknown ids', () => {
    expect(isElement('void')).toBe(false);
    expect(isElement(null)).toBe(false);
  });
});

describe('getElement', () => {
  it('returns the element object for a known id', () => {
    expect(getElement('fire').name).toBe('Fire');
  });
  it('returns null for unknown id', () => {
    expect(getElement('void')).toBeNull();
  });
});
