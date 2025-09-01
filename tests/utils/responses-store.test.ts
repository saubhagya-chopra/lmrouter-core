// tests/utils/responses-store.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  Response,
  ResponseCreateParamsBase,
} from "openai/resources/responses/responses";

import {
  ResponsesStore,
  ResponsesStoreFactory,
} from "../../src/utils/responses-store";
import { getConfig } from "../../src/utils/config";
import { Redis } from "@upstash/redis";

// --- mocks ---
vi.mock("../../src/utils/config.js", () => ({
  getConfig: vi.fn(),
}));

vi.mock("@upstash/redis", () => {
  return {
    Redis: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
    })),
  };
});

// Helper to make a dummy response
const makeResponse = (id: string, outputContent = "hi"): Response =>
  ({
    id,
    output: [{ type: "message", role: "assistant", content: outputContent }],
  }) as any;

describe("ResponsesStore base class", () => {
  class TestStore extends ResponsesStore {
    public items: any[] = [];
    async get(): Promise<any> {
      return null;
    }
    protected async setItem(item: any): Promise<void> {
      this.items.push(item);
    }
  }

  let store: TestStore;

  beforeEach(() => {
    store = new TestStore();
  });

  it("set() builds fullContext with string input", async () => {
    const req: ResponseCreateParamsBase = { input: "hello" } as any;
    const res = makeResponse("r1");

    await store.set(req, res);

    expect(store.items[0].fullContext).toEqual([
      { type: "message", role: "user", content: "hello" },
      ...res.output,
    ]);
  });

  it("set() builds fullContext with array input", async () => {
    const req: ResponseCreateParamsBase = {
      input: [{ type: "message", role: "user", content: "part1" }],
    } as any;
    const res = makeResponse("r2");

    await store.set(req, res);

    expect(store.items[0].fullContext).toEqual([
      { type: "message", role: "user", content: "part1" },
      ...res.output,
    ]);
  });

  it("set() includes previous fullContext when previous_response_id exists", async () => {
    const prev = {
      request: {} as any,
      response: makeResponse("prev"),
      fullContext: [{ type: "message", role: "user", content: "old" }],
    };
    vi.spyOn(store, "get").mockResolvedValue(prev);

    const req: ResponseCreateParamsBase = {
      input: "new",
      previous_response_id: "prev",
    } as any;

    const res = makeResponse("r3");

    await store.set(req, res);

    expect(store.items[0].fullContext).toEqual([
      ...prev.fullContext,
      { type: "message", role: "user", content: "new" },
      ...res.output,
    ]);
  });

  it("hydrateRequest returns unchanged request if no previous_response_id", async () => {
    const req: ResponseCreateParamsBase = { input: "test" } as any;
    const hydrated = await store.hydrateRequest(req);
    expect(hydrated).toBe(req);
  });

  it("hydrateRequest merges context from previous", async () => {
    const prevItem = {
      fullContext: [{ type: "message", role: "assistant", content: "old" }],
    };
    vi.spyOn(store, "get").mockResolvedValue(prevItem as any);

    const req: ResponseCreateParamsBase = {
      input: "new",
      previous_response_id: "p1",
    } as any;

    const hydrated = await store.hydrateRequest(req);
    expect(hydrated.input).toContainEqual(prevItem.fullContext[0]);
    expect(hydrated.input).toContainEqual({
      type: "message",
      role: "user",
      content: "new",
    });
  });
});

describe("ResponsesStoreFactory", () => {
  beforeEach(() => {
    (ResponsesStoreFactory as any).storeCache = null;
    vi.clearAllMocks();
  });

  it("creates an in-memory store and stores/gets values", async () => {
    vi.mocked(getConfig).mockReturnValue({
      responses_store: { type: "in_memory" },
    } as any);

    const store = ResponsesStoreFactory.getStore({} as any);
    expect(store.constructor.name).toBe("InMemoryResponsesStore");

    const res = makeResponse("x1");
    await store.set({ input: "q" } as any, res);
    const item = await store.get("x1");
    expect(item?.response.id).toBe("x1");
  });

  it("caches the store instance", () => {
    vi.mocked(getConfig).mockReturnValue({
      responses_store: { type: "in_memory" },
    } as any);

    const s1 = ResponsesStoreFactory.getStore({} as any);
    const s2 = ResponsesStoreFactory.getStore({} as any);
    expect(s1).toBe(s2);
  });
});
