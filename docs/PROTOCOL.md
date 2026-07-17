# Protocol

Protocol version is `aeonfront/1`. Every client message contains `action`, `protocolVersion` and a unique `requestId`. Every server message contains `event`, `protocolVersion`, an increasing transport `sequence`, optional matching `requestId` and `payload`.

## Client actions

`status`, `authenticate`, `join`, `selectDeck`, `ready`, `practice`, `submitTurn`, `undoTurn`, `lockTurn`, `raiseBanner`, `withdraw`, `requestSync`, `requestRematch`, `chatMessage` and `pong`.

`submitTurn` includes the current turn plus ordered deployments and optional moves. The server validates hand ownership, card instances, targets, adjusted cost, capacity and phase. Repeated ids are idempotent within a connection, and rule ids are namespaced by player.

## Server events

`serverStatus`, `authenticated`, `joined`, `reconnected`, `cardDataVersion`, `assetDataVersion`, `roomState`, `privateGameState`, `publicGameState`, `turnAccepted`, `turnLocked`, `bannerRaised`, `playerWithdrew`, `gameEnded`, `chatMessage` and structured `error`.

Private game state contains only the recipient's hand. Opponent deck is a count, unrevealed instances have no `cardId`, hidden-power fronts return `null`, and private plan events are filtered. Reconnect supplies the same authoritative private view and current deadline.
