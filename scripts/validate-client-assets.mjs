import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [cards, assets] = await Promise.all([
  readFile(resolve('data/characters/generated/tcg-cards.json'), 'utf8').then(JSON.parse),
  readFile(resolve('assets/card-images/generated/card-assets.json'), 'utf8').then(JSON.parse)
]);
const errors = [];
const byCard = new Map(assets.map((entry) => [entry.cardId, entry]));
for (const card of cards) {
  const entry = byCard.get(card.cardId);
  if (!entry) { errors.push(`Missing asset index entry: ${card.cardId}.`); continue; }
  if (entry.fallback) errors.push(`Unexpected fallback for ${card.cardId}.`);
  for (const path of [entry.web, entry.hd]) {
    try { await access(resolve('assets/card-images', path)); } catch { errors.push(`Missing asset file: ${path}.`); }
  }
}
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${cards.length} client card assets in WebP and HD formats.`);
}
