# Fronts

The common package defines 72 enabled original fronts. Every match selects three distinct entries with seeded weighted selection while enforcing front IDs, tags and explicit incompatibilities. All fronts belong to the released core pack.

The pool covers military-order economy, hand and deck pressure, deployment restrictions, changing capacity, era/region/profession/identity/faction/tag synergy, movement and position exchange, discard, destruction, revival, delayed and early reveal, hidden power, endgame inversion, catch-up pressure and shared or migrating scoring. Dynamic and high-risk rules use deterministic multi-stage events.

Every front includes localized names and descriptions, effect ID, structured arguments, enabled flag, weight, complexity, categories, incompatibilities, minimum client version, pack ID, tags and strategy text. Static modifiers participate in validation or power calculation; dynamic effects emit replayable events. Unknown effect IDs fail validation.

Add fronts in `src/fronts.ts` of the common repository, implement the effect in the engine, register the front in exactly one content pack, provide direct normal and edge-case tests, then run `npm run validate:fronts` and replay verification. Server configuration may filter disabled packs before game creation.
