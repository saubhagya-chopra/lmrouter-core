// tests/responses-store.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  Response,
  ResponseCreateParamsBase,
} from "openai/resources/responses/responses";

import {
  ResponsesStore,
  ResponsesStoreFactory,
} from "../../src/utils/responses-store"; // adjust path

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

import { getConfig } from "../../src/utils/config";
import { Redis } from "@upstash/redis";

// Dummy Response object
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

  it("set() stores request, response, and builds fullContext with string input", async () => {
    const req: ResponseCreateParamsBase = { input: "hello" } as any;
    const res = makeResponse("r1");

    await store.set(req, res);

    expect(store.items[0].fullContext).toEqual([
      { type: "message", role: "user", content: "hello" },
      ...res.output,
    ]);
  });

  it("set() stores request, response, and builds fullContext with array input", async () => {
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

  it("set() includes previous fullContext if previous_response_id exists", async () => {
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

  it("hydrateRequest merges context from previous when available", async () => {
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

describe("InMemoryResponsesStore", () => {
  it("stores and retrieves by response.id", async () => {
    const { InMemoryResponsesStore } = await import(
      "../../src/utils/responses-store"
    );

    const store = new InMemoryResponsesStore();
    const res = makeResponse("x1");
    await store.set({ input: "q" } as any, res);

    const item = await store.get("x1");
    expect(item?.response.id).toBe("x1");
  });
});

describe("UpstashRedisResponsesStore", () => {
  it("calls redis.get and redis.set", async () => {
    const { UpstashRedisResponsesStore } = await import(
      "../../src/utils/responses-store"
    );

    const redisInstance = (Redis as any).mock.instances[0];
    redisInstance.get.mockResolvedValue({ foo: "bar" });

    const store = new UpstashRedisResponsesStore("url", "token");

    await store.set({ input: "a" } as any, makeResponse("id1"));
    expect(redisInstance.set).toHaveBeenCalledWith("id1", expect.any(Object));

    const out = await store.get("id1");
    expect(out).toEqual({ foo: "bar" });
  });
});

describe("ResponsesStoreFactory", () => {
  beforeEach(() => {
    (ResponsesStoreFactory as any).storeCache = null;
  });

  it("returns InMemoryResponsesStore if config type = in_memory", () => {
    vi.mocked(getConfig).mockReturnValue({
      responses_store: { type: "in_memory" },
    } as any);

    const store = ResponsesStoreFactory.getStore({} as any);
    expect(store.constructor.name).toBe("InMemoryResponsesStore");
  });

  it("returns UpstashRedisResponsesStore if config type = upstash_redis", () => {
    vi.mocked(getConfig).mockReturnValue({
      responses_store: { type: "upstash_redis", url: "u", token: "t" },
    } as any);

    const store = ResponsesStoreFactory.getStore({} as any);
    expect(store.constructor.name).toBe("UpstashRedisResponsesStore");
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
