/**
 * Behaviors registry.
 *
 * Each key is a behavior id referenced from a monster template's
 * `behavior` field. Each value is a pure function that reads the world
 * and mutates the monster's vx/vy/action/lungeTimer/facing.
 *
 * To add a new behavior: implement the function, add it here, and
 * reference it from the monster template.
 */

import { strafeLunge } from './strafe-lunge.js';

export const BEHAVIORS = {
  'strafe-lunge': strafeLunge,
};
