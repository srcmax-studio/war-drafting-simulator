export type MotionPresetName = 'page' | 'panel' | 'cardDraw' | 'cardDeploy' | 'cardReveal' | 'cardMove' | 'cardPowerUp' | 'cardPowerDown' | 'cardDeath' | 'cardReturn' | 'frontReveal' | 'frontControl' | 'stake' | 'turn' | 'lock' | 'victory' | 'defeat' | 'draw' | 'withdrawal';

export interface MotionPreset {
  duration: number;
  easing: string;
  keyframes: Keyframe[];
}

export const MOTION_PRESETS: Record<MotionPresetName, MotionPreset> = {
  page: { duration: 260, easing: 'cubic-bezier(.2,.75,.2,1)', keyframes: [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }] },
  panel: { duration: 220, easing: 'cubic-bezier(.2,.75,.2,1)', keyframes: [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'translateX(0)' }] },
  cardDraw: { duration: 360, easing: 'cubic-bezier(.15,.8,.2,1)', keyframes: [{ opacity: 0, transform: 'translate3d(50px,-24px,0) scale(.82)' }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }] },
  cardDeploy: { duration: 420, easing: 'cubic-bezier(.15,.8,.2,1)', keyframes: [{ opacity: .4, transform: 'translate3d(0,34px,0) scale(1.08)' }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }] },
  cardReveal: { duration: 480, easing: 'cubic-bezier(.2,.7,.25,1)', keyframes: [{ opacity: .3, transform: 'rotateY(90deg) scale(.95)' }, { opacity: 1, transform: 'rotateY(0) scale(1)' }] },
  cardMove: { duration: 380, easing: 'cubic-bezier(.2,.75,.2,1)', keyframes: [{ transform: 'translateX(-18px)', opacity: .55 }, { transform: 'translateX(0)', opacity: 1 }] },
  cardPowerUp: { duration: 320, easing: 'ease-out', keyframes: [{ filter: 'brightness(1)', transform: 'scale(1)' }, { filter: 'brightness(1.45)', transform: 'scale(1.05)' }, { filter: 'brightness(1)', transform: 'scale(1)' }] },
  cardPowerDown: { duration: 320, easing: 'ease-out', keyframes: [{ filter: 'saturate(1)', transform: 'translateX(0)' }, { filter: 'saturate(.45)', transform: 'translateX(-3px)' }, { filter: 'saturate(1)', transform: 'translateX(0)' }] },
  cardDeath: { duration: 520, easing: 'cubic-bezier(.5,0,.8,.2)', keyframes: [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'translateY(18px) scale(.78)' }] },
  cardReturn: { duration: 480, easing: 'cubic-bezier(.15,.8,.2,1)', keyframes: [{ opacity: 0, transform: 'translateY(22px) scale(.8)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }] },
  frontReveal: { duration: 760, easing: 'cubic-bezier(.2,.7,.2,1)', keyframes: [{ filter: 'brightness(.45) blur(5px)', opacity: .35 }, { filter: 'brightness(1) blur(0)', opacity: 1 }] },
  frontControl: { duration: 440, easing: 'ease-out', keyframes: [{ boxShadow: 'inset 0 0 0 0 transparent' }, { boxShadow: 'inset 0 0 0 2px currentColor' }, { boxShadow: 'inset 0 0 0 0 transparent' }] },
  stake: { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)', keyframes: [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1.08)' }, { transform: 'scale(1)' }] },
  turn: { duration: 520, easing: 'ease-out', keyframes: [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }] },
  lock: { duration: 280, easing: 'ease-out', keyframes: [{ opacity: .5, transform: 'scale(1.15)' }, { opacity: 1, transform: 'scale(1)' }] },
  victory: { duration: 900, easing: 'ease-out', keyframes: [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }] },
  defeat: { duration: 760, easing: 'ease-out', keyframes: [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'translateY(0)' }] },
  draw: { duration: 680, easing: 'ease-out', keyframes: [{ opacity: 0 }, { opacity: 1 }] },
  withdrawal: { duration: 700, easing: 'ease-out', keyframes: [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-24px)' }] }
};

export const speedMultiplier = (speed: 'normal' | 'fast' | 'instant', reduced: boolean): number => reduced || speed === 'instant' ? 0 : speed === 'fast' ? 0.55 : 1;
