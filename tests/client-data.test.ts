import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FRONT_DEFINITIONS,
  createGame,
  createPlayerView,
  lockTurn,
  replayGameEvents,
  serializeGame,
  submitTurnIntent,
  type CardDefinition
} from '../app/common/src/index.js';

const read = <T>(path: string): T => JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
const cards = read<CardDefinition[]>('data/characters/generated/tcg-cards.json');
const presets = read<Array<{ deckId: string; cardIds: string[] }>>('data/characters/generated/preset-decks.json');
const assets = read<Array<{ cardId: string; web: string; hd: string; fallback: boolean }>>('assets/card-images/generated/card-assets.json');

describe('client data integration', () => {
  it('loads the complete character collection', () => {
    expect(cards).toHaveLength(824);
    expect(new Set(cards.map((card) => card.cardId)).size).toBe(824);
  });
  it('maps every card to WebP and HD art without fallback', () => {
    expect(assets).toHaveLength(cards.length);
    expect(assets.every((asset) => asset.web.endsWith('.webp') && asset.hd.endsWith('.png') && !asset.fallback)).toBe(true);
  });
  it('provides six legal preset decks', () => {
    expect(presets).toHaveLength(6);
    for (const preset of presets) {
      expect(preset.cardIds).toHaveLength(12);
      expect(new Set(preset.cardIds).size).toBe(12);
    }
  });
  it('ships thirty unique enabled fronts', () => {
    expect(FRONT_DEFINITIONS).toHaveLength(30);
    expect(new Set(FRONT_DEFINITIONS.map((front) => front.frontId)).size).toBe(30);
    expect(FRONT_DEFINITIONS.filter((front) => front.enabled).length).toBeGreaterThanOrEqual(24);
  });
  it('completes and replays a six-turn local practice match', () => {
    const state = createGame({
      seed: 20260717,
      cards,
      fronts: FRONT_DEFINITIONS,
      players: [
        { playerId: 'local-player', name: '玩家', deck: presets[0]!.cardIds },
        { playerId: 'practice-ai', name: '演武官', deck: presets[1]!.cardIds }
      ]
    });
    while (state.phase !== 'ended') {
      const turn = state.turn;
      for (const player of state.players) {
        submitTurnIntent(state, player.playerId, { requestId: `${player.playerId}-plan-${turn}`, turn, deployments: [] });
        lockTurn(state, player.playerId, `${player.playerId}-lock-${turn}`);
      }
    }
    expect(state.turn).toBe(6);
    expect(state.winner).not.toBeNull();
    expect(serializeGame(replayGameEvents(state))).toBe(serializeGame(state));
  });
  it('keeps opponent hands out of client views', () => {
    const state = createGame({ seed: 4, cards, fronts: FRONT_DEFINITIONS, players: [{ playerId: 'p1', name: '甲', deck: presets[0]!.cardIds }, { playerId: 'p2', name: '乙', deck: presets[1]!.cardIds }] });
    const view = createPlayerView(state, 'p1');
    expect(view.players.find((player) => player.playerId === 'p1')?.hand).toHaveLength(4);
    expect(view.players.find((player) => player.playerId === 'p2')?.hand).toBeUndefined();
  });
  it('keeps the basic English and Chinese navigation keys aligned', () => {
    const zh = read<Record<string, any>>('i18n/locales/zh-CN.json');
    const en = read<Record<string, any>>('i18n/locales/en.json');
    expect(Object.keys(en.nav)).toEqual(Object.keys(zh.nav));
    expect(Object.keys(en.game)).toEqual(Object.keys(zh.game));
  });
});
