import { MOTION_PRESETS, speedMultiplier, type MotionPresetName } from '~/animations/presets';

export function useMotionSettings() {
  const { settings } = useSettings();
  const scale = computed(() => speedMultiplier(settings.value.animationSpeed, settings.value.reducedMotion));
  const duration = (preset: MotionPresetName) => Math.round(MOTION_PRESETS[preset].duration * scale.value);
  const animate = async (element: Element | null, presetName: MotionPresetName) => {
    if (!element || !('animate' in element)) return;
    const preset = MOTION_PRESETS[presetName];
    const actualDuration = duration(presetName);
    if (actualDuration <= 0) return;
    await element.animate(preset.keyframes, { duration: actualDuration, easing: preset.easing, fill: 'both' }).finished.catch(() => undefined);
  };
  return { settings, scale, duration, animate };
}
