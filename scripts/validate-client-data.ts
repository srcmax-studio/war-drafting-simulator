import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ABILITY_REGISTRY, FRONT_DEFINITIONS, validateCardDefinitions, validateFrontDefinitions, type CardDefinition } from '../app/common/src/index.js';

const cards = JSON.parse(readFileSync(resolve('data/characters/generated/tcg-cards.json'), 'utf8')) as CardDefinition[];
const presets = JSON.parse(readFileSync(resolve('data/characters/generated/preset-decks.json'), 'utf8')) as Array<{ deckId: string; cardIds: string[] }>;
const errors: string[] = [];
const validation = validateCardDefinitions(cards);
if (!validation.ok) errors.push(...validation.issues.map((issue) => `${issue.code}: ${issue.message}`));
if (cards.length !== 824) errors.push(`Expected 824 cards, received ${cards.length}.`);
if (cards.some((card) => !ABILITY_REGISTRY.has(card.abilityId))) errors.push('Card catalog references unknown abilities.');
if (presets.length < 6) errors.push('At least six presets are required.');
const known = new Set(cards.map((card) => card.cardId));
for (const preset of presets) {
  if (preset.cardIds.length !== 12 || new Set(preset.cardIds).size !== 12) errors.push(`Invalid preset deck: ${preset.deckId}.`);
  if (preset.cardIds.some((cardId) => !known.has(cardId))) errors.push(`Unknown card in preset: ${preset.deckId}.`);
}
errors.push(...validateFrontDefinitions(FRONT_DEFINITIONS));
if (FRONT_DEFINITIONS.length !== 30) errors.push(`Expected 30 fronts, received ${FRONT_DEFINITIONS.length}.`);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${cards.length} cards, ${presets.length} presets, ${ABILITY_REGISTRY.size} abilities and ${FRONT_DEFINITIONS.length} fronts.`);
}
