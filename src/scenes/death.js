/**
 * Death scene.
 *
 * Shows a "YOU DIED" overlay for 1.5s, then transitions to the hub.
 * M2 keeps this simple: no stats screen, no run summary. The hub's
 * enter() restores the player's HP.
 */

const OVERLAY_DURATION = 1.5; // seconds

export const deathScene = {
  name: 'death',
  enter(ctx = {}) {
    this._timer = 0;
    this._returnTo = ctx.returnTo || 'hub';
    this._dungeonId = ctx.dungeonId;
  },
  exit() {
    this._timer = 0;
    this._returnTo = null;
    this._dungeonId = null;
  },
  update(dt) {
    this._timer += dt;
    if (this._timer >= OVERLAY_DURATION) {
      this._stateMachine.transition(this._returnTo, { dungeonId: this._dungeonId });
    }
  },
  render(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU DIED', w / 2, h / 2);
    ctx.fillStyle = '#888';
    ctx.font = '20px monospace';
    ctx.fillText('Returning to hub...', w / 2, h / 2 + 48);
  },
};
