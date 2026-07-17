# Scaling Roadmap

## Current release

The current server is a single authoritative process with in-memory stores. Its verified local baseline is 100 simultaneous connections, 50 lobby users, 25 rooms, and 20 simultaneous 1v1 games. The design favors correctness and isolation before distribution.

## Stage 1: durable identity and records

- Implement the existing profile, session, room, and match store interfaces with a durable database.
- Keep active deterministic game state serializable and checkpoint at turn boundaries.
- Add schema versioning, retention, backup, and restore procedures.
- Separate public match summaries from private replay authorization.

## Stage 2: shared session and presence

- Move resumable session and presence records to a shared low-latency store.
- Implement the message-bus interface for node-to-node lobby and room events.
- Add atomic ownership leases with expiry and fencing tokens.
- Route reconnects to the owning node or transfer serialized ownership safely.

## Stage 3: multi-node games

- Assign rooms and games to nodes through the existing ownership abstraction.
- Preserve one authoritative writer per game.
- Replicate checkpoints and public summaries, not mutable rule objects.
- Make timers recoverable from absolute deadlines rather than process-local elapsed time.
- Add instance, region, and ownership labels to aggregate metrics without player identifiers.

## Stage 4: social and competitive systems

Accounts, friends, rankings, spectating, tournaments, and moderation remain separate services around the same 1v1 engine. Spectating requires an explicit delayed public view. Rankings consume signed match outcomes and never influence deterministic resolution.

## Capacity discipline

Before raising production limits, repeat connection, room, concurrent-game, reconnect, message-burst, and long-duration memory tests with realistic latency. Define admission control per node, protect backpressure thresholds, and fail readiness before saturation. Scaling must not weaken room isolation, request deduplication, or hidden-information boundaries.
