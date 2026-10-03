import { useEffect, useLayoutEffect, useRef } from "react";

// Animations on the document timeline that share a startTime play in phase, so
// any fixed value works — what matters is that every animation gets the same one.
const ORIGIN = 0;

// useLayoutEffect warns during server rendering in React 18, and there is nothing to sync there.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface Options {
  /** Also sync animations on the element's descendants. Defaults to `false`. */
  subtree?: boolean;
  /**
   * Which animations to sync, by iteration count. Defaults to `"infinite"`.
   * A synced finite animation jumps to where it would be had it started at the shared
   * start time — usually its end — so only opt in to `"finite"` or `"both"` deliberately.
   */
  iterationType?: "infinite" | "finite" | "both";
}

/**
 * Gives the element's animations a shared start time, so they play in phase with every
 * other animation synced by this hook — e.g. spinners that mount at different times stay in step.
 *
 * Only animations already running when the effect runs (on mount, and when an option changes)
 * are synced. Animations that start later — a class toggled on, a child added to the subtree —
 * and an element attached to the ref after mount are not picked up.
 */
export function useSyncedAnimation<T extends Element>(options: Options = {}) {
  const { subtree = false, iterationType = "infinite" } = options;
  const ref = useRef<T>(null);

  useIsomorphicLayoutEffect(() => {
    const root = ref.current;
    // getAnimations is missing in jsdom and older browsers.
    if (!root || typeof root.getAnimations !== "function") return;

    for (const animation of root.getAnimations({ subtree })) {
      // Setting startTime would resume a paused animation.
      if (animation.playState === "paused") continue;
      // On other timelines (e.g. scroll-driven), startTime is not a time in milliseconds.
      if (animation.timeline !== document.timeline) continue;
      const infinite = animation.effect?.getTiming().iterations === Infinity;
      if (iterationType === "infinite" && !infinite) continue;
      if (iterationType === "finite" && infinite) continue;
      animation.startTime = ORIGIN;
    }
  }, [iterationType, subtree]);

  return ref;
}
