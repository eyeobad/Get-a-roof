"use client";

import { motion } from "framer-motion";
import { useMotionScheme, type MotionScheme } from "@/lib/motion";

type AnimatedIconProps = {
  name: string;
  active?: boolean;
  scheme?: MotionScheme;
  interactive?: boolean;
  className?: string;
};

export default function AnimatedIcon({
  name,
  active = false,
  scheme,
  interactive = true,
  className = "",
}: AnimatedIconProps) {
  const { effects } = useMotionScheme(scheme ?? "standard");

  return (
    <motion.span
      className={`material-symbols-outlined text-3xl ${className}`}
      whileTap={interactive ? { scale: effects.tap.scale } : undefined}
      transition={interactive ? effects.tap.transition : undefined}
      style={{
        fontVariationSettings: active
          ? "'FILL' 1, 'wght' 600, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'opsz' 24",
      }}
      aria-hidden="true"
    >
      {name}
    </motion.span>
  );
}
