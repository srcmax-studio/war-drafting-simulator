export interface AppSettings {
  serverUrl: string;
  playerName: string;
  reducedMotion: boolean;
  highContrast: boolean;
  animationSpeed: 'normal' | 'fast' | 'instant';
  effectsQuality: 'high' | 'balanced' | 'low';
  audio: {
    enabled: boolean;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    interfaceVolume: number;
    muteWhenUnfocused: boolean;
  };
}

const STORAGE_KEY = 'aeonfront_settings_v2';
const clampVolume = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

export const createDefaultSettings = (): AppSettings => ({
  serverUrl: 'ws://127.0.0.1:3001',
  playerName: '玩家',
  reducedMotion: false,
  highContrast: false,
  animationSpeed: 'normal',
  effectsQuality: 'balanced',
  audio: {
    enabled: true,
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    interfaceVolume: 0.65,
    muteWhenUnfocused: true
  }
});

export function mergeAppSettings(value: unknown, base = createDefaultSettings()): AppSettings {
  if (!value || typeof value !== 'object') return base;
  const input = value as Partial<AppSettings>;
  const audio: Partial<AppSettings['audio']> = input.audio && typeof input.audio === 'object' ? input.audio : {};
  return {
    serverUrl: typeof input.serverUrl === 'string' ? input.serverUrl.trim().slice(0, 512) : base.serverUrl,
    playerName: typeof input.playerName === 'string' ? input.playerName.trim().slice(0, 24) : base.playerName,
    reducedMotion: typeof input.reducedMotion === 'boolean' ? input.reducedMotion : base.reducedMotion,
    highContrast: typeof input.highContrast === 'boolean' ? input.highContrast : base.highContrast,
    animationSpeed: ['normal', 'fast', 'instant'].includes(String(input.animationSpeed)) ? input.animationSpeed as AppSettings['animationSpeed'] : base.animationSpeed,
    effectsQuality: ['high', 'balanced', 'low'].includes(String(input.effectsQuality)) ? input.effectsQuality as AppSettings['effectsQuality'] : base.effectsQuality,
    audio: {
      enabled: typeof audio.enabled === 'boolean' ? audio.enabled : base.audio.enabled,
      masterVolume: clampVolume(audio.masterVolume, base.audio.masterVolume),
      musicVolume: clampVolume(audio.musicVolume, base.audio.musicVolume),
      sfxVolume: clampVolume(audio.sfxVolume, base.audio.sfxVolume),
      interfaceVolume: clampVolume(audio.interfaceVolume, base.audio.interfaceVolume),
      muteWhenUnfocused: typeof audio.muteWhenUnfocused === 'boolean' ? audio.muteWhenUnfocused : base.audio.muteWhenUnfocused
    }
  };
}

export function useSettings() {
  const settings = useState<AppSettings>('aeonfront-settings', createDefaultSettings);
  const hydrated = useState<boolean>('aeonfront-settings-hydrated', () => false);
  const applyClasses = () => {
    if (!import.meta.client) return;
    document.documentElement.classList.toggle('reduce-motion', settings.value.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', settings.value.highContrast);
    document.documentElement.dataset.motion = settings.value.reducedMotion ? 'reduced' : settings.value.animationSpeed;
    document.documentElement.dataset.effects = settings.value.effectsQuality;
  };
  const hydrate = () => {
    if (!import.meta.client || hydrated.value) return;
    hydrated.value = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) settings.value = mergeAppSettings(JSON.parse(stored), settings.value);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    applyClasses();
  };
  const save = () => {
    if (!import.meta.client) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    applyClasses();
  };
  const reset = () => { settings.value = createDefaultSettings(); save(); };
  if (import.meta.client) hydrate();
  return { settings, save, reset };
}
