/**
 * Element registry — the spine of M3.
 *
 * Each element has a stable id (used in JSON), a display name (HUD), and
 * a hex color (UI tinting). Centralized so weapons, passives, and UI
 * share one source of truth.
 *
 * Pure module — no game state.
 */

export const ELEMENTS = [
  { id: 'fire',     name: 'Fire',     color: '#c0392b' },
  { id: 'water',    name: 'Water',    color: '#3a7ec8' },
  { id: 'earth',    name: 'Earth',    color: '#8a6a3a' },
  { id: 'air',      name: 'Air',      color: '#a0c8d8' },
  { id: 'lightning',name: 'Lightning',color: '#c8c83a' },
  { id: 'spirit',   name: 'Spirit',   color: '#8a3ac8' },
];

const BY_ID = new Map(ELEMENTS.map((e) => [e.id, e]));

export function isElement(id) {
  return BY_ID.has(id);
}

export function getElement(id) {
  return BY_ID.get(id) ?? null;
}
