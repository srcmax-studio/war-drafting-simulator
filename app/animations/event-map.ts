import type { GameEvent } from '~/common/src/index';
import type { MotionPresetName } from './presets';
import type { AudioCue } from '~/audio/manifest';

export interface BattlePresentationCue {
  motion: MotionPresetName;
  audio?: AudioCue;
  target: 'card' | 'front' | 'hud' | 'overlay';
  essential?: boolean;
}

const EVENT_MAP: Record<string, BattlePresentationCue> = {
  cards_drawn: { motion: 'cardDraw', audio: 'card-draw', target: 'card' },
  card_deployed: { motion: 'cardDeploy', audio: 'card-deploy', target: 'card', essential: true },
  card_revealed: { motion: 'cardReveal', audio: 'card-reveal', target: 'card' },
  card_moved: { motion: 'cardMove', audio: 'card-move', target: 'card' },
  card_destroyed: { motion: 'cardDeath', audio: 'card-death', target: 'card', essential: true },
  card_returned: { motion: 'cardReturn', audio: 'card-return', target: 'card' },
  card_revived: { motion: 'cardReturn', audio: 'card-revive', target: 'card', essential: true },
  card_copied: { motion: 'cardReveal', audio: 'card-copy', target: 'card' },
  card_generated: { motion: 'cardReveal', audio: 'card-generate', target: 'card' },
  front_revealed: { motion: 'frontReveal', audio: 'front-reveal', target: 'front', essential: true },
  front_effect_resolved: { motion: 'frontControl', audio: 'front-effect', target: 'front' },
  ability_effect_applied: { motion: 'cardPowerUp', audio: 'power-up', target: 'card' },
  turn_started: { motion: 'turn', audio: 'turn-start', target: 'overlay', essential: true },
  turn_locked: { motion: 'lock', audio: 'lock-own', target: 'hud' },
  banner_raised: { motion: 'stake', audio: 'banner', target: 'overlay', essential: true },
  stake_changed: { motion: 'stake', audio: 'stake-up', target: 'hud', essential: true },
  player_withdrew: { motion: 'withdrawal', audio: 'withdrawal', target: 'overlay', essential: true },
  game_ended: { motion: 'victory', target: 'overlay', essential: true }
};

export function presentationFor(event: GameEvent): BattlePresentationCue | null {
  const cue = EVENT_MAP[event.type];
  if (!cue) return null;
  if (event.type === 'ability_effect_applied' && Array.isArray(event.payload.deltas)) {
    const total = event.payload.deltas.reduce((sum, delta) => sum + Number((delta as Record<string, unknown>).amount ?? 0), 0);
    if (total < 0) return { ...cue, motion: 'cardPowerDown', audio: 'power-down' };
  }
  return cue;
}
