import { PRESET_DECKS } from '~/data/catalog';

export interface SavedDeck {
  deckId: string;
  name: string;
  cardIds: string[];
  source: 'preset' | 'custom';
  updatedAt: number;
}

const STORAGE_KEY = 'aeonfront_decks_v1';

export function useDecks() {
  const decks = useState<SavedDeck[]>('aeonfront-decks', () => PRESET_DECKS.map((preset) => ({
    deckId: preset.deckId,
    name: preset.nameZh,
    cardIds: [...preset.cardIds],
    source: 'preset',
    updatedAt: 0
  })));
  const selectedDeckId = useState<string>('aeonfront-selected-deck', () => PRESET_DECKS[0]?.deckId ?? '');
  const hydrated = useState<boolean>('aeonfront-decks-hydrated', () => false);

  const persist = () => {
    if (!import.meta.client) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks.value));
    localStorage.setItem('aeonfront_selected_deck_v1', selectedDeckId.value);
  };

  const hydrate = () => {
    if (!import.meta.client || hydrated.value) return;
    hydrated.value = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedDeck[];
        if (Array.isArray(parsed) && parsed.length > 0) decks.value = parsed;
      }
      selectedDeckId.value = localStorage.getItem('aeonfront_selected_deck_v1') ?? selectedDeckId.value;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  if (import.meta.client) hydrate();

  const selectedDeck = computed(() => decks.value.find((deck) => deck.deckId === selectedDeckId.value) ?? decks.value[0]);
  const selectDeck = (deckId: string) => { selectedDeckId.value = deckId; persist(); };
  const saveDeck = (deckId: string, name: string, cardIds: string[]) => {
    const existing = decks.value.find((deck) => deck.deckId === deckId);
    if (existing) {
      existing.name = name.trim() || existing.name;
      existing.cardIds = [...new Set(cardIds)].slice(0, 12);
      existing.source = 'custom';
      existing.updatedAt = Date.now();
    } else {
      decks.value.push({ deckId, name: name.trim() || '新牌组', cardIds: [...new Set(cardIds)].slice(0, 12), source: 'custom', updatedAt: Date.now() });
    }
    selectedDeckId.value = deckId;
    persist();
  };
  const copyDeck = (deck: SavedDeck) => {
    const deckId = `custom-${Date.now()}`;
    saveDeck(deckId, `${deck.name} 副本`, deck.cardIds);
    return deckId;
  };
  const deleteDeck = (deckId: string) => {
    const deck = decks.value.find((candidate) => candidate.deckId === deckId);
    if (!deck || deck.source === 'preset') return;
    decks.value = decks.value.filter((candidate) => candidate.deckId !== deckId);
    selectedDeckId.value = decks.value[0]?.deckId ?? '';
    persist();
  };

  return { decks, selectedDeckId, selectedDeck, selectDeck, saveDeck, copyDeck, deleteDeck, persist };
}
