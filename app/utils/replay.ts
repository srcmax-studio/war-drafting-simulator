import {
  createGame,
  lockTurn,
  raiseBanner,
  submitTurnIntent,
  undoTurnIntent,
  withdraw,
  type GameState,
  type TurnIntent
} from '~/common/src/index';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function replayToSequence(source: GameState, sequence: number): GameState {
  const replayed = createGame({ ...clone(source.setup), gameId: source.gameId });
  const actions = source.eventLog.filter((event) => event.sequence <= sequence && ['turn_submitted', 'turn_undone', 'turn_locked', 'banner_raised', 'player_withdrew'].includes(event.type));
  for (const event of actions) {
    if (!event.playerId || replayed.phase === 'ended') continue;
    if (event.type === 'turn_submitted') submitTurnIntent(replayed, event.playerId, clone(event.payload.intent) as TurnIntent);
    else if (event.type === 'turn_undone') undoTurnIntent(replayed, event.playerId, String(event.payload.requestId ?? ''));
    else if (event.type === 'turn_locked') lockTurn(replayed, event.playerId, String(event.payload.requestId ?? ''));
    else if (event.type === 'banner_raised') raiseBanner(replayed, event.playerId, String(event.payload.requestId ?? ''));
    else if (event.type === 'player_withdrew') withdraw(replayed, event.playerId, String(event.payload.requestId ?? ''));
  }
  return replayed;
}
