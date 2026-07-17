# Protocol

Protocol version is `aeonfront/2`. Every client message contains `action`, `protocolVersion` and a unique `requestId`. Every server message contains `event`, `protocolVersion`, an increasing transport `sequence`, optional matching `requestId` and `payload`.

## Versioned decks

`selectDeck` and `practice` contain both the twelve ordered `cardIds` and a versioned `deck` object. The object includes deck Schema version, stable deck ID, display name, catalog version and active pack versions. The envelope and object card lists must match.

The server rejects missing or stale versions, unknown IDs, duplicates and lists other than twelve cards with structured errors. It resolves cost, power, tags and abilities from its canonical catalog; client-supplied rule data is never accepted. Room, reconnect, rematch, game setup and history retain the deck ID and name.

## Client actions

`status`, `authenticate`, `join`, `selectDeck`, `ready`, `practice`, `submitTurn`, `undoTurn`, `lockTurn`, `raiseBanner`, `withdraw`, `requestSync`, `requestRematch`, `chatMessage` and `pong`.

`submitTurn` includes the current turn plus ordered deployments and optional moves. The server validates hand ownership, card instances, targets, adjusted cost, per-player capacity, movement and deployment locks, and phase. Repeated request IDs are idempotent within a connection, and rule IDs are namespaced by player.

## Server events

`serverStatus`, `authenticated`, `joined`, `reconnected`, `cardDataVersion`, `assetDataVersion`, `roomState`, `privateGameState`, `publicGameState`, `turnAccepted`, `turnLocked`, `bannerRaised`, `playerWithdrew`, `gameEnded`, `chatMessage` and structured `error`.

Private game state contains only the recipient's hand. Opponent deck is a count, unrevealed instances have no `cardId`, hidden-power fronts return `null`, private plan events are filtered, and unrevealed front definitions use stable slot aliases without rule metadata. Reconnect supplies the same authoritative private view, catalog version, capacities, locks and current deadline.
