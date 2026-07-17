import type { CardDefinition, SubmittedDeck } from '~/common/src/index';

export const SAVED_DECK_SCHEMA_VERSION = 2;
export const DECK_STORAGE_SCHEMA_VERSION = 2;
export const MAX_CUSTOM_DECKS = 100;
export const MAX_DECK_IMPORT_BYTES = 256 * 1024;
export const MAX_DECK_CODE_LENGTH = 8192;
export const MAX_DECK_STORAGE_BYTES = 1024 * 1024;

export type SavedDeckSource = 'custom' | 'preset-copy' | 'imported';

export interface SavedDeck {
  schemaVersion: number;
  deckId: string;
  name: string;
  description?: string;
  cardIds: string[];
  coverCardId?: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number;
  catalogVersion: string;
  source: SavedDeckSource;
  favorite: boolean;
}

export interface PresetDeckChoice {
  schemaVersion: number;
  deckId: string;
  name: string;
  description?: string;
  cardIds: string[];
  coverCardId?: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number;
  catalogVersion: string;
  source: 'preset';
  favorite: boolean;
}

export type DeckChoice = SavedDeck | PresetDeckChoice;

export interface DeckStorageEnvelope {
  schemaVersion: number;
  decks: SavedDeck[];
  selectedDeckId: string;
  defaultDeckId?: string;
  savedAt: number;
}

export interface DeckDataContext {
  catalogVersion: string;
  knownCardIds: ReadonlySet<string>;
  cardIdMigrations?: Readonly<Record<string, string>>;
}

export interface DeckImportResult {
  deck: SavedDeck;
  missingCardIds: string[];
  migratedCardIds: string[];
  warnings: string[];
}

export interface DeckWarning {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface DeckAnalysis {
  cardCount: number;
  uniqueCardCount: number;
  missingCardIds: string[];
  costCurve: number[];
  averageCost: number;
  totalBasePower: number;
  expectedEffectValue: number;
  expectedTotalValue: number;
  eras: Record<string, number>;
  regions: Record<string, number>;
  professions: Record<string, number>;
  factions: Record<string, number>;
  tags: Record<string, number>;
  triggers: Record<string, number>;
  finisherCount: number;
  setupCount: number;
  warnings: DeckWarning[];
}

export class DeckDataError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'DeckDataError';
  }
}

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

const text = (value: unknown, maximum: number, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maximum);
};

const optionalText = (value: unknown, maximum: number): string | undefined => {
  const result = text(value, maximum);
  return result || undefined;
};

const timestamp = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;

const source = (value: unknown, fallback: SavedDeckSource): SavedDeckSource =>
  value === 'custom' || value === 'preset-copy' || value === 'imported' ? value : fallback;

const rawCardIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) throw new DeckDataError('DECK_CARDS_REQUIRED', '牌组必须包含卡牌列表。');
  if (value.length > 12) throw new DeckDataError('DECK_TOO_LARGE', '牌组不能超过十二张卡牌。');
  const result = value.map((cardId) => text(cardId, 128));
  if (result.some((cardId) => !cardId)) throw new DeckDataError('INVALID_CARD_ID', '牌组包含无效卡牌。');
  if (new Set(result).size !== result.length) throw new DeckDataError('DUPLICATE_CARD', '牌组不能包含重复卡牌。');
  return result;
};

const migrateIds = (cardIds: string[], context: DeckDataContext): { cardIds: string[]; migrated: string[] } => {
  const migrated: string[] = [];
  const next = cardIds.map((cardId) => {
    const replacement = context.cardIdMigrations?.[cardId];
    if (replacement) migrated.push(`${cardId} -> ${replacement}`);
    return replacement ?? cardId;
  });
  if (new Set(next).size !== next.length) throw new DeckDataError('DUPLICATE_CARD', '牌组更新后产生了重复卡牌。');
  return { cardIds: next, migrated };
};

const deckId = (value: unknown, fallback: string): string => {
  const candidate = text(value, 128, fallback).replace(/[^a-zA-Z0-9_-]/g, '-');
  return candidate || fallback;
};

export function createDeckId(prefix = 'deck'): string {
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 16)
    ?? `${Date.now().toString(36)}${Math.floor(Math.random() * 0xfffffff).toString(36)}`;
  return `${prefix}-${random}`;
}

export function sanitizeSavedDeck(
  value: unknown,
  context: DeckDataContext,
  options: { now?: number; fallbackSource?: SavedDeckSource; fallbackId?: string } = {}
): DeckImportResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DeckDataError('INVALID_DECK', '牌组数据必须是对象。');
  const input = value as Record<string, unknown>;
  const now = options.now ?? Date.now();
  const schemaVersion = Number(input.schemaVersion ?? 1);
  if (![1, SAVED_DECK_SCHEMA_VERSION].includes(schemaVersion)) throw new DeckDataError('DECK_VERSION_UNSUPPORTED', '该牌组版本不受支持。');
  const migrated = migrateIds(rawCardIds(input.cardIds), context);
  const missingCardIds = migrated.cardIds.filter((cardId) => !context.knownCardIds.has(cardId));
  const createdAt = timestamp(input.createdAt, now);
  const name = text(input.name, 80, '导入牌组');
  if (!name) throw new DeckDataError('INVALID_DECK_NAME', '牌组名称不能为空。');
  const cover = optionalText(input.coverCardId, 128);
  const warnings: string[] = [];
  if (schemaVersion < SAVED_DECK_SCHEMA_VERSION) warnings.push('旧版牌组已更新为当前格式。');
  if (input.catalogVersion && input.catalogVersion !== context.catalogVersion) warnings.push('该牌组来自其他内容版本，部分卡牌可能无法使用。');
  if (missingCardIds.length) warnings.push(`有 ${missingCardIds.length} 张卡牌不在当前目录中。`);
  if (migrated.migrated.length) warnings.push(`已更新 ${migrated.migrated.length} 张旧版卡牌。`);
  return {
    deck: {
      schemaVersion: SAVED_DECK_SCHEMA_VERSION,
      deckId: deckId(input.deckId, options.fallbackId ?? createDeckId('imported')),
      name,
      description: optionalText(input.description, 400),
      cardIds: migrated.cardIds,
      coverCardId: cover && migrated.cardIds.includes(cover) ? cover : migrated.cardIds[0],
      createdAt,
      updatedAt: timestamp(input.updatedAt, now),
      lastUsedAt: timestamp(input.lastUsedAt, 0),
      catalogVersion: text(input.catalogVersion, 80, context.catalogVersion),
      source: source(input.source, options.fallbackSource ?? 'imported'),
      favorite: input.favorite === true
    },
    missingCardIds,
    migratedCardIds: migrated.migrated,
    warnings
  };
}

export function parseDeckStorage(raw: string, context: DeckDataContext, now = Date.now()): DeckStorageEnvelope {
  if (byteLength(raw) > MAX_DECK_STORAGE_BYTES) throw new DeckDataError('STORAGE_TOO_LARGE', '本地牌组数据超过存储上限。');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DeckDataError('STORAGE_CORRUPT', '本地牌组数据已损坏。'); }
  const legacy = Array.isArray(parsed);
  const input = legacy ? { schemaVersion: 1, decks: parsed } : parsed;
  if (!input || typeof input !== 'object' || !Array.isArray((input as Record<string, unknown>).decks)) {
    throw new DeckDataError('STORAGE_CORRUPT', '本地牌组仓库格式无效。');
  }
  const envelope = input as Record<string, unknown>;
  const decks: SavedDeck[] = [];
  for (const candidate of envelope.decks as unknown[]) {
    if (legacy && (candidate as Record<string, unknown>)?.source === 'preset') continue;
    decks.push(sanitizeSavedDeck(candidate, context, { now, fallbackSource: 'custom' }).deck);
  }
  if (decks.length > MAX_CUSTOM_DECKS) throw new DeckDataError('TOO_MANY_DECKS', `本地牌组不能超过 ${MAX_CUSTOM_DECKS} 套。`);
  return {
    schemaVersion: DECK_STORAGE_SCHEMA_VERSION,
    decks,
    selectedDeckId: text(envelope.selectedDeckId, 128),
    defaultDeckId: optionalText(envelope.defaultDeckId, 128),
    savedAt: timestamp(envelope.savedAt, now)
  };
}

export function serializeDeckStorage(envelope: DeckStorageEnvelope): string {
  const result = JSON.stringify({ ...envelope, schemaVersion: DECK_STORAGE_SCHEMA_VERSION });
  if (byteLength(result) > MAX_DECK_STORAGE_BYTES) throw new DeckDataError('STORAGE_TOO_LARGE', '本地牌组数据超过存储上限。');
  return result;
}

export function exportDeckJson(deck: DeckChoice): string {
  return JSON.stringify({
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    deckId: deck.deckId,
    name: deck.name,
    description: deck.description,
    cardIds: deck.cardIds,
    coverCardId: deck.coverCardId,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
    catalogVersion: deck.catalogVersion,
    source: deck.source === 'preset' ? 'preset-copy' : deck.source
  }, null, 2);
}

export function importDeckJson(raw: string, context: DeckDataContext, now = Date.now()): DeckImportResult {
  if (byteLength(raw) > MAX_DECK_IMPORT_BYTES) throw new DeckDataError('IMPORT_TOO_LARGE', '导入文件超过 256 千字节。');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DeckDataError('INVALID_JSON', '牌组文件内容无法解析。'); }
  const candidate = parsed && typeof parsed === 'object' && 'deck' in parsed ? (parsed as Record<string, unknown>).deck : parsed;
  return sanitizeSavedDeck(candidate, context, { now, fallbackSource: 'imported', fallbackId: createDeckId('imported') });
}

const base64UrlEncode = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (value: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new DeckDataError('INVALID_DECK_CODE', '牌组码内容格式错误。');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  let binary: string;
  try { binary = atob(padded); } catch { throw new DeckDataError('INVALID_DECK_CODE', '牌组码内容无法解码。'); }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  try { return new TextDecoder().decode(bytes); } catch { throw new DeckDataError('INVALID_DECK_CODE', '牌组码文本编码无效。'); }
};

const checksum = (value: string): string => {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

export function encodeDeckCode(deck: DeckChoice): string {
  if (deck.cardIds.length !== 12 || new Set(deck.cardIds).size !== 12) {
    throw new DeckDataError('DECK_CODE_SIZE', '牌组码要求十二张不同卡牌。');
  }
  const payload = base64UrlEncode(JSON.stringify({
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    name: deck.name,
    description: deck.description,
    cardIds: deck.cardIds,
    coverCardId: deck.coverCardId,
    catalogVersion: deck.catalogVersion
  }));
  const code = `AFD1.${payload}.${checksum(payload)}`;
  if (code.length > MAX_DECK_CODE_LENGTH) throw new DeckDataError('DECK_CODE_TOO_LONG', '牌组码超过长度上限。');
  return code;
}

export function decodeDeckCode(code: string, context: DeckDataContext, now = Date.now()): DeckImportResult {
  const normalized = code.trim();
  if (normalized.length > MAX_DECK_CODE_LENGTH) throw new DeckDataError('DECK_CODE_TOO_LONG', '牌组码超过长度上限。');
  const parts = normalized.split('.');
  if (parts.length !== 3 || parts[0] !== 'AFD1') throw new DeckDataError('DECK_CODE_VERSION', '该牌组码版本不受支持。');
  const payload = parts[1]!;
  if (checksum(payload) !== parts[2]!.toLowerCase()) throw new DeckDataError('DECK_CODE_CHECKSUM', '牌组码校验和不匹配。');
  return importDeckJson(base64UrlDecode(payload), context, now);
}

export function createDeckShareUrl(baseUrl: string, deck: DeckChoice): string {
  const url = new URL('/deck-builder', baseUrl);
  url.searchParams.set('deck', encodeDeckCode(deck));
  return url.toString();
}

export function deckCodeFromUrl(value: string): string | null {
  try { return new URL(value, 'https://aeonfront.invalid').searchParams.get('deck'); } catch { return null; }
}

export function uniqueDeckName(name: string, existingNames: readonly string[]): string {
  const base = text(name, 72, '新牌组');
  const occupied = new Set(existingNames.map((item) => item.toLocaleLowerCase()));
  if (!occupied.has(base.toLocaleLowerCase())) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base} (${index})`.slice(0, 80);
    if (!occupied.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return `${base.slice(0, 65)} ${Date.now().toString(36)}`;
}

export function randomLegalDeck(cardIds: readonly string[], seed = Date.now()): string[] {
  const values = [...new Set(cardIds)];
  let state = seed >>> 0 || 0x6d2b79f5;
  const next = () => {
    state = Math.imul(state ^ state >>> 15, 1 | state);
    state ^= state + Math.imul(state ^ state >>> 7, 61 | state);
    return ((state ^ state >>> 14) >>> 0) / 4294967296;
  };
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(next() * (index + 1));
    [values[index], values[target]] = [values[target]!, values[index]!];
  }
  return values.slice(0, 12);
}

const counts = (values: string[]): Record<string, number> => values.reduce<Record<string, number>>((result, value) => {
  if (value) result[value] = (result[value] ?? 0) + 1;
  return result;
}, {});

export function analyzeDeck(cardIds: readonly string[], catalog: Readonly<Record<string, CardDefinition>>): DeckAnalysis {
  const cards = cardIds.map((cardId) => catalog[cardId]).filter((card): card is CardDefinition => Boolean(card));
  const missingCardIds = cardIds.filter((cardId) => !catalog[cardId]);
  const abilities = cards.flatMap((card) => card.abilities ?? []);
  const effects = abilities.flatMap((ability) => ability.effects);
  const costCurve = Array.from({ length: 6 }, (_, index) => cards.filter((card) => card.cost === index + 1).length);
  const totalCost = cards.reduce((sum, card) => sum + card.cost, 0);
  const totalBasePower = cards.reduce((sum, card) => sum + card.power, 0);
  const expectedTotalValue = cards.reduce((sum, card) => sum + (card.balance?.expectedTotalValue ?? card.power), 0);
  const warnings: DeckWarning[] = [];
  const uniqueCardCount = new Set(cardIds).size;
  const setupCount = cards.filter((card) => card.cost <= 2).length;
  const finisherCount = cards.filter((card) => card.cost >= 5).length;
  if (cardIds.length !== 12) warnings.push({ code: 'DECK_SIZE', severity: 'error', message: `当前为 ${cardIds.length}/12 张卡牌。` });
  if (uniqueCardCount !== cardIds.length) warnings.push({ code: 'DUPLICATES', severity: 'error', message: '牌组包含重复卡牌。' });
  if (missingCardIds.length) warnings.push({ code: 'MISSING_CARDS', severity: 'error', message: `${missingCardIds.length} 张卡牌已离开当前目录。` });
  if (setupCount < 3) warnings.push({ code: 'LOW_COST', severity: 'warning', message: '缺少 1-2 费铺垫卡，前期军令可能闲置。' });
  if (finisherCount > 5) warnings.push({ code: 'HIGH_COST', severity: 'warning', message: '高费卡较多，手牌可能难以及时部署。' });
  if (finisherCount === 0) warnings.push({ code: 'NO_FINISHER', severity: 'warning', message: '没有 5-6 费终结卡。' });
  if (Math.max(...costCurve) >= 7) warnings.push({ code: 'CONCENTRATED_CURVE', severity: 'warning', message: '费用曲线过度集中。' });
  const hasRevive = effects.some((effect) => effect.type === 'revive_card' || effect.type === 'return_to_hand');
  const hasDeathSource = effects.some((effect) => effect.type === 'destroy_cards' || effect.type === 'discard_cards');
  if (hasRevive && !hasDeathSource) warnings.push({ code: 'REVIVE_SETUP', severity: 'info', message: '复归收益较多，但缺少主动阵亡或弃置来源。' });
  const hasMovePayoff = abilities.some((ability) => ability.trigger === 'after_move' || ability.conditions?.some((condition) => condition.type === 'was_moved'));
  const hasMoveSource = effects.some((effect) => ['move_card', 'swap_positions', 'randomize_position'].includes(effect.type));
  if (hasMovePayoff && !hasMoveSource) warnings.push({ code: 'MOVE_SETUP', severity: 'info', message: '移动收益卡缺少稳定调遣手段。' });
  if (effects.filter((effect) => effect.type === 'draw_cards').reduce((sum, effect) => sum + Number(effect.amount ?? 1), 0) >= 5) {
    warnings.push({ code: 'HAND_PRESSURE', severity: 'info', message: '抽牌量较高，注意手牌与部署节奏。' });
  }
  const deckTags = new Set(cards.flatMap((card) => card.tags));
  const unsupportedTags = [...new Set(abilities.flatMap((ability) => ability.conditions ?? [])
    .filter((condition) => condition.type === 'tag' && typeof condition.value === 'string')
    .map((condition) => String(condition.value)))]
    .filter((tag) => !deckTags.has(tag));
  if (unsupportedTags.length) warnings.push({ code: 'MISSING_SYNERGY', severity: 'info', message: `条件技能缺少对应标签：${unsupportedTags.join('、')}。` });
  return {
    cardCount: cardIds.length,
    uniqueCardCount,
    missingCardIds,
    costCurve,
    averageCost: cards.length ? totalCost / cards.length : 0,
    totalBasePower,
    expectedEffectValue: expectedTotalValue - totalBasePower,
    expectedTotalValue,
    eras: counts(cards.map((card) => card.era)),
    regions: counts(cards.map((card) => card.region)),
    professions: counts(cards.map((card) => card.profession)),
    factions: counts(cards.map((card) => card.faction)),
    tags: counts(cards.flatMap((card) => card.tags)),
    triggers: counts(abilities.map((ability) => ability.trigger)),
    finisherCount,
    setupCount,
    warnings
  };
}

export function toSubmittedDeck(deck: DeckChoice, catalogVersion: string, packVersions: Record<string, string>): SubmittedDeck {
  if (deck.cardIds.length !== 12 || new Set(deck.cardIds).size !== 12) {
    throw new DeckDataError('DECK_SIZE', '在线牌组必须包含十二张不同卡牌。');
  }
  return {
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    deckId: deck.deckId,
    name: deck.name,
    cardIds: [...deck.cardIds],
    catalogVersion,
    packVersions: { ...packVersions }
  };
}
