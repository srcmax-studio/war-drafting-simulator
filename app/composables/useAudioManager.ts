import { MUSIC_TRACKS, SFX_TRACKS, type AudioCue, type AudioSource, type MusicScene } from '~/audio/manifest';
import type { AppSettings } from './useSettings';

let currentMusic: HTMLAudioElement | null = null;
let currentScene: MusicScene | null = null;
let pendingScene: MusicScene | null = null;
let unlocked = false;
let initialized = false;
const activeSfx = new Map<AudioCue, number>();
let supportsOgg: boolean | null = null;
export const MAX_CONCURRENT_SFX = 3;

export const canStartAudio = (isUnlocked: boolean, enabled: boolean): boolean => isUnlocked && enabled;

export const effectiveAudioVolume = (settings: AppSettings, channel: 'music' | 'sfx' | 'interface'): number => {
  if (!settings.audio.enabled) return 0;
  const channelVolume = channel === 'music' ? settings.audio.musicVolume : channel === 'interface' ? settings.audio.interfaceVolume : settings.audio.sfxVolume;
  return Math.max(0, Math.min(1, settings.audio.masterVolume * channelVolume));
};

const sourceFor = (asset: AudioSource): string => {
  if (!import.meta.client) return asset.mp3;
  supportsOgg ??= Boolean(document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"'));
  return supportsOgg ? asset.ogg : asset.mp3;
};

export function useAudioManager() {
  const { settings } = useSettings();

  const effectiveVolume = (channel: 'music' | 'sfx' | 'interface') => effectiveAudioVolume(settings.value, channel);

  const fade = (audio: HTMLAudioElement, target: number, duration = 320) => new Promise<void>((resolve) => {
    const start = audio.volume;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - started) / Math.max(1, duration)));
      audio.volume = Math.max(0, Math.min(1, start + (target - start) * progress));
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  const playMusic = async (scene: MusicScene) => {
    pendingScene = scene;
    if (!import.meta.client || !canStartAudio(unlocked, settings.value.audio.enabled) || currentScene === scene) return;
    pendingScene = null;
    const previous = currentMusic;
    const next = new Audio(sourceFor(MUSIC_TRACKS[scene]));
    next.loop = !['victory', 'defeat', 'draw'].includes(scene);
    next.preload = 'metadata';
    next.volume = 0;
    currentMusic = next;
    currentScene = scene;
    try {
      await next.play();
      void fade(next, effectiveVolume('music'));
      if (previous) void fade(previous, 0, 220).then(() => { previous.pause(); previous.src = ''; });
    } catch { currentMusic = null; currentScene = null; }
  };

  const stopMusic = async () => {
    const previous = currentMusic;
    currentMusic = null;
    currentScene = null;
    if (previous) await fade(previous, 0, 180).then(() => previous.pause());
  };

  const playSfx = async (cue: AudioCue, channel: 'sfx' | 'interface' = 'sfx') => {
    if (!import.meta.client || !canStartAudio(unlocked, settings.value.audio.enabled) || (activeSfx.get(cue) ?? 0) >= MAX_CONCURRENT_SFX) return;
    const audio = new Audio(sourceFor(SFX_TRACKS[cue]));
    audio.preload = 'auto';
    audio.volume = effectiveVolume(channel);
    activeSfx.set(cue, (activeSfx.get(cue) ?? 0) + 1);
    const release = () => activeSfx.set(cue, Math.max(0, (activeSfx.get(cue) ?? 1) - 1));
    audio.addEventListener('ended', release, { once: true });
    audio.addEventListener('error', release, { once: true });
    try { await audio.play(); } catch { release(); }
  };

  const syncVolume = () => {
    if (currentMusic) currentMusic.volume = effectiveVolume('music');
  };

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    if (pendingScene) void playMusic(pendingScene);
  };

  if (import.meta.client && !initialized) {
    initialized = true;
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (!currentMusic || !settings.value.audio.muteWhenUnfocused) return;
      currentMusic.muted = document.hidden;
    });
  }

  return { playMusic, stopMusic, playSfx, syncVolume, unlock };
}

export function useSceneAudio(scene: MusicScene) {
  const audio = useAudioManager();
  onMounted(() => void audio.playMusic(scene));
  return audio;
}
