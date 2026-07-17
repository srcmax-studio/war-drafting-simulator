import type { BattleSummary, GameEvent } from '~/common/src/index';

export function publicHistoryEvents(summary: BattleSummary): GameEvent[] {
  return summary.timeline.map((entry) => ({
    sequence: entry.sequence,
    turn: entry.turn,
    type: entry.type,
    playerId: entry.playerId,
    public: true,
    payload: {
      ...(entry.frontId ? { frontId: entry.frontId } : {}),
      ...(entry.cardId ? { cardId: entry.cardId } : {}),
      ...(entry.magnitude !== undefined ? { magnitude: entry.magnitude } : {})
    }
  }));
}
