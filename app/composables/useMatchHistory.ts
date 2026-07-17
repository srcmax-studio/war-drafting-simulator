import { deserializeGame, serializeGame, type BattleSummary, type GameEvent, type GameState, type GameWinner } from '~/common/src/index';
import { CARD_BY_ID, CARDS, CATALOG_VERSION, FRONTS } from '~/data/catalog';

export interface MatchHistoryEntry {
  schemaVersion: 3;
  gameId: string;
  timestamp: number;
  mode: 'practice' | 'online';
  playerId: string;
  deckId: string;
  deckName: string;
  catalogVersion: string;
  packVersions: Record<string, string>;
  serializedGame?: string;
  events?: GameEvent[];
  summary?: BattleSummary;
  winner: GameWinner | null;
}

const STORAGE_KEY = 'aeonfront_match_history_v3';
const LEGACY_KEYS = ['aeonfront_match_history_v2', 'aeonfront_match_history_v1'];
const MAX_HISTORY_BYTES = 4 * 1024 * 1024;

export function compactGameForHistory(state: GameState): string {
  const compact = JSON.parse(serializeGame(state)) as GameState;
  compact.setup.cards = [];
  compact.setup.fronts = [];
  compact.cardCatalog = {};
  return serializeGame(compact);
}

export function restoreGameFromHistory(serialized: string): GameState {
  const state = deserializeGame(serialized);
  if (state.setup.cards.length === 0 && Object.keys(state.cardCatalog).length === 0) {
    if (state.setup.catalogVersion && state.setup.catalogVersion !== CATALOG_VERSION) {
      throw new Error('该对局记录来自其他内容版本，当前无法重放。');
    }
    state.setup.cards = CARDS;
    state.setup.fronts = FRONTS;
    state.cardCatalog = { ...CARD_BY_ID };
  }
  return state;
}

const migrate = (value: unknown): MatchHistoryEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .filter((entry) => typeof entry.gameId === 'string' && typeof entry.deckName === 'string')
    .map((entry) => ({
      schemaVersion: 3,
      gameId: String(entry.gameId),
      timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now(),
      mode: entry.mode === 'online' ? 'online' : 'practice',
      playerId: typeof entry.playerId === 'string' ? entry.playerId : '',
      deckId: typeof entry.deckId === 'string' ? entry.deckId : 'legacy-deck',
      deckName: String(entry.deckName).slice(0, 80),
      catalogVersion: typeof entry.catalogVersion === 'string' ? entry.catalogVersion : 'legacy',
      packVersions: entry.packVersions && typeof entry.packVersions === 'object' ? entry.packVersions as Record<string, string> : {},
      ...(typeof entry.serializedGame === 'string' && entry.serializedGame ? { serializedGame: entry.serializedGame } : {}),
      ...(Array.isArray(entry.events) ? { events: entry.events as GameEvent[] } : {}),
      ...(entry.summary && typeof entry.summary === 'object' ? { summary: entry.summary as BattleSummary } : {}),
      winner: entry.winner as GameWinner | null ?? null
    }));
};

export function useMatchHistory() {
  const history = useState<MatchHistoryEntry[]>('aeonfront-history', () => []);
  const hydrated = useState<boolean>('aeonfront-history-hydrated-v2', () => false);
  const hydrate = () => {
    if (!import.meta.client || hydrated.value) return;
    hydrated.value = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) ?? LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
      if (stored) history.value = migrate(JSON.parse(stored));
    } catch {
      history.value = [];
    }
  };
  const persist = () => {
    if (!import.meta.client) return;
    const candidates = history.value.slice(0, 50);
    let serialized = JSON.stringify(candidates);
    while (new TextEncoder().encode(serialized).length > MAX_HISTORY_BYTES && candidates.length > 1) {
      candidates.pop();
      serialized = JSON.stringify(candidates);
    }
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      history.value = candidates;
    } catch {
      const newest = candidates[0];
      if (!newest) return;
      const summary = { ...newest, serializedGame: undefined, events: newest.events?.slice(-100) };
      history.value = [summary];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value)); } catch { history.value = []; }
    }
  };
  const add = (entry: MatchHistoryEntry) => {
    history.value = [entry, ...history.value.filter((candidate) => candidate.gameId !== entry.gameId)].slice(0, 50);
    persist();
  };
  const remove = (gameId: string) => { history.value = history.value.filter((entry) => entry.gameId !== gameId); persist(); };
  const clear = () => { history.value = []; persist(); };
  if (import.meta.client) hydrate();
  return { history, add, remove, clear };
}
