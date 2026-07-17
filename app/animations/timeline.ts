import type { GameEvent } from '~/common/src/index';
import { presentationFor, type BattlePresentationCue } from './event-map';

export interface QueuedBattleEvent {
  event: GameEvent;
  cue: BattlePresentationCue;
  mergedCount: number;
}

export class BattleAnimationQueue {
  private pending: QueuedBattleEvent[] = [];
  private playing = false;
  private skipRequested = false;
  private lastSequence = 0;

  constructor(private readonly play: (entry: QueuedBattleEvent) => Promise<void>) {}

  seed(sequence: number): void {
    this.lastSequence = Math.max(this.lastSequence, sequence);
  }

  enqueue(events: readonly GameEvent[]): void {
    for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
      if (event.sequence <= this.lastSequence) continue;
      this.lastSequence = event.sequence;
      const cue = presentationFor(event);
      if (!cue) continue;
      const previous = this.pending.at(-1);
      if (previous && previous.event.type === 'ability_effect_applied' && event.type === 'ability_effect_applied' && previous.event.payload.sourceInstanceId === event.payload.sourceInstanceId) {
        previous.mergedCount += 1;
        previous.event = event;
      } else this.pending.push({ event, cue, mergedCount: 1 });
    }
    if (!this.playing) void this.flush();
  }

  skip(): void {
    this.skipRequested = true;
    this.pending = this.pending.filter((entry) => entry.cue.essential);
  }

  clear(sequence = this.lastSequence): void {
    this.pending = [];
    this.lastSequence = sequence;
    this.skipRequested = false;
  }

  private async flush(): Promise<void> {
    this.playing = true;
    try {
      while (this.pending.length > 0) {
        const entry = this.pending.shift()!;
        if (this.skipRequested && !entry.cue.essential) continue;
        try { await this.play(entry); } catch { /* Presentation never blocks authoritative state. */ }
      }
    } finally {
      this.playing = false;
      this.skipRequested = false;
    }
  }
}
