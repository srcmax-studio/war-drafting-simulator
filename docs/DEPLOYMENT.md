# Deployment

## Web

Run `npm ci`, initialize submodules, validate data and execute `npm run build`. Deploy `.output` as a Node/Nitro application when using the optional `/api/servers` listing. Configure `MONGODB_URI` only for that listing; without it, the read endpoint safely returns an empty array. Never expose database credentials to client runtime configuration.

Static hosts can use `npm run generate` and `.output/public`; server-list APIs are unavailable there. Web assets use pinned WebP files and relative `/cards` paths.

## Server

Build the server repository, create an untracked `config/server.json`, enable TLS for public browser clients and run `npm start`. Health is `GET /health`. Public listing is opt-in and verifies the remote endpoint before database upsert.

## Electron

`npm run app:build` generates the SPA and builds an ad-hoc signed macOS directory with offline WebP assets. This development signature uses no certificate and is not notarization. `npm run app:build:hd` chooses HD PNG and increases package size substantially. Windows uses the configured NSIS target. Production Electron serves `.output/public` over a loopback-only static server with context isolation and sandbox enabled.

No deployment step publishes packages, changes DNS or migrates production databases automatically.
