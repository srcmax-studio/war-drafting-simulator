# Local Development

Install Node.js 24+, clone all repositories into one parent directory and initialize recursive submodules. Run `npm install` in common, characters, images, server and client.

Start the server with TLS disabled:

```bash
cp config/server.example.json config/server.json
npm run dev
```

Then start this client with `npm run dev` and open `http://localhost:3000`. Practice requires no server. For online acceptance, open two independent browser contexts, connect both to `ws://127.0.0.1:3001`, select presets, ready, deploy and lock through six turns. Close one context and rejoin with its stored reconnect token to test recovery.

Run each repository's lint, typecheck, tests and build. The client additionally validates cards, assets and fronts. Browser acceptance uses the local Playwright script with the server lifecycle helper and checks desktop/mobile screenshots, image decode, practice completion, history replay and console errors.
