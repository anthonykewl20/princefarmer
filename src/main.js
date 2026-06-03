// PrinceFarmer boot
//
// On page load, this file:
//  1. Verifies the canvas is mounted.
//  2. Loads the (currently empty) data/ directory into the GameDB.
//  3. Creates the SaveManager.
//  4. Starts the StateMachine on the title scene.
//  5. Exposes a global for the Playwright E2E test to drive transitions.

import { loadJSON } from './utils/json-loader.js';
import { GameDB } from './engine/gamedb.js';
import { SaveManager } from './persistence/save.js';
import { StateMachine } from './scenes/state-machine.js';
import { titleScene } from './scenes/title.js';
import { hubScene } from './scenes/hub.js';
import { dungeonScene } from './scenes/dungeon.js';
import { registerServiceWorker } from './sw-register.js';

const canvas = document.getElementById('game-canvas');
if (!canvas) throw new Error('game-canvas not found in DOM');

/** Loads all JSON files in /data and registers them into the GameDB. */
async function loadContent() {
  const db = new GameDB();
  // For M0, /data is empty; the directory is created in M0.11 and
  // populated in M1+. This call is a no-op until then but is wired up
  // so the boot sequence is complete.
  return db;
}

async function boot() {
  const db = await loadContent();
  const save = new SaveManager('princefarmer-save');
  await save._ready();

  const sm = new StateMachine('title', {
    title: titleScene,
    hub: hubScene,
    dungeon: dungeonScene,
  });

  // Expose for the Playwright E2E test to drive transitions.
  window.__pf = { db, save, sm, transition: (s) => sm.transition(s) };

  registerServiceWorker();

  console.log('PrinceFarmer boot OK');
}

boot().catch((err) => {
  console.error('PrinceFarmer boot failed:', err);
  throw err;
});
