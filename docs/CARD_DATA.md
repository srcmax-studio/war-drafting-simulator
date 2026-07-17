# Card Data

`characters.json` is the human-authored source. Generation preserves UID, ID, name, era, geography, original cost and rarity, profession, identity, description, original skill, five attributes and tags. `generated/tcg-cards.json` adds a stable `cardId`, slug, competitive cost and power, registered ability, structured args, trigger, target rule, localized text, faction, set, version and image key.

All 824 valid source records are generated. No source category is automatically filtered or disabled. Natural-language skills remain display context and are never parsed as executable rules.

To add a card, add a unique source record in the character repository, run `npm run generate` and `npm run validate:cards`, add matching images, rebuild the asset index and update pinned submodules. Ability ids must already exist in `ABILITY_REGISTRY`; new abilities require deterministic handlers and tests in the common repository.

Six preset decks each contain twelve unique cards and enforce a playable cost curve with early, middle and late costs.
