import type { GameWinner } from '~/common/src/index';

export interface MatchHistoryEntry {
  gameId: string;
  timestamp: number;
  mode: 'practice' | 'online';
  playerId: string;
  deckName: string;
  serializedGame: string;
  winner: GameWinner | null;
}

const STORAGE_KEY = 'aeonfront_match_history_v1';

export function useMatchHistory() {
  const history = useState<MatchHistoryEntry[]>('aeonfront-history', () => []);
  const hydrated = useState<boolean>('aeonfront-history-hydrated', () => false);
  const hydrate = () => {
    if (!import.meta.client || hydrated.value) return;
    hydrated.value = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) history.value = JSON.parse(stored) as MatchHistoryEntry[];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  };
  const persist = () => { if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value.slice(0, 50))); };
  const add = (entry: MatchHistoryEntry) => {
    history.value = [entry, ...history.value.filter((candidate) => candidate.gameId !== entry.gameId)].slice(0, 50);
    persist();
  };
  const remove = (gameId: string) => { history.value = history.value.filter((entry) => entry.gameId !== gameId); persist(); };
  const clear = () => { history.value = []; persist(); };
  if (import.meta.client) hydrate();
  return { history, add, remove, clear };
}
