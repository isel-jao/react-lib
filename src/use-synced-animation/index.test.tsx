import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncedAnimation } from "./index.js";

// jsdom implements neither the Web Animations API nor document.timeline, so both are stubbed:
// the tests cover which animations the hook picks, not that browsers keep them in phase.
const documentTimeline = {} as AnimationTimeline;

interface FakeAnimationInit {
  iterations?: number;
  playState?: AnimationPlayState;
  timeline?: AnimationTimeline | null;
}

function fakeAnimation({
  iterations = Infinity,
  playState = "running",
  timeline = documentTimeline,
}: FakeAnimationInit = {}) {
  return {
    playState,
    timeline,
    startTime: 1234 as CSSNumberish | null,
    effect: { getTiming: () => ({ iterations }) },
  };
}

type FakeAnimation = ReturnType<typeof fakeAnimation>;

function stubGetAnimations(animations: FakeAnimation[]) {
  const getAnimations = vi.fn(() => animations as unknown as Animation[]);
  Element.prototype.getAnimations = getAnimations;
  return getAnimations;
}

function Box(props: Parameters<typeof useSyncedAnimation>[0]) {
  const ref = useSyncedAnimation<HTMLDivElement>(props);
  return <div ref={ref} />;
}

beforeEach(() => {
  Object.defineProperty(document, "timeline", { value: documentTimeline, configurable: true });
});

afterEach(() => {
  // Restore jsdom's original state, where neither exists.
  Reflect.deleteProperty(Element.prototype, "getAnimations");
  Reflect.deleteProperty(document, "timeline");
});

describe("useSyncedAnimation", () => {
  it("does nothing when getAnimations is unavailable", () => {
    expect(() => render(<Box />)).not.toThrow();
  });

  it("syncs infinite animations by default", () => {
    const animation = fakeAnimation();
    stubGetAnimations([animation]);

    render(<Box />);

    expect(animation.startTime).toBe(0);
  });

  it("skips finite animations by default", () => {
    const animation = fakeAnimation({ iterations: 1 });
    stubGetAnimations([animation]);

    render(<Box />);

    expect(animation.startTime).toBe(1234);
  });

  it("syncs only finite animations with iterationType finite", () => {
    const finite = fakeAnimation({ iterations: 3 });
    const infinite = fakeAnimation();
    stubGetAnimations([finite, infinite]);

    render(<Box iterationType="finite" />);

    expect(finite.startTime).toBe(0);
    expect(infinite.startTime).toBe(1234);
  });

  it("syncs every animation with iterationType both", () => {
    const finite = fakeAnimation({ iterations: 3 });
    const infinite = fakeAnimation();
    stubGetAnimations([finite, infinite]);

    render(<Box iterationType="both" />);

    expect(finite.startTime).toBe(0);
    expect(infinite.startTime).toBe(0);
  });

  it("skips paused animations", () => {
    const animation = fakeAnimation({ playState: "paused" });
    stubGetAnimations([animation]);

    render(<Box />);

    expect(animation.startTime).toBe(1234);
  });

  it("skips animations on other timelines", () => {
    const animation = fakeAnimation({ timeline: {} as AnimationTimeline });
    stubGetAnimations([animation]);

    render(<Box />);

    expect(animation.startTime).toBe(1234);
  });

  it("passes the subtree option to getAnimations", () => {
    const getAnimations = stubGetAnimations([]);

    const { rerender } = render(<Box />);
    expect(getAnimations).toHaveBeenLastCalledWith({ subtree: false });

    rerender(<Box subtree />);
    expect(getAnimations).toHaveBeenLastCalledWith({ subtree: true });
  });
});
