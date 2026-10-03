import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SimpleBehaviorSubject, useBehaviorSubject } from "./index.js";

describe("SimpleBehaviorSubject", () => {
  it("returns the initial value", () => {
    const subject = new SimpleBehaviorSubject(1);
    expect(subject.getValue()).toBe(1);
  });

  it("updates the value on next", () => {
    const subject = new SimpleBehaviorSubject(1);
    subject.next(2);
    expect(subject.getValue()).toBe(2);
  });

  it("emits the current value to a new subscriber immediately", () => {
    const subject = new SimpleBehaviorSubject("a");
    subject.next("b");
    const listener = vi.fn();

    subject.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("b");
  });

  it("notifies every subscriber on next", () => {
    const subject = new SimpleBehaviorSubject(0);
    const first = vi.fn();
    const second = vi.fn();
    subject.subscribe(first);
    subject.subscribe(second);

    subject.next(5);

    expect(first).toHaveBeenLastCalledWith(5);
    expect(second).toHaveBeenLastCalledWith(5);
  });

  it("stops notifying after unsubscribe", () => {
    const subject = new SimpleBehaviorSubject(0);
    const listener = vi.fn();
    const subscription = subject.subscribe(listener);
    listener.mockClear();

    subscription.unsubscribe();
    subject.next(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("only removes the unsubscribed listener", () => {
    const subject = new SimpleBehaviorSubject(0);
    const kept = vi.fn();
    const removed = vi.fn();
    subject.subscribe(kept);
    subject.subscribe(removed).unsubscribe();

    subject.next(1);

    expect(kept).toHaveBeenLastCalledWith(1);
    expect(removed).not.toHaveBeenCalledWith(1);
  });
});

describe("useBehaviorSubject", () => {
  it("returns the subject's current value", () => {
    const subject = new SimpleBehaviorSubject(42);
    const { result } = renderHook(() => useBehaviorSubject(subject));
    expect(result.current).toBe(42);
  });

  it("re-renders when the subject emits", () => {
    const subject = new SimpleBehaviorSubject(0);
    const { result } = renderHook(() => useBehaviorSubject(subject));

    act(() => subject.next(1));
    expect(result.current).toBe(1);

    act(() => subject.next(2));
    expect(result.current).toBe(2);
  });

  it("does not re-render when the same value is emitted", () => {
    const subject = new SimpleBehaviorSubject(0);
    let renders = 0;
    renderHook(() => {
      renders++;
      return useBehaviorSubject(subject);
    });
    const initialRenders = renders;

    act(() => subject.next(0));

    expect(renders).toBe(initialRenders);
  });

  it("keeps multiple components in sync", () => {
    const subject = new SimpleBehaviorSubject("hello");
    function Label({ testId }: { testId: string }) {
      return <span data-testid={testId}>{useBehaviorSubject(subject)}</span>;
    }
    render(
      <>
        <Label testId="a" />
        <Label testId="b" />
      </>
    );

    act(() => subject.next("world"));

    expect(screen.getByTestId("a").textContent).toBe("world");
    expect(screen.getByTestId("b").textContent).toBe("world");
  });

  it("unsubscribes on unmount", () => {
    const subject = new SimpleBehaviorSubject(0);
    const unsubscribe = vi.fn();
    const subscribe = vi.spyOn(subject, "subscribe");
    subscribe.mockImplementation((listener) => {
      listener(subject.getValue());
      return { unsubscribe };
    });

    const { unmount } = renderHook(() => useBehaviorSubject(subject));
    expect(subscribe).toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("resubscribes when the subject changes", () => {
    const first = new SimpleBehaviorSubject("first");
    const second = new SimpleBehaviorSubject("second");
    const { result, rerender } = renderHook(({ subject }) => useBehaviorSubject(subject), {
      initialProps: { subject: first },
    });
    expect(result.current).toBe("first");

    rerender({ subject: second });
    expect(result.current).toBe("second");

    act(() => first.next("stale"));
    expect(result.current).toBe("second");

    act(() => second.next("updated"));
    expect(result.current).toBe("updated");
  });
});
