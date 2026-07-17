# Front Art Pipeline

## Source of truth

`data/front-art-prompts.json` contains one record for each of the 72 enabled fronts. Every record has the front ID, Chinese name, theme, gameplay meaning, prompt, exclusions, and normalized focal point. Prompt construction is deterministic and derives from the canonical front catalog.

Source renders live in the ignored `.front-art-source/` directory. Released files live only under `public/assets/fronts/`. Source files are never required by the web or desktop build.

## Commands

```bash
npm run generate:front-art
npm run process:front-art
npm run validate:front-art
```

Generation requires an explicitly configured image service credential and writes one source per front. `--front=<frontId>` limits generation to one front; `--overwrite` permits a technical replacement. Network, rate-limit, service, and corrupt-output failures stop after the bounded retry policy. Continuous integration runs validation only and never requests new images.

Processing accepts PNG, JPEG, or WebP sources and emits:

| Variant | Dimensions | Quality target | Maximum size |
| --- | --- | --- | --- |
| HD | 1536x1024 | 86 | 1,600,000 bytes |
| Web | 960x640 | 82 | 550,000 bytes |
| Thumbnail | 480x320 | 78 | 180,000 bytes |

All released variants are WebP. Processing strips metadata, calculates SHA-256 hashes, average color, focal point, and Chinese alternative text, then rebuilds `manifest.json`. Set `FRONT_ART_MODEL` to a neutral model identifier when processing sources produced outside the built-in generation route.

## Validation

Validation checks the 72-record contract, unique IDs, prompt hashes, source-to-manifest coverage, file existence, WebP decoding, exact dimensions, file budgets, per-variant hashes, unique web content, focal-point range, alternative text, and the generic hidden asset.

Structural validation is followed by contact-sheet review at useful thumbnail size and individual review at native dimensions. Review rejects text, numbers, arrows, logos, watermarks, frames, panels, card-shaped overlays, blood, bodies, commercial characters, duplicated compositions, or a scene that contradicts its gameplay meaning.

## Runtime loading

Archive views load thumbnails. Normal battle views load web assets. Desktop HD builds may select HD assets. The home route does not preload all front art. A match preloads only its three revealed or revealable front IDs. Unrevealed fronts resolve to the shared hidden asset and do not place their real scene URL in the visible DOM.
