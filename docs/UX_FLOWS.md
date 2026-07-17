# Aeonfront UX Flows

## Primary navigation

The home screen is the product entry rather than a marketing page. It exposes practice, online play, deck building, card collection, front archive, match history, rules, and settings. Returning users can resume their most recent mode without losing access to the explicit mode selector.

## Practice flow

1. Home or mode selection opens `/play`.
2. The player chooses a legal twelve-card deck.
3. Practice starts at `/game?mode=practice` against the deterministic practice opponent.
4. The player may click or drag a card, choose a front, reorder or clear the plan, raise the banner, withdraw, and lock the turn.
5. Six turns resolve through the shared rules engine.
6. The board completes final presentation before navigation to `/result/:gameId`.
7. Result actions support rematch, replay, history, export, deletion, and return home.

## Online flow

```text
Server browser -> connection -> lobby -> room or matchmaking
-> deck selection -> ready -> game -> result -> lobby
```

Connecting never marks a player ready. The lobby is the stable online hub. It exposes server health, presence, rooms, lobby chat, quick matching, and disconnect. A room owns its two player slots, deck names, readiness, settings, and room chat. Only the server starts a match after both submitted decks are valid and both players are ready.

## Matchmaking flow

Joining the queue creates one ticket per session. The waiting view shows elapsed time and queue state. A found match enters a confirmation window. Accepting both sides proceeds to the room and game; decline, timeout, or disconnect releases the ticket and room. The player can cancel while queued.

## Reconnect flow

The reconnect token is stored per server URL and is never placed in route parameters, exports, chat, metrics, or match history. A transport loss enters a bounded exponential retry sequence. Successful sync restores lobby, room, or private game state. Historical battle animation is seeded at the received sequence so it is not replayed after reconnect.

After the retry limit, the connection error page explains the failure and offers server browser and retry actions. It does not silently create a new identity.

## Result and replay flow

The result route has four views: three-front overview, complete player statistics, key figures and turning points, and localized timeline. Replay reconstructs state from deterministic actions and can jump to a selected event sequence. Online history stores only the public summary and public timeline projection; local history may retain the compact deterministic game record.

## State conventions

- Every data view has loading, empty, error, disabled, and ready states.
- Back navigation returns to the previous stable hub, not an intermediate transport state.
- Destructive actions require confirmation.
- Validation errors stay near the active workflow and also use a non-blocking announcement when appropriate.
- Dragging is optional; all game actions remain available by click or touch.
