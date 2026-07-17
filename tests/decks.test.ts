import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CardDefinition } from '../app/common/src/index.js';
import {
  MAX_CUSTOM_DECKS,
  analyzeDeck,
  createDeckShareUrl,
  decodeDeckCode,
  encodeDeckCode,
  exportDeckJson,
  importDeckJson,
  parseDeckStorage,
  randomLegalDeck,
  sanitizeSavedDeck,
  serializeDeckStorage,
  toSubmittedDeck,
  uniqueDeckName,
  type DeckChoice
} from '../app/utils/decks.js';

const cards = JSON.parse(readFileSync('data/characters/generated/tcg-cards.json', 'utf8')) as CardDefinition[];
const presets = JSON.parse(readFileSync('data/characters/generated/preset-decks.json', 'utf8')) as Array<{ deckId: string; nameZh: string; cardIds: string[] }>;
const metadata = JSON.parse(readFileSync('data/characters/generated/catalog.json', 'utf8')) as { catalogVersion: string; packVersions: Record<string, string> };
const cardById = Object.fromEntries(cards.map((card) => [card.cardId, card]));
const context = { catalogVersion: metadata.catalogVersion, knownCardIds: new Set(cards.map((card) => card.cardId)), cardIdMigrations: { legacy: cards[0]!.cardId } };
const now = 1_784_278_400_000;

const choice = (): DeckChoice => ({
  schemaVersion: 2,
  deckId: 'test-deck',
  name: '十二将测试',
  description: '不含私人信息',
  cardIds: presets[0]!.cardIds,
  coverCardId: presets[0]!.cardIds[0],
  createdAt: now,
  updatedAt: now,
  lastUsedAt: 0,
  catalogVersion: metadata.catalogVersion,
  source: 'custom',
  favorite: false
});

describe('custom deck data formats', () => {
  it('creates and migrates a blank v1 deck without requiring a preset copy', () => {
    const result = sanitizeSavedDeck({ schemaVersion: 1, deckId: 'blank', name: '空白', cardIds: [] }, context, { now, fallbackSource: 'custom' });
    expect(result.deck.schemaVersion).toBe(2);
    expect(result.deck.cardIds).toEqual([]);
    expect(result.deck.source).toBe('custom');
    expect(result.warnings).toContain('旧版牌组已更新为当前格式。');
  });

  it('migrates old card IDs and reports cards missing from the current catalog', () => {
    const result = sanitizeSavedDeck({ name: '迁移', cardIds: ['legacy', 'af-retired-card'] }, context, { now });
    expect(result.deck.cardIds[0]).toBe(cards[0]!.cardId);
    expect(result.migratedCardIds).toEqual([`legacy -> ${cards[0]!.cardId}`]);
    expect(result.missingCardIds).toEqual(['af-retired-card']);
  });

  it('rejects duplicate cards instead of silently weakening validation', () => {
    expect(() => sanitizeSavedDeck({ name: '重复', cardIds: [cards[0]!.cardId, cards[0]!.cardId] }, context, { now })).toThrow(/重复/);
  });

  it('migrates the legacy array store and excludes immutable preset rows', () => {
    const legacy = JSON.stringify([
      { deckId: 'preset-1', name: '预设', source: 'preset', cardIds: presets[0]!.cardIds, updatedAt: 0 },
      { deckId: 'custom-1', name: '旧牌组', source: 'custom', cardIds: presets[1]!.cardIds, updatedAt: now }
    ]);
    const stored = parseDeckStorage(legacy, context, now);
    expect(stored.decks).toHaveLength(1);
    expect(stored.decks[0]?.name).toBe('旧牌组');
  });

  it('round-trips the versioned storage envelope', () => {
    const imported = sanitizeSavedDeck(choice(), context, { now }).deck;
    const raw = serializeDeckStorage({ schemaVersion: 2, decks: [imported], selectedDeckId: imported.deckId, defaultDeckId: imported.deckId, savedAt: now });
    expect(parseDeckStorage(raw, context, now)).toMatchObject({ selectedDeckId: imported.deckId, defaultDeckId: imported.deckId, decks: [{ name: imported.name }] });
  });

  it('rejects corrupt storage and stores at most one hundred custom decks', () => {
    expect(() => parseDeckStorage('{bad', context, now)).toThrow(/损坏/);
    const decks = Array.from({ length: MAX_CUSTOM_DECKS + 1 }, (_, index) => ({ ...choice(), deckId: `deck-${index}` }));
    expect(() => parseDeckStorage(JSON.stringify({ schemaVersion: 2, decks }), context, now)).toThrow(/100/);
  });

  it('exports and imports filtered JSON without carrying unknown fields', () => {
    const raw = exportDeckJson(choice());
    const altered = JSON.stringify({ ...JSON.parse(raw), injectedScript: 'ignored', name: '导入牌组' });
    const result = importDeckJson(altered, context, now);
    expect(result.deck.name).toBe('导入牌组');
    expect(result.deck).not.toHaveProperty('injectedScript');
    expect(result.deck.cardIds).toEqual(presets[0]!.cardIds);
  });

  it('round-trips AFD1 codes and rejects checksum changes', () => {
    const code = encodeDeckCode(choice());
    expect(code).toMatch(/^AFD1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
    expect(decodeDeckCode(code, context, now).deck).toMatchObject({ name: '十二将测试', cardIds: presets[0]!.cardIds });
    const changed = `${code.slice(0, -1)}${code.endsWith('0') ? '1' : '0'}`;
    expect(() => decodeDeckCode(changed, context, now)).toThrow(/校验和/);
  });

  it('rejects compact codes for incomplete decks', () => {
    expect(() => encodeDeckCode({ ...choice(), cardIds: presets[0]!.cardIds.slice(0, 11) })).toThrow(/十二张/);
  });

  it('builds share URLs containing only the deck code', () => {
    const url = new URL(createDeckShareUrl('https://game.example/account?token=private', choice()));
    expect(url.pathname).toBe('/deck-builder');
    expect(url.searchParams.get('deck')).toMatch(/^AFD1\./);
    expect(url.toString()).not.toContain('token=private');
    expect(url.toString()).not.toContain('不含私人信息');
  });

  it('generates deterministic legal random starters', () => {
    const first = randomLegalDeck(cards.map((card) => card.cardId), 42);
    expect(first).toEqual(randomLegalDeck(cards.map((card) => card.cardId), 42));
    expect(first).toHaveLength(12);
    expect(new Set(first).size).toBe(12);
    expect(first.every((cardId) => context.knownCardIds.has(cardId))).toBe(true);
  });

  it('computes the complete deck analysis and actionable warnings', () => {
    const valid = analyzeDeck(presets[0]!.cardIds, cardById);
    expect(valid.cardCount).toBe(12);
    expect(valid.costCurve.reduce((sum, count) => sum + count, 0)).toBe(12);
    expect(valid.totalBasePower).toBeGreaterThan(0);
    expect(valid.expectedTotalValue).toBeGreaterThan(valid.totalBasePower);
    expect(Object.keys(valid.eras).length).toBeGreaterThan(0);
    const incomplete = analyzeDeck(presets[0]!.cardIds.slice(0, 3), cardById);
    expect(incomplete.warnings.some((warning) => warning.code === 'DECK_SIZE' && warning.severity === 'error')).toBe(true);
  });

  it('creates collision-free names and authoritative submission envelopes', () => {
    expect(uniqueDeckName('远征', ['远征', '远征 (2)'])).toBe('远征 (3)');
    expect(toSubmittedDeck(choice(), metadata.catalogVersion, metadata.packVersions)).toEqual({
      schemaVersion: 2,
      deckId: 'test-deck',
      name: '十二将测试',
      cardIds: presets[0]!.cardIds,
      catalogVersion: metadata.catalogVersion,
      packVersions: metadata.packVersions
    });
  });
});
