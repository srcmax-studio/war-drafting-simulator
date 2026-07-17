import type { GameEvent } from '~/common/src/index';
import { BattleAnimationQueue, type QueuedBattleEvent } from '~/animations/timeline';

export function useBattleAnimation() {
  const active = ref<QueuedBattleEvent | null>(null);
  const { duration, settings } = useMotionSettings();
  const { playSfx } = useAudioManager();
  const queue = new BattleAnimationQueue(async (entry) => {
    active.value = entry;
    if (entry.cue.audio) void playSfx(entry.cue.audio);
    const wait = settings.value.reducedMotion && !entry.cue.essential ? 0 : duration(entry.cue.motion);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 900)));
    active.value = null;
  });
  const enqueue = (events: readonly GameEvent[], reconnecting = false) => {
    if (reconnecting && events.length) queue.seed(events.at(-1)!.sequence);
    else queue.enqueue(events);
  };
  return { active, enqueue, skip: () => queue.skip(), reset: (sequence?: number) => queue.clear(sequence) };
}
