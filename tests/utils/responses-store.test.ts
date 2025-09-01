// responses-store.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const MODULE_UNDER_TEST = "../../src/utils/responses-store";

async function importFresh() {
  vi.resetModules();
  return await import(MODULE_UNDER_TEST);
}

beforeEach(() => {
  vi.useRealTimers();
});


const msg = (role: "user" | "assistant", content: string) => ({
  type: "message",
  role,
  content,
});

const makeResponse = (id: string, outputs: any[] = []) =>
  ({ id, output: outputs }) as any;

describe("ResponsesStore / InMemory via ResponsesStoreFactory", () => {
  it("getStore() returns a singleton", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const s1 = ResponsesStoreFactory.getStore();
    const s2 = ResponsesStoreFactory.getStore();
    expect(s1).toBe(s2);
  });

  it("get() returns null for unknown id", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const store = ResponsesStoreFactory.getStore();
    const item = await store.get("nope");
    expect(item).toBeNull();
  });

  it("set() stores item and builds fullContext when request.input is string", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const store = ResponsesStoreFactory.getStore();

    const req: any = { input: "Hello" };
    const res = makeResponse("r1", [msg("assistant", "Hi!")]);

    await store.set(req, res);

    const saved = await store.get("r1");
    expect(saved).not.toBeNull();
    expect(saved!.request).toBe(req);
    expect(saved!.response).toBe(res);
    expect(saved!.fullContext).toEqual([
      msg("user", "Hello"),
      msg("assistant", "Hi!"),
    ]);
  });

  it("set() appends array input as-is and response output", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const store = ResponsesStoreFactory.getStore();

    const req: any = { input: [msg("user", "A"), msg("user", "B")] };
    const res = makeResponse("r2", [msg("assistant", "C")]);

    await store.set(req, res);

    const saved = await store.get("r2");
    expect(saved!.fullContext).toEqual([
      msg("user", "A"),
      msg("user", "B"),
      msg("assistant", "C"),
    ]);
  });

  it("set() with previous_response_id chains prior fullContext before new input/output", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const store = ResponsesStoreFactory.getStore();

    // First turn
    const req1: any = { input: "First" };
    const res1 = makeResponse("rA", [msg("assistant", "First-Reply")]);
    await store.set(req1, res1);

    // Second turn, chains from rA
    const req2: any = { previous_response_id: "rA", input: "Second" };
    const res2 = makeResponse("rB", [msg("assistant", "Second-Reply")]);
    await store.set(req2, res2);

    const saved2 = await store.get("rB");
    expect(saved2!.fullContext).toEqual([
      // prior fullContext from rA:
      msg("user", "First"),
      msg("assistant", "First-Reply"),
      // new input:
      msg("user", "Second"),
      // new output:
      msg("assistant", "Second-Reply"),
    ]);
  });

  it("hydrateRequest() returns request unchanged if no previous_response_id", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const store = ResponsesStoreFactory.getStore();

    const req: any = { input: "X" };
    const hydrated = await store.hydrateRequest(req);
    expect(hydrated).toBe(req); // same reference OK since method returns input
  });

  it("hydrateRequest() leaves request unchanged if previous id not found", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const store = ResponsesStoreFactory.getStore();

    const req: any = { previous_response_id: "missing", input: "Y" };
    const hydrated = await store.hydrateRequest(req);

    // Should return the same request unchanged
    expect(hydrated).toEqual(req);
    // Input should still be a string
    expect(typeof hydrated.input).toBe("string");
    expect(hydrated.input).toBe("Y");
  });


  it("hydrateRequest() builds input array from previous fullContext + current string input", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const store = ResponsesStoreFactory.getStore();

    // seed previous
    const req1: any = { input: "Seed" };
    const res1 = makeResponse("seed", [msg("assistant", "Ack")]);
    await store.set(req1, res1);

    // now hydrate a follow-up
    const req2: any = { previous_response_id: "seed", input: "Follow-up" };
    const hydrated = await store.hydrateRequest(req2);

    expect(Array.isArray(hydrated.input)).toBe(true);
    expect(hydrated.input).toEqual([
      msg("user", "Seed"),
      msg("assistant", "Ack"),
      msg("user", "Follow-up"),
    ]);
  });

  it("hydrateRequest() appends array input to previous fullContext", async () => {
    const { ResponsesStoreFactory } = await importFresh();
    const store = ResponsesStoreFactory.getStore();

    // seed previous
    const req1: any = { input: [msg("user", "M1")] };
    const res1 = makeResponse("seed2", [msg("assistant", "N1")]);
    await store.set(req1, res1);

    const req2: any = {
      previous_response_id: "seed2",
      input: [msg("user", "M2"), msg("user", "M3")],
    };
    const hydrated = await store.hydrateRequest(req2);

    expect(hydrated.input).toEqual([
      msg("user", "M1"),
      msg("assistant", "N1"),
      msg("user", "M2"),
      msg("user", "M3"),
    ]);
  });
});
