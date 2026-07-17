# Animation System

## Structure

Battle presentation is separated from rules and state:

```text
app/animations/presets.ts     duration, easing, keyframes
app/animations/event-map.ts   authoritative event to motion/audio cue
app/animations/timeline.ts    ordered queue, merge, skip, failure isolation
app/composables/useMotionSettings.ts
app/composables/useBattleAnimation.ts
```

The rules engine publishes immutable ordered events. The client immediately accepts the newest authoritative state, then presents mapped events in sequence. Presentation cannot write rules state.

## Queue invariants

- Incoming batches are sorted by `sequence`.
- A sequence at or below the last accepted value is ignored.
- Adjacent numeric effects from one source may merge into one cue.
- A failed animation is caught and the next event continues.
- Reconnect seeds the last sequence and does not replay history.
- Skip removes pending nonessential cues while preserving state-defining presentation.
- Replay uses the same event mapping at controllable speed.

## Motion vocabulary

Page and surface motion includes page entry, panel entry, dialog, drawer, toast, skeleton, and numeric change. Card motion includes draw, deploy, reveal, move, power up/down, death, return, copy, and generation. Front motion includes fog reveal, control pulse, effect resolution, lock, and outcome. Major overlay cues include turn, initiative, banner, stake, withdrawal, victory, defeat, and draw.

Presets favor transform and opacity. Short-lived brightness and shadow effects are bounded. Layout properties are not animated on dense battle surfaces.

## User controls

Normal mode uses full authored timing. Fast mode uses 55 percent duration. Instant mode reduces nonessential duration to zero. Reduced motion honors both the setting and system preference; essential state changes use opacity or a static final marker. Low effects quality reduces ambient particles independently of event clarity.

## Verification

Unit coverage verifies ordering, deduplication, numeric merge, reconnect seeding, and continuation after a presentation failure. Browser acceptance verifies that state advances under reduced and instant modes and that no animation creates page overflow.
