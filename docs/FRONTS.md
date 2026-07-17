# Fronts

The common package defines thirty enabled original fronts, of which every match selects three distinct entries with seeded random. Effects cover military-order cost, deployment restrictions, base power, era/region/profession/identity synergy, movement, random movement, draw, copy, discard, destruction, return, capacity, silence, repeated deploy triggers, delayed and early reveal, hidden power, final inversion, negative-power recovery, silenced-card reward, lone-card reward, full capacity and cross-era composition.

Every front includes localized names and descriptions, effect id, structured args, enabled flag, weight, tags and strategy text. Static modifiers participate in validation or power calculation; dynamic effects emit deterministic end-of-turn events. Unknown effect ids fail validation.

Add fronts in `src/fronts.ts` of the common repository, implement the effect in the engine, provide a focused test and run `npm run validate:fronts`. Server configuration may filter enabled entries before game creation.
