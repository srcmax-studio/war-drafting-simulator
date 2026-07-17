import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ABILITY_REGISTRY,
  FRONT_DEFINITIONS,
  PROTOCOL_VERSION,
  validateCardDefinitions,
  validateFrontDefinitions,
  type CardDefinition
} from '../app/common/src/index.js';

interface CatalogMetadata {
  schemaVersion: number;
  catalogVersion: string;
  packVersions: Record<string, string>;
  cards: number;
}

interface CorePack {
  packId: string;
  version: string;
  releaseStatus: string;
  minimumGameVersion: string;
  cards: string[];
  fronts: string[];
}

const read = <T>(path: string): T => JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
const cards = read<CardDefinition[]>('data/characters/generated/tcg-cards.json');
const presets = read<Array<{ deckId: string; cardIds: string[] }>>('data/characters/generated/preset-decks.json');
const metadata = read<CatalogMetadata>('data/characters/generated/catalog.json');
const corePack = read<CorePack>('data/characters/data/packs/core/pack.json');
const errors: string[] = [];

const validation = validateCardDefinitions(cards);
if (!validation.ok) errors.push(...validation.issues.map((issue) => `${issue.code}: ${issue.message}`));
if (cards.length !== 824 || metadata.cards !== cards.length) errors.push(`Expected 824 catalog cards, received ${cards.length}.`);
if (cards.some((card) => card.catalogVersion !== metadata.catalogVersion)) errors.push('Card catalog versions are inconsistent.');
if (cards.some((card) => !(card.abilities?.length) && !ABILITY_REGISTRY.has(card.abilityId))) errors.push('A legacy card references an unknown ability.');
const abilityPrototypes = new Set(cards.flatMap((card) => (card.abilities ?? []).map((ability) => ability.abilityId)));
if (abilityPrototypes.size < 64) errors.push(`Expected at least 64 ability prototypes, received ${abilityPrototypes.size}.`);

if (presets.length < 6) errors.push('At least six presets are required.');
const knownCards = new Set(cards.map((card) => card.cardId));
for (const preset of presets) {
  if (preset.cardIds.length !== 12 || new Set(preset.cardIds).size !== 12) errors.push(`Invalid preset deck: ${preset.deckId}.`);
  if (preset.cardIds.some((cardId) => !knownCards.has(cardId))) errors.push(`Unknown card in preset: ${preset.deckId}.`);
}

errors.push(...validateFrontDefinitions(FRONT_DEFINITIONS));
if (FRONT_DEFINITIONS.length < 72 || FRONT_DEFINITIONS.some((front) => !front.enabled)) {
  errors.push(`Expected at least 72 enabled fronts, received ${FRONT_DEFINITIONS.filter((front) => front.enabled).length}.`);
}
const knownFronts = new Set(FRONT_DEFINITIONS.map((front) => front.frontId));
if (corePack.packId !== 'core' || corePack.releaseStatus !== 'released') errors.push('The core content pack must be released.');
if (corePack.version !== metadata.packVersions.core) errors.push('Core pack and catalog versions do not match.');
if (corePack.minimumGameVersion !== PROTOCOL_VERSION) errors.push('Core pack minimum game version does not match the protocol.');
if (new Set(corePack.cards).size !== knownCards.size || corePack.cards.some((cardId) => !knownCards.has(cardId))) errors.push('Core pack card ownership is incomplete.');
if (new Set(corePack.fronts).size !== knownFronts.size || corePack.fronts.some((frontId) => !knownFronts.has(frontId))) errors.push('Core pack front ownership is incomplete.');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${cards.length} cards, ${presets.length} presets, ${abilityPrototypes.size} ability prototypes, ${FRONT_DEFINITIONS.length} fronts and core pack ${corePack.version}.`);
}
