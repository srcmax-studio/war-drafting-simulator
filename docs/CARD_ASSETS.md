# Card Assets

The image repository's `main` branch is authoritative and contains `webp/`, `hd/`, scripts and generated indexes. Compatibility `webp` and `hd` split branches remain for older consumers but builds do not switch branches.

`generated/card-assets.json` maps card id, UID, character name, slug and image key to WebP, thumbnail and HD paths. Validation checks missing files, unsupported extensions, unreferenced assets and duplicate binary content. Current mapping covers 824 WebP and 824 HD images with zero fallbacks.

Nuxt exposes `assets/card-images/webp` at `/cards` for Web builds. Images have stable dimensions, lazy loading and an era-derived programmatic fallback used only on load failure. Electron uses the same pinned tree offline; `AEONFRONT_ASSET_MODE=hd` selects PNG during generation without checkout mutations.

New art must use the exact character name as `${name}.webp` and `${name}.png`, then run the image repository index and validation commands plus this client's `validate:assets`.
