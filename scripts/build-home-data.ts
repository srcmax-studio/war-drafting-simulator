import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FRONT_DEFINITIONS } from '../app/common/src/fronts.js';
import type { CardDefinition } from '../app/common/src/types.js';

interface PresetDeck {
  deckId: string;
  nameZh: string;
  strategyZh: string;
  cardIds: string[];
}

const read = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(path), 'utf8')) as T;
const cards = await read<CardDefinition[]>('data/characters/generated/tcg-cards.json');
const presets = await read<PresetDeck[]>('data/characters/generated/preset-decks.json');
const catalog = await read<{ catalogVersion: string; cards: number }>('data/characters/generated/catalog.json');
const pack = await read<{ nameZh: string; version: string }>('data/characters/data/packs/core/pack.json');
const frontIds = ['bronze-road', 'mist-bastion', 'future-beacon', 'future-beacon'];
const featuredNames = ['秦始皇', '花木兰', '达·芬奇', '吉尔伽美什'];
const output = {
  catalogVersion: catalog.catalogVersion,
  cardCount: catalog.cards,
  enabledFrontCount: FRONT_DEFINITIONS.filter((front) => front.enabled).length,
  pack: { nameZh: pack.nameZh, version: pack.version },
  cards: cards.map(({ cardId, nameZh, imageKey, era, faction }) => ({ cardId, nameZh, imageKey, era, faction })),
  presets: presets.map((preset) => ({
    deckId: preset.deckId,
    name: preset.nameZh,
    description: preset.strategyZh,
    cardIds: preset.cardIds,
    coverCardId: preset.cardIds[0]
  })),
  featuredCards: featuredNames.map((name) => cards.find((card) => card.nameZh === name)),
  fronts: [...new Set(frontIds)].map((frontId) => FRONT_DEFINITIONS.find((front) => front.frontId === frontId))
};

if (output.featuredCards.some((card) => !card) || output.fronts.some((front) => !front)) {
  throw new Error('Home presentation data references missing catalog entries.');
}
await writeFile(resolve('app/data/home-catalog.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Built home catalog with ${output.cards.length} card covers and ${output.featuredCards.length} featured cards.`);
