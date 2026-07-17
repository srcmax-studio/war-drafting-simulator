# Architecture

```text
character source -> generated card catalog ----+
                                              |
image source ----> generated asset index ------+--> Nuxt / Electron client
                                              |
shared rules + protocol -----------------------+--> authoritative server
```

The common repository owns JSON-compatible domain state, seeded RNG, validation, effects, scoring, views and replay. It has no browser, clock, database or network dependency. Client and server pin it as a submodule.

The character repository preserves the 824 source records and deterministically generates TCG cards and six presets. The image repository maps those cards to WebP and HD files. The client pins both repositories, exposes only the selected image directory through Nitro public assets and paginates the complete catalog.

The server owns deadlines and all mutations. WebSocket connections map to reconnectable player records. Every action has a protocol version and request id; rule-layer ids are namespaced by player. Player views remove opponent hands, deck order, unrevealed cards and plans. Practice uses the same engine and an AI that consumes its private view rather than the opponent's hidden data.

Game history stores the serialized deterministic state and event log under `aeonfront_match_history_v1`. Replay recreates the initial setup and re-applies player action events, then requires byte-equivalent serialized state.
