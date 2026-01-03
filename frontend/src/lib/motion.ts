"use client";

import type { Transition } from "framer-motion";

const createSpring = (
  stiffness: number,
  damping: number,
  mass = 1,
  velocity = 0
): Transition => ({
  type: "spring",
  stiffness,
  damping,
  mass,
  velocity,
});

const motionSchemes = {
  expressive: {
    effects: {
      tap: {
        scale: 0.94,
        transition: createSpring(520, 36),
      },
    },
    spatial: {
      swipe: {
        transition: createSpring(420, 28),
      },
    },
  },
  standard: {
    effects: {
      tap: {
        scale: 0.96,
        transition: createSpring(360, 28),
      },
    },
    spatial: {
      swipe: {
        transition: createSpring(320, 32),
      },
    },
  },
} as const;

export type MotionScheme = keyof typeof motionSchemes;
export const defaultMotionScheme: MotionScheme = "standard";

export function useMotionScheme(
  scheme: MotionScheme = defaultMotionScheme
) {
  return motionSchemes[scheme];
}
