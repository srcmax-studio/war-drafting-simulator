export type MusicScene = 'home' | 'lobby' | 'room' | 'battle' | 'final-turn' | 'victory' | 'defeat' | 'draw';
export type AudioCue = 'button' | 'button-primary' | 'back' | 'error' | 'success' | 'card-hover' | 'card-select' | 'card-draw' | 'card-deploy' | 'card-reveal' | 'power-up' | 'power-down' | 'card-move' | 'card-copy' | 'card-generate' | 'card-death' | 'card-revive' | 'card-return' | 'front-lock' | 'front-reveal' | 'front-effect' | 'turn-start' | 'countdown' | 'lock-own' | 'lock-opponent' | 'initiative' | 'banner' | 'stake-up' | 'withdrawal' | 'victory' | 'defeat' | 'draw';

export interface AudioSource { mp3: string; ogg: string }
const source = (path: string): AudioSource => ({ mp3: `${path}.mp3`, ogg: `${path}.ogg` });

export const MUSIC_TRACKS: Record<MusicScene, AudioSource> = {
  home: source('/assets/audio/music/home-theme'),
  lobby: source('/assets/audio/music/lobby-theme'),
  room: source('/assets/audio/music/room-theme'),
  battle: source('/assets/audio/music/battle-theme'),
  'final-turn': source('/assets/audio/music/final-turn'),
  victory: source('/assets/audio/music/victory'),
  defeat: source('/assets/audio/music/defeat'),
  draw: source('/assets/audio/music/draw-withdrawal')
};

export const SFX_TRACKS: Record<AudioCue, AudioSource> = Object.fromEntries([
  'button', 'button-primary', 'back', 'error', 'success', 'card-hover', 'card-select', 'card-draw', 'card-deploy', 'card-reveal', 'power-up', 'power-down', 'card-move', 'card-copy', 'card-generate', 'card-death', 'card-revive', 'card-return', 'front-lock', 'front-reveal', 'front-effect', 'turn-start', 'countdown', 'lock-own', 'lock-opponent', 'initiative', 'banner', 'stake-up', 'withdrawal', 'victory', 'defeat', 'draw'
].map((cue) => [cue, source(`/assets/audio/sfx/${cue}`)])) as Record<AudioCue, AudioSource>;
