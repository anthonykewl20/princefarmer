/**
 * Monster sprite prompt templates (M2: aswang).
 *
 * The M2 plan ships one monster — the aswang, a Filipino folklore ghoul
 * used as a fodder melee chaser. Other monsters land in later milestones.
 *
 * Animations are derived from the monster's behavior state: idle, strafe
 * (walking or orbital movement), and lunge (commit to a strike).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const styleGuide = JSON.parse(readFileSync(join(__dirname, '..', 'style-guide.json'), 'utf8'));

const ANIM_DESCRIPTIONS = {
  idle: 'crouched, weight low, head tilted, glowing yellow eyes, slight breathing',
  strafe: 'mid-stride circling, one foot off the ground, claws extended, head tracking target',
  lunge: 'lunging forward, body extended, arms reaching out with claws, maw open',
  hurt: 'recoiling backward, hunched, mouth open in a snarl',
};

/**
 * Aswang-specific base description: Filipino folklore ghoul, lean and
 * feral, hunched silhouette, glowing yellow eyes, dark earthy skin.
 */
const ASWANG_BASE = 'Filipino aswang folklore creature, hunched ghoul silhouette, glowing yellow eyes, maw with fangs, lean and feral, dark earthy skin, tattered cloth wraps';

/**
 * Build a prompt for an aswang animation frame.
 * @param {string} anim - one of: idle, strafe, lunge, hurt
 * @param {number} frame - 0-based frame index
 * @returns {string} the prompt
 */
export function aswangPrompt(anim, frame) {
  const desc = ANIM_DESCRIPTIONS[anim] ?? ANIM_DESCRIPTIONS.idle;
  return [
    styleGuide.basePrompt,
    styleGuide.monsterNotes,
    `${ASWANG_BASE}`,
    `pose: ${desc}`,
    `frame ${frame + 1} of animation cycle`,
    'centered in frame, side view, no background, transparent png',
  ].join(', ');
}

export const ASWANG_ANIMS = Object.keys(ANIM_DESCRIPTIONS);
