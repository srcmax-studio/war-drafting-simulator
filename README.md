# 万世战线 Aeonfront

**群英跨越时代，三线决定天下。**  A short-form two-player TCG for Web and Electron.

Players bring twelve unique character cards, gain increasing military orders over six turns, and deploy simultaneously across three seeded fronts. The authoritative shared engine resolves reveal order, structured abilities, front effects, banner stakes, withdrawal and scoring without an external model.

## Repository family

| Repository | Responsibility |
| --- | --- |
| `war-drafting-simulator` | Nuxt 4 Web client, local practice and Electron shell |
| `war-drafting-simulator-server` | Authoritative Node.js WebSocket server |
| `war-drafting-simulator-common` | Rules, protocol, replay and validation |
| `war-drafting-simulator-characters` | 824 source characters, TCG configs and six presets |
| `wds-characters-images` | 824 WebP, 824 HD images and asset index |

Repository names remain stable for existing infrastructure. Product-facing names, storage keys, module names and application identity use Aeonfront.

## Quick start

Node.js 20 or newer is required.

```bash
git submodule update --init --recursive
npm install
npm run dev
```

Open `http://localhost:3000`. Practice mode is fully local. For online play, start the server repository, open two browser sessions, choose legal decks and connect both to `ws://127.0.0.1:3001`.

## Verification and builds

```bash
npm run lint
npm run typecheck
npm test
npm run validate:cards
npm run validate:assets
npm run validate:fronts
npm run build
npm run generate
npm run app:build
```

Web builds use lazy WebP assets. Electron packages WebP offline by default; `npm run app:build:hd` selects the pinned HD directory without changing Git branches. No API key is needed for any game mode.

## Documentation

See [game design](docs/GAME_DESIGN.md), [rules](docs/RULES.md), [architecture](docs/ARCHITECTURE.md), [protocol](docs/PROTOCOL.md), [card data](docs/CARD_DATA.md), [assets](docs/CARD_ASSETS.md), [fronts](docs/FRONTS.md), [balance](docs/BALANCE.md), [migration](docs/MIGRATION.md), [local development](docs/LOCAL_DEVELOPMENT.md) and [deployment](docs/DEPLOYMENT.md).
