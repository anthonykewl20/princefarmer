// PrinceFarmer boot
// This file is expanded in later tasks. For now, it just proves the
// build pipeline works and the canvas mounts.
const canvas = document.getElementById('game-canvas');
if (!canvas) throw new Error('game-canvas not found in DOM');
console.log('PrinceFarmer boot OK, canvas:', canvas);
