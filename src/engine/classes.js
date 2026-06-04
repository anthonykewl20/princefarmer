export const DEFAULT_CLASS_ID = 'lakan-alon';
export const DEFAULT_SIGNATURE_ABILITY_ID = 'tidal-pulse';
const BASE_MAX_HP = 100;

export function getDefaultSignatureAbilityId(classId) {
  switch (classId) {
    case 'datu-kidlat': return 'thunder-lunge';
    case 'raha-salakay': return 'ember-dance';
    case 'lakan-mayari': return 'moon-disc';
    case 'datu-hiraya': return 'earthshaker';
    case 'lakan-alon':
    default:
      return DEFAULT_SIGNATURE_ABILITY_ID;
  }
}

function cloneSlot(slot, fallbackWeaponId = null) {
  return {
    weaponId: slot?.weaponId ?? fallbackWeaponId,
    abilitiesPicked: Array.isArray(slot?.abilitiesPicked) ? slot.abilitiesPicked.slice() : [],
  };
}

export function cloneLoadout(loadout = {}) {
  const passives = Array.isArray(loadout.passives)
    ? loadout.passives.slice(0, 6)
    : [];
  while (passives.length < 6) passives.push(null);

  return {
    main: cloneSlot(loadout.main, 'kampilan'),
    offhand: cloneSlot(loadout.offhand, null),
    passives,
  };
}

export function deriveOwnedPassives(loadout) {
  const owned = [];
  for (const passiveId of cloneLoadout(loadout).passives) {
    if (passiveId && !owned.includes(passiveId)) owned.push(passiveId);
  }
  return owned;
}

export function applyClassTemplate(player, classDef) {
  const loadout = cloneLoadout(classDef?.starterLoadout);
  const bonuses = classDef?.bonuses || {};

  player.classId = classDef?.id ?? DEFAULT_CLASS_ID;
  player.signatureAbilityId = classDef?.signatureAbilityId ?? getDefaultSignatureAbilityId(player.classId);
  player.className = classDef?.name ?? player.classId;
  player.classAccent = classDef?.accent ?? player.classAccent;
  player.classBlurb = classDef?.blurb ?? classDef?.description ?? null;
  player.loadout = loadout;
  player.ownedPassives = deriveOwnedPassives(loadout);
  player.evolutionState = player.evolutionState ?? {};

  const maxHpBonus = bonuses.maxHp ?? 0;
  player.maxHp = BASE_MAX_HP + maxHpBonus;
  player.hp = player.maxHp;
  player.attackPower = (player.attackPower ?? 1) + (bonuses.attackPower ?? 0);

  return player;
}
