# Audio System

## Asset set

The release contains eight original music cues and 32 original sound effects. The source synthesis is deterministic, uses layered tones, percussion, filtered noise, envelopes, stereo placement, and normalization, then produces release encodings.

| Music scene | Cue |
| --- | --- |
| Home | `home-theme` |
| Lobby | `lobby-theme` |
| Room | `room-theme` |
| Battle | `battle-theme` |
| Final turn | `final-turn` |
| Victory | `victory` |
| Defeat | `defeat` |
| Draw or withdrawal | `draw-withdrawal` |

Effects cover interface commands, card hover/select/draw/deploy/reveal/move/copy/generate/death/revive/return, power changes, front lock/reveal/effect, turn countdown and lock states, initiative, banner, stake, withdrawal, and outcomes.

## Release format

Every cue ships as 44.1 kHz stereo MP3 and Ogg Vorbis. The browser selects Ogg when supported and falls back to MP3. Music stays below 1.2 MB per file, effects below 180 KB per file, and the total set below 12 MB.

```bash
npm run process:audio
npm run validate:audio
```

Processing strips metadata and writes duration and hashes to `public/assets/audio/manifest.json`. Validation checks count, file presence, codecs, channels, sample rate, duration, unique content, hashes, per-file limits, and total size.

## Runtime behavior

Audio remains locked until a pointer or keyboard interaction. No route forces playback before that gate. Music uses scene-level fade transitions and loops only long-form cues. Effects have separate interface and battle channels and permit at most three simultaneous instances of the same cue.

Settings include enabled state, master, music, effects, interface volume, and mute when unfocused. Values persist between sessions and are clamped to 0 through 1 when hydrated. When focus muting is enabled, the active music element follows document visibility. Mobile and desktop clients share the same manager.

## Loading policy

Audio elements preload metadata or load at the moment of use. Home does not request the complete battle sound set. Entering battle selects the normal battle scene; turn six selects the final-turn layer; result selects the outcome cue. Muting changes output volume without destroying persisted channel settings.
