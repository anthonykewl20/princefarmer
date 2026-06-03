/**
 * Hero sprite prompt templates.
 * Combines the style guide's base prompt + hero notes + per-anim instructions.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const styleGuide = JSON.parse(readFileSync(join(__dirname, '..', 'style-guide.json'), 'utf8'));

const ANIM_DESCRIPTIONS = {
  idle: 'standing still, slight breathing motion, weight on both feet',
  run: 'mid-run cycle, one leg forward one back, arms swinging',
  jump: 'jumping upward, knees bent, one arm raised',
  climb: 'climbing a vertical surface, one hand above head, one at chest height, legs apart',
  hurt: 'recoiling from a hit, head tilted back, mouth open',
  death: 'collapsing to the ground, body slumping, head fallen back',
};

/**
 * Build a prompt for a single hero animation frame.
 * @param {string} anim - one of: idle, run, jump, climb, hurt, death
 * @param {number} frame - 0-based frame index
 * @returns {string} the prompt
 */
export function heroPrompt(anim, frame) {
  const desc = ANIM_DESCRIPTIONS[anim] ?? ANIM_DESCRIPTIONS.idle;
  return [
    styleGuide.basePrompt,
    styleGuide.heroNotes,
    `pose: ${desc}`,
    `frame ${frame + 1} of animation cycle`,
    'centered in frame, side view, no background, transparent png',
  ].join(', ');
}

export const HERO_ANIMS = Object.keys(ANIM_DESCRIPTIONS);
