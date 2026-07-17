export type OnlineStatus = 'idle' | 'connecting' | 'authenticating' | 'lobby' | 'room' | 'matchmaking' | 'game' | 'reconnecting' | 'error';

const FATAL_ERROR_CODES = new Set(['PROTOCOL_MISMATCH', 'AUTHENTICATION_FAILED', 'SERVER_FULL', 'CATALOG_VERSION_MISMATCH']);

export function isFatalOnlineError(code: unknown): boolean {
  return typeof code === 'string' && FATAL_ERROR_CODES.has(code);
}

export function nextOnlineStatus(current: OnlineStatus, event: string, payload: Record<string, unknown> = {}): OnlineStatus {
  if (event === 'lobbyEntered') return 'lobby';
  if (event === 'lobbySnapshot') {
    if (current === 'game' || current === 'room') return current;
    const matchmaking = payload.matchmaking as Record<string, unknown> | undefined;
    return matchmaking?.status && matchmaking.status !== 'idle' ? 'matchmaking' : 'lobby';
  }
  if (['roomCreated', 'roomJoined', 'roomUpdated', 'roomState'].includes(event)) return payload.status === 'playing' ? current : 'room';
  if (event === 'roomLeft') return current === 'game' ? current : 'lobby';
  if (event === 'matchmakingQueued' || event === 'matchmakingUpdated') return payload.status === 'idle' ? 'lobby' : 'matchmaking';
  if (event === 'matchFound') return 'matchmaking';
  if (event === 'matchCancelled' || event === 'returnedToLobby') return 'lobby';
  if (['gameStarting', 'gameStarted', 'privateGameState'].includes(event)) return 'game';
  if ((event === 'error' || event === 'roomError') && isFatalOnlineError(payload.code)) return 'error';
  return current;
}
