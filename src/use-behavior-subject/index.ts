import { useSyncExternalStore } from "react";

interface Subscription {
  unsubscribe(): void;
}

type Listener<T> = (value: T) => void;

interface BehaviorSubject<T> {
  next(value: T): void;
  subscribe(observer: Listener<T>): Subscription;
  getValue(): T;
}

export function useBehaviorSubject<T>(subject: BehaviorSubject<T>): T {
  return useSyncExternalStore(
    (listener) => {
      const subscription = subject.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => subject.getValue()
  );
}

export class SimpleBehaviorSubject<T> implements BehaviorSubject<T> {
  private value: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  next(value: T): void {
    this.value = value;
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  subscribe(observer: Listener<T>): Subscription {
    this.listeners.add(observer);
    observer(this.value); // Emit the current value immediately
    return {
      unsubscribe: () => {
        this.listeners.delete(observer);
      },
    };
  }

  getValue(): T {
    return this.value;
  }
}
