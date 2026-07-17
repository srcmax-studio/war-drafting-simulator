import { CARD_BY_ID, CARD_ID_MIGRATIONS, CARDS, CATALOG_VERSION, PRESET_DECKS } from '~/data/catalog';
import {
  DECK_STORAGE_SCHEMA_VERSION,
  MAX_CUSTOM_DECKS,
  SAVED_DECK_SCHEMA_VERSION,
  createDeckId,
  parseDeckStorage,
  randomLegalDeck,
  serializeDeckStorage,
  uniqueDeckName,
  type DeckChoice,
  type DeckDataContext,
  type DeckImportResult,
  type DeckStorageEnvelope,
  type PresetDeckChoice,
  type SavedDeck,
  type SavedDeckSource
} from '~/utils/decks';

const STORAGE_KEY = 'aeonfront_decks_v2';
const BACKUP_KEY = 'aeonfront_decks_backup_v2';
const LEGACY_STORAGE_KEY = 'aeonfront_decks_v1';
const LEGACY_SELECTED_KEY = 'aeonfront_selected_deck_v1';

const context: DeckDataContext = {
  catalogVersion: CATALOG_VERSION,
  knownCardIds: new Set(Object.keys(CARD_BY_ID)),
  cardIdMigrations: CARD_ID_MIGRATIONS
};

const presets: PresetDeckChoice[] = PRESET_DECKS.map((preset) => ({
  schemaVersion: SAVED_DECK_SCHEMA_VERSION,
  deckId: preset.deckId,
  name: preset.nameZh,
  description: preset.strategyZh,
  cardIds: [...preset.cardIds],
  coverCardId: preset.cardIds[0],
  createdAt: 0,
  updatedAt: 0,
  lastUsedAt: 0,
  catalogVersion: CATALOG_VERSION,
  source: 'preset',
  favorite: false
}));

interface NewDeckInput {
  name: string;
  description?: string;
  cardIds?: string[];
  coverCardId?: string;
  source?: SavedDeckSource;
  favorite?: boolean;
}

export function useDecks() {
  const customDecks = useState<SavedDeck[]>('aeonfront-custom-decks', () => []);
  const selectedDeckId = useState<string>('aeonfront-selected-deck', () => presets[0]?.deckId ?? '');
  const defaultDeckId = useState<string>('aeonfront-default-deck', () => '');
  const hydrated = useState<boolean>('aeonfront-decks-hydrated-v2', () => false);
  const storageNotice = useState<string>('aeonfront-decks-storage-notice', () => '');
  const importWarnings = useState<string[]>('aeonfront-decks-import-warnings', () => []);

  const decks = computed<DeckChoice[]>(() => {
    const combined: DeckChoice[] = [...customDecks.value, ...presets];
    return combined.sort((left, right) => {
      const leftDefault = left.deckId === defaultDeckId.value ? 1 : 0;
      const rightDefault = right.deckId === defaultDeckId.value ? 1 : 0;
      return rightDefault - leftDefault
        || Number(right.favorite) - Number(left.favorite)
        || right.lastUsedAt - left.lastUsedAt
        || right.updatedAt - left.updatedAt
        || left.name.localeCompare(right.name, 'zh-CN');
    });
  });

  const selectedDeck = computed<DeckChoice | undefined>(() =>
    decks.value.find((deck) => deck.deckId === selectedDeckId.value)
      ?? decks.value.find((deck) => deck.deckId === defaultDeckId.value)
      ?? decks.value[0]
  );

  const envelope = (): DeckStorageEnvelope => ({
    schemaVersion: DECK_STORAGE_SCHEMA_VERSION,
    decks: customDecks.value,
    selectedDeckId: selectedDeckId.value,
    ...(defaultDeckId.value ? { defaultDeckId: defaultDeckId.value } : {}),
    savedAt: Date.now()
  });

  const persist = () => {
    if (!import.meta.client) return;
    const serialized = serializeDeckStorage(envelope());
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous && previous !== serialized) localStorage.setItem(BACKUP_KEY, previous);
    localStorage.setItem(STORAGE_KEY, serialized);
  };

  const applyStorage = (stored: DeckStorageEnvelope) => {
    customDecks.value = stored.decks;
    selectedDeckId.value = stored.selectedDeckId || selectedDeckId.value;
    defaultDeckId.value = stored.defaultDeckId ?? '';
  };

  const hydrate = () => {
    if (!import.meta.client || hydrated.value) return;
    hydrated.value = true;
    const primary = localStorage.getItem(STORAGE_KEY);
    const backup = localStorage.getItem(BACKUP_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    try {
      if (primary) applyStorage(parseDeckStorage(primary, context));
      else if (legacy) {
        applyStorage(parseDeckStorage(legacy, context));
        selectedDeckId.value = localStorage.getItem(LEGACY_SELECTED_KEY) ?? selectedDeckId.value;
        storageNotice.value = '旧版自定义牌组已迁移并备份。';
        persist();
      }
    } catch (primaryError) {
      try {
        if (!backup) throw primaryError;
        applyStorage(parseDeckStorage(backup, context));
        storageNotice.value = '主牌组仓库已损坏，已从最近备份恢复。';
        localStorage.setItem(STORAGE_KEY, backup);
      } catch {
        customDecks.value = [];
        storageNotice.value = '本地牌组数据无法恢复，已保留损坏数据并启用空仓库。';
      }
    }
    if (!decks.value.some((deck) => deck.deckId === selectedDeckId.value)) {
      selectedDeckId.value = decks.value.find((deck) => deck.deckId === defaultDeckId.value)?.deckId ?? decks.value[0]?.deckId ?? '';
    }
  };

  if (import.meta.client) hydrate();

  const ensureCapacity = () => {
    if (customDecks.value.length >= MAX_CUSTOM_DECKS) throw new Error(`最多保存 ${MAX_CUSTOM_DECKS} 套自定义牌组。`);
  };

  const createDeck = (input: NewDeckInput): SavedDeck => {
    ensureCapacity();
    const now = Date.now();
    const cardIds = [...new Set(input.cardIds ?? [])].filter((cardId) => typeof cardId === 'string' && cardId.length > 0).slice(0, 12);
    const deck: SavedDeck = {
      schemaVersion: SAVED_DECK_SCHEMA_VERSION,
      deckId: createDeckId('custom'),
      name: uniqueDeckName(input.name, decks.value.map((item) => item.name)),
      description: input.description?.trim().slice(0, 400) || undefined,
      cardIds,
      coverCardId: cardIds.includes(input.coverCardId ?? '') ? input.coverCardId : cardIds[0],
      createdAt: now,
      updatedAt: now,
      lastUsedAt: 0,
      catalogVersion: CATALOG_VERSION,
      source: input.source ?? 'custom',
      favorite: input.favorite === true
    };
    customDecks.value = [deck, ...customDecks.value];
    selectedDeckId.value = deck.deckId;
    persist();
    return deck;
  };

  const createRandomDeck = (name = '随机远征') => createDeck({
    name,
    cardIds: randomLegalDeck(CARDS.map((card) => card.cardId)),
    source: 'custom'
  });

  const updateDeck = (deckId: string, changes: Partial<Pick<SavedDeck, 'name' | 'description' | 'cardIds' | 'coverCardId' | 'favorite'>>): SavedDeck => {
    const existing = customDecks.value.find((deck) => deck.deckId === deckId);
    if (!existing) throw new Error('预设牌组必须先另存为自定义牌组。');
    const cardIds = changes.cardIds
      ? [...new Set(changes.cardIds.filter((cardId) => typeof cardId === 'string' && cardId.length > 0))].slice(0, 12)
      : existing.cardIds;
    existing.name = changes.name === undefined ? existing.name : changes.name.trim().slice(0, 80) || existing.name;
    existing.description = changes.description === undefined ? existing.description : changes.description.trim().slice(0, 400) || undefined;
    existing.cardIds = cardIds;
    existing.coverCardId = cardIds.includes(changes.coverCardId ?? existing.coverCardId ?? '') ? (changes.coverCardId ?? existing.coverCardId) : cardIds[0];
    if (changes.favorite !== undefined) existing.favorite = changes.favorite;
    existing.updatedAt = Date.now();
    existing.catalogVersion = CATALOG_VERSION;
    customDecks.value = [...customDecks.value];
    persist();
    return existing;
  };

  const saveDeck = (deckId: string, name: string, cardIds: string[], description?: string, coverCardId?: string): SavedDeck => {
    const existing = customDecks.value.find((deck) => deck.deckId === deckId);
    return existing
      ? updateDeck(deckId, { name, cardIds, description, coverCardId })
      : createDeck({ name, cardIds, description, coverCardId, source: 'preset-copy' });
  };

  const copyDeck = (deck: DeckChoice, name = `${deck.name} 副本`): SavedDeck => createDeck({
    name,
    description: deck.description,
    cardIds: deck.cardIds,
    coverCardId: deck.coverCardId,
    source: deck.source === 'preset' ? 'preset-copy' : 'custom',
    favorite: false
  });

  const deleteDeck = (deckId: string) => {
    if (!customDecks.value.some((deck) => deck.deckId === deckId)) return;
    customDecks.value = customDecks.value.filter((deck) => deck.deckId !== deckId);
    if (defaultDeckId.value === deckId) defaultDeckId.value = '';
    if (selectedDeckId.value === deckId) selectedDeckId.value = defaultDeckId.value || decks.value[0]?.deckId || presets[0]?.deckId || '';
    persist();
  };

  const selectDeck = (deckId: string) => {
    if (!decks.value.some((deck) => deck.deckId === deckId)) return;
    selectedDeckId.value = deckId;
    persist();
  };

  const markUsed = (deckId: string) => {
    const custom = customDecks.value.find((deck) => deck.deckId === deckId);
    if (custom) {
      custom.lastUsedAt = Date.now();
      customDecks.value = [...customDecks.value];
    }
    selectedDeckId.value = deckId;
    persist();
  };

  const toggleFavorite = (deckId: string) => {
    const deck = customDecks.value.find((candidate) => candidate.deckId === deckId);
    if (deck) updateDeck(deckId, { favorite: !deck.favorite });
  };

  const setDefault = (deckId: string) => {
    if (!decks.value.some((deck) => deck.deckId === deckId)) return;
    defaultDeckId.value = defaultDeckId.value === deckId ? '' : deckId;
    persist();
  };

  const importDeck = (result: DeckImportResult): SavedDeck => {
    ensureCapacity();
    const now = Date.now();
    const deck: SavedDeck = {
      ...result.deck,
      deckId: createDeckId('imported'),
      name: uniqueDeckName(result.deck.name, decks.value.map((item) => item.name)),
      source: 'imported',
      createdAt: now,
      updatedAt: now,
      lastUsedAt: 0
    };
    customDecks.value = [deck, ...customDecks.value];
    selectedDeckId.value = deck.deckId;
    importWarnings.value = result.warnings;
    persist();
    return deck;
  };

  const restoreBackup = (): boolean => {
    if (!import.meta.client) return false;
    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) return false;
    try {
      applyStorage(parseDeckStorage(backup, context));
      localStorage.setItem(STORAGE_KEY, backup);
      storageNotice.value = '已恢复最近一次牌组备份。';
      return true;
    } catch {
      storageNotice.value = '牌组备份也已损坏，无法恢复。';
      return false;
    }
  };

  const storageUsage = computed(() => import.meta.client ? new Blob([localStorage.getItem(STORAGE_KEY) ?? '']).size : 0);

  return {
    customDecks,
    decks,
    selectedDeckId,
    selectedDeck,
    defaultDeckId,
    storageNotice,
    importWarnings,
    storageUsage,
    deckContext: context,
    hydrate,
    persist,
    selectDeck,
    markUsed,
    createDeck,
    createRandomDeck,
    updateDeck,
    saveDeck,
    copyDeck,
    deleteDeck,
    toggleFavorite,
    setDefault,
    importDeck,
    restoreBackup
  };
}
