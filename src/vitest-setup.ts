import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tests import their globals from "vitest" rather than relying on `globals: true`,
// so Testing Library's own auto-cleanup never registers. Do it here instead —
// without it, every render stays mounted in the shared jsdom document and leaks
// into the next test.
afterEach(() => {
  cleanup();
});
