import { vi } from "vitest";

if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = vi.fn();
}
