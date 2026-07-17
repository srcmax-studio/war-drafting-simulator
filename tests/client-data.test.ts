import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROTOCOL_VERSION,
  FRONT_DEFINITIONS,
  createGame,
  createPlayerView,
  lockTurn,
  replayGameEvents,
  serializeGame,
  submitTurnIntent,
  type CardDefinition
} from '../app/common/src/index.js';
import { compactGameForHistory, restoreGameFromHistory } from '../app/composables/useMatchHistory.js';

const read = <T>(path: string): T => JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
const cards = read<CardDefinition[]>('data/characters/generated/tcg-cards.json');
const presets = read<Array<{ deckId: string; cardIds: string[] }>>('data/characters/generated/preset-decks.json');
const assets = read<Array<{ cardId: string; web: string; hd: string; fallback: boolean }>>('assets/card-images/generated/card-assets.json');
const catalog = read<{ schemaVersion: number; catalogVersion: string; packVersions: Record<string, string>; cards: number }>('data/characters/generated/catalog.json');
const corePack = read<{ cards: string[]; fronts: string[]; version: string; releaseStatus: string }>('data/characters/data/packs/core/pack.json');

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
  it('ships seventy-two unique enabled fronts with pool metadata', () => {
    expect(FRONT_DEFINITIONS).toHaveLength(72);
    expect(new Set(FRONT_DEFINITIONS.map((front) => front.frontId)).size).toBe(72);
    expect(FRONT_DEFINITIONS.every((front) => front.enabled && front.weight > 0 && front.categories.length > 0 && front.packId === 'core')).toBe(true);
  });
  it('registers the complete catalog in the released core pack', () => {
    expect(catalog).toMatchObject({ schemaVersion: 2, cards: 824 });
    expect(PROTOCOL_VERSION).toBe('aeonfront/2');
    expect(corePack).toMatchObject({ version: catalog.packVersions.core, releaseStatus: 'released' });
    expect(new Set(corePack.cards)).toEqual(new Set(cards.map((card) => card.cardId)));
    expect(new Set(corePack.fronts)).toEqual(new Set(FRONT_DEFINITIONS.map((front) => front.frontId)));
  });
  it('renders multi-skill definitions and a strict cost-value curve', () => {
    expect(cards.every((card) => (card.abilities?.length ?? 0) > 0)).toBe(true);
    expect(cards.filter((card) => card.cost >= 5).every((card) => (card.abilities?.length ?? 0) >= 2)).toBe(true);
    const averages = Array.from({ length: 6 }, (_, index) => {
      const atCost = cards.filter((card) => card.cost === index + 1);
      return atCost.reduce((sum, card) => sum + (card.balance?.expectedTotalValue ?? 0), 0) / atCost.length;
    });
    expect(averages.every((value, index) => index === 0 || value > averages[index - 1]!)).toBe(true);
  });
  it('ships only four-character Chinese skill names and localized skill text', () => {
    const abilities = cards.flatMap((card) => card.abilities ?? []);
    expect(abilities).toHaveLength(1221);
    expect(new Set(abilities.map((ability) => ability.nameZh)).size).toBe(abilities.length);
    expect(abilities.every((ability) => /^\p{Script=Han}{4}$/u.test(ability.nameZh) && !ability.nameZh.includes('的'))).toBe(true);
    expect(abilities.every((ability) => ability.textZh.startsWith(`${ability.nameZh}：`) && !/[A-Za-z_]/u.test(ability.textZh))).toBe(true);
  });
  it('completes and replays a six-turn local practice match', () => {
    const state = createGame({
      seed: 20260717,
      cards,
      fronts: FRONT_DEFINITIONS,
      catalogVersion: catalog.catalogVersion,
      packVersions: catalog.packVersions,
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
    expect(state.setup.catalogVersion).toBe(catalog.catalogVersion);
    expect(serializeGame(replayGameEvents(state))).toBe(serializeGame(state));
    const compact = compactGameForHistory(state);
    expect(compact.length).toBeLessThan(serializeGame(state).length / 5);
    expect(serializeGame(restoreGameFromHistory(compact))).toBe(serializeGame(state));
    expect(serializeGame(replayGameEvents(restoreGameFromHistory(compact)))).toBe(serializeGame(state));
  });
  it('keeps opponent hands out of client views', () => {
    const state = createGame({ seed: 4, cards, fronts: FRONT_DEFINITIONS, players: [{ playerId: 'p1', name: '甲', deck: presets[0]!.cardIds }, { playerId: 'p2', name: '乙', deck: presets[1]!.cardIds }] });
    const view = createPlayerView(state, 'p1');
    expect(view.players.find((player) => player.playerId === 'p1')?.hand).toHaveLength(4);
    expect(view.players.find((player) => player.playerId === 'p2')?.hand).toBeUndefined();
    expect(view.fronts.filter((front) => !front.revealed).every((front) => front.definition.frontId.startsWith('front-slot-') && front.definition.effectId === 'hidden')).toBe(true);
  });
  it('keeps the basic English and Chinese navigation keys aligned', () => {
    const zh = read<Record<string, any>>('i18n/locales/zh-CN.json');
    const en = read<Record<string, any>>('i18n/locales/en.json');
    expect(Object.keys(en.nav)).toEqual(Object.keys(zh.nav));
    expect(Object.keys(en.game)).toEqual(Object.keys(zh.game));
  });
});
