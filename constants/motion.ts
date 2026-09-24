import { Easing } from 'react-native-reanimated';

/** Calm court-side motion — present, never flashy. */
export const motion = {
  enter: 420,
  enterFast: 280,
  stagger: 50,
  press: 160,
  pulse: 1500,
  kenBurns: 16000,
  spring: { damping: 18, stiffness: 320, mass: 0.7 },
  springSoft: { damping: 16, stiffness: 220, mass: 0.85 },
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.quad),
} as const;
