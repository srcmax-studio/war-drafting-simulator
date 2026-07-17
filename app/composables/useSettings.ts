export interface AppSettings {
  serverUrl: string;
  playerName: string;
  reducedMotion: boolean;
  highContrast: boolean;
}

const STORAGE_KEY = 'aeonfront_settings_v1';

export function useSettings() {
  const settings = useState<AppSettings>('aeonfront-settings', () => ({
    serverUrl: 'ws://127.0.0.1:3001',
    playerName: '玩家',
    reducedMotion: false,
    highContrast: false
  }));
  const hydrated = useState<boolean>('aeonfront-settings-hydrated', () => false);
  const applyClasses = () => {
    if (!import.meta.client) return;
    document.documentElement.classList.toggle('reduce-motion', settings.value.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', settings.value.highContrast);
  };
  const hydrate = () => {
    if (!import.meta.client || hydrated.value) return;
    hydrated.value = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) settings.value = { ...settings.value, ...(JSON.parse(stored) as Partial<AppSettings>) };
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
  if (import.meta.client) hydrate();
  return { settings, save };
}
