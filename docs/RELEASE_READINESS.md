# Release Readiness

## Release identity

- Product: 万世战线 Aeonfront
- Client version: 2.0.0
- Protocol: `aeonfront/3`
- Verified: 2026-07-17
- Game mode: authoritative 1v1, six turns, three fronts
- Content: 824 character cards, 72 enabled fronts, six preset decks

## Verified revision set

| Repository | Revision | Result |
| --- | --- | --- |
| Client implementation | `68ae74d4e8982ad881d5e72be8629cb4b951b4eb` | Verified |
| Common rules and protocol | `2ff61dea59f5462825cc9d3b099e6e0f8d437913` | Published |
| Character content | `9caf73accb8c3023441b8b57ebca96c36659587d` | Published |
| Character images | `5f31ebd088b22f5c7b3efa6973f45b410120ae8e` | Unchanged |
| Multiplayer server | `fef6b478c9762ce23ee2d1914a39bd0ab69f2565` | Published |

## Acceptance results

| Gate | Evidence | Result |
| --- | --- | --- |
| Client rules and replay | 36 tests, including deterministic six-turn replay | Passed |
| Common rules and protocol | 253 tests | Passed |
| Server behavior | 30 tests across 10 files | Passed |
| Online flow | Public room, custom decks, chats, six turns, reconnect, result, replay, rematch, withdrawal, quick match | Passed |
| Server load | 100 connections, 50 lobby users, 25 rooms, 20 concurrent games | Passed |
| Isolation | Room list summaries, room chat, game state, timers, hands and deck contents remain scoped | Passed |
| Front assets | 72 unique formal scenes plus one generic hidden-state scene | Passed |
| Audio | 8 music tracks and 32 effects, each in MP3 and Ogg | Passed |
| Responsive | 1920x1080, 1440x900, 1280x720, 1024x768, 768x1024, 430x932 and 390x844 | Passed |
| Accessibility | Automated audit of 15 pages and interaction states, including dialog focus trapping and restoration | Passed |
| Visual regression | 13 fixed-state baselines, reviewed and matched from a clean server | Passed |
| Web build | Nuxt production and static builds | Passed |
| Desktop build | macOS arm64 application, ad-hoc signed and strict deep verification | Passed |
| Desktop smoke | Packaged application startup, navigation, images and local match | Passed |

## Front artwork

- Source model label: `managed-image-model-undisclosed`.
- Source output: opaque 1536x1024 WebP, one formal result per enabled front.
- Processed HD output: 1536x1024 WebP at quality 86.
- Processed Web output: 960x640 WebP at quality 82.
- Processed thumbnail output: 480x320 WebP at quality 78.
- Largest observed files: 282,378 bytes HD, 110,526 bytes Web and 29,836 bytes thumbnail.
- No enabled front uses a placeholder or shares another front's image.
- CI validates committed files and never invokes the image model.

## Performance budgets

| Resource | Budget | Observed |
| --- | ---: | ---: |
| Initial JavaScript, gzip | 460,800 bytes | 137,534 bytes |
| Largest JavaScript chunk, gzip | 327,680 bytes | Within budget |
| Initial CSS, gzip | 40,960 bytes | 8,231 bytes |
| Initial images | 4,194,304 bytes | 533,540 bytes |
| Audio total | 12,582,912 bytes | 7,366,061 bytes |
| Largest music file | 1,258,291 bytes | 960,932 bytes |
| Electron application | 419,430,400 bytes | 357,575,603 bytes |

The measured first contentful paint was 156 ms on the local release audit. The
home route requested no audio, no HD assets, at most four front images and at
most six card images. Complete card data remains in a lazy route chunk.

## Verification commands

Client:

```bash
npm run lint
npm run typecheck
npm test
npm run validate:cards
npm run validate:assets
npm run validate:fronts
npm run validate:packs
npm run validate:front-art
npm run validate:audio
npm run test:accessibility
npm run test:browser
npm run test:responsive
npm run test:visual
npm run test:online
npm run build
npm run app:build
npm run test:performance
npm run test:electron
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Aeonfront.app
```

Server:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The complete server run includes lobby, rooms, matchmaking, reconnect, security,
integration, card coverage, concurrent games and load suites.

## Release boundaries

- The desktop artifact is ad-hoc signed for local acceptance. Distribution
  signing, notarization and production deployment require release credentials
  and are outside this repository verification.
- The build reports an informational stale browser-database warning and a large
  lazy card-catalog chunk warning. Both outputs remain within the enforced
  budgets and do not affect the initial route.
- No production infrastructure, DNS, account system, payment system or remote
  deployment is part of this release change.
