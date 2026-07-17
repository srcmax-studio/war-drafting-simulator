# Lobby and Room System

## Lobby responsibilities

The lobby is entered only after transport, optional authentication, session join, and `enterLobby`. Its snapshot contains server status, public presence, room summaries, bounded recent chat, and the current player's matchmaking state.

Presence exposes nickname, public activity state, join time, and latency band. It never exposes network address, reconnect credential, authentication credential, private deck list, or room password.

Room listing supports refresh, search, joinable-only filtering, and live create/update/remove events. Each summary presents name, host, occupancy, spectator capacity reserved for future use, status, privacy, mode, creation time, and tags.

## Room lifecycle

1. A lobby member creates or joins one room.
2. The room contains exactly two player slots for the current game mode.
3. Each member submits a versioned legal deck; the opponent sees deck name and validity only.
4. Members set readiness independently.
5. The server starts one isolated game when both players are ready.
6. Leaving before play transfers host ownership or removes an empty room.
7. Match completion may return both sessions to the lobby or run a rematch in the same room lifecycle.

The host may change bounded room settings and remove the other member while waiting. Password verification occurs only on the server. Client-provided timers, tags, content packs, and spectator settings are constrained by server policy.

## Matchmaking

One session may own at most one ticket. Matching creates a temporary room and confirmation deadline. Both participants must accept. Cancel, decline, timeout, or disconnect removes the ticket and releases temporary state. The protocol retains optional rating fields without implementing a public ladder.

## Chat

Lobby and room chat have separate channels and membership checks. The server enforces length, frequency, input filtering, and bounded history. Room messages are broadcast only to current room members. Client lists deduplicate by message ID and keep the configured recent-message limit.

## Client state

The online lifecycle is `idle`, `connecting`, `authenticating`, `lobby`, `room`, `matchmaking`, `game`, `reconnecting`, or `error`. Server events drive transitions; route changes do not invent state. Replacing a socket invalidates callbacks from the older socket, preventing a late close from overwriting the new connection.
