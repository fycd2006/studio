"use client"

import { LazyMotion, domAnimation } from "framer-motion";

/**
 * Provides framer-motion features via lazy loading.
 * Uses domAnimation (smaller bundle) instead of domMax.
 * Wrap this around components that use framer-motion's `m` component.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      {children}
    </LazyMotion>
  );
}
