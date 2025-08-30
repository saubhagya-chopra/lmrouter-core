// utils.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 🔧 Point this at the module you pasted (that exports getUptime, getRemoteIp, getModel, iterateModelProviders)
const MODULE_UNDER_TEST = "../../src/utils/utils";

// ---- Mocks ----
const getConfigMock = vi.fn();
const recordApiCallMock = vi.fn();

// TimeKeeper stub with deterministic behavior
class TKMock {
  record = vi.fn();
  timestamps = vi.fn(() => ({ start: 1, first_token: 2, end: 3 }));
}

// runtime + conninfo
const getRuntimeKeyMock = vi.fn();
const getConnInfoNodeMock = vi.fn();
const getConnInfoWorkerMock = vi.fn();

vi.mock("../../src/utils/config.js", () => ({
  getConfig: getConfigMock,
}));
vi.mock("../../src/utils/billing.js", () => ({
  recordApiCall: recordApiCallMock,
}));
vi.mock("../../src/utils/chrono.js", () => ({
  TimeKeeper: TKMock,
}));

vi.mock("hono/adapter", () => ({
  getRuntimeKey: getRuntimeKeyMock,
}));
vi.mock("@hono/node-server/conninfo", () => ({
  getConnInfo: getConnInfoNodeMock,
}));
vi.mock("hono/cloudflare-workers", () => ({
  getConnInfo: getConnInfoWorkerMock,
}));

async function importFresh() {
  vi.resetModules();
  vi.doMock("../../src/utils/config.js", () => ({ getConfig: getConfigMock }));
  vi.doMock("../../src/utils/billing.js", () => ({
    recordApiCall: recordApiCallMock,
  }));
  vi.doMock("../../src/utils/chrono.js", () => ({ TimeKeeper: TKMock }));
  vi.doMock("hono/adapter", () => ({ getRuntimeKey: getRuntimeKeyMock }));
  vi.doMock("@hono/node-server/conninfo", () => ({
    getConnInfo: getConnInfoNodeMock,
  }));
  vi.doMock("hono/cloudflare-workers", () => ({
    getConnInfo: getConnInfoWorkerMock,
  }));
  return await import(MODULE_UNDER_TEST);
}

const ORIG_UPTIME = process.uptime;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  // restore any patched globals
  (process as any).uptime = ORIG_UPTIME;
});

// Minimal ctx helper
function makeCtx(partial: any = {}) {
  return {
    var: {},
    json: (body: any, status = 200) => ({ body, status }),
    ...partial,
  } as any;
}

describe("getUptime", () => {
  it("formats uptime from process.uptime()", async () => {
    const { getUptime } = await importFresh();
    // Stub uptime to a fixed value: e.g., 1 day + 2 hours + 3 minutes + 4 seconds
    (process as any).uptime = () => 1 * 24 * 3600 + 2 * 3600 + 3 * 60 + 4 + 0.9;
    const s = getUptime();
    expect(s).toBe("1 days, 2 hours, 3 minutes, 4 seconds");
  });
});

describe("getRemoteIp", () => {
  it("returns Node conninfo remote.address", async () => {
    const { getRemoteIp } = await importFresh();
    getRuntimeKeyMock.mockReturnValue("node");
    getConnInfoNodeMock.mockReturnValue({ remote: { address: "10.0.0.1" } });
    const ip = getRemoteIp(makeCtx());
    expect(ip).toBe("10.0.0.1");
  });

  it("returns Worker conninfo remote.address", async () => {
    const { getRemoteIp } = await importFresh();
    getRuntimeKeyMock.mockReturnValue("workerd");
    getConnInfoWorkerMock.mockReturnValue({
      remote: { address: "203.0.113.9" },
    });
    const ip = getRemoteIp(makeCtx());
    expect(ip).toBe("203.0.113.9");
  });

  it("returns undefined for unknown runtime", async () => {
    const { getRemoteIp } = await importFresh();
    getRuntimeKeyMock.mockReturnValue("bunicorn");
    const ip = getRemoteIp(makeCtx());
    expect(ip).toBeUndefined();
  });
});

describe("getModel", () => {
  it("returns model from exact match in cfg.models", async () => {
    const { getModel } = await importFresh();
    getConfigMock.mockReturnValue({
      providers: {},
      models: {
        "gpt-foo": {
          name: "Foo",
          providers: [{ provider: "openai", model: "gpt-foo" }],
        },
      },
    });
    const c = makeCtx({ var: { auth: { type: "better-auth" } } });
    const m = getModel("gpt-foo", c);
    expect(m).toEqual({
      name: "Foo",
      providers: [{ provider: "openai", model: "gpt-foo" }],
    });
  });

  it("when auth is access-key and modelName has provider prefix, returns single provider mapping", async () => {
    const { getModel } = await importFresh();
    getConfigMock.mockReturnValue({
      providers: {
        openai: { type: "openai", api_key: "x" },
      },
      models: {},
    });
    const c = makeCtx({ var: { auth: { type: "access-key" } } });
    const m = getModel("openai:gpt-4o", c);
    expect(m).toEqual({
      providers: [{ provider: "openai", model: "gpt-4o" }],
    });
  });

  it("when auth is byok and wildcard model exists, maps wildcard providers to given modelName", async () => {
    const { getModel } = await importFresh();
    getConfigMock.mockReturnValue({
      providers: {
        anthropic: { type: "anthropic", api_key: "a" },
        openai: { type: "openai", api_key: "o" },
      },
      models: {
        "*": {
          providers: [
            { provider: "openai", model: "*" },
            { provider: "anthropic", model: "*" },
          ],
        },
      },
    });
    const c = makeCtx({ var: { auth: { type: "byok" } } });
    const m = getModel("custom-model", c);
    expect(m).toEqual({
      providers: [
        { provider: "openai", model: "custom-model" },
        { provider: "anthropic", model: "custom-model" },
      ],
    });
  });

  it("returns null when no matches and no wildcard mapping", async () => {
    const { getModel } = await importFresh();
    getConfigMock.mockReturnValue({
      providers: { openai: { type: "openai", api_key: "x" } },
      models: {},
    });
    const c = makeCtx({ var: { auth: { type: "better-auth" } } });
    const m = getModel("does-not-exist", c);
    expect(m).toBeNull();
  });
});

describe("iterateModelProviders", () => {
  it("returns 500 when c.var.model is missing", async () => {
    const { iterateModelProviders } = await importFresh();
    getConfigMock.mockReturnValue({
      server: { logging: "prod" },
      providers: {},
    });

    const c = makeCtx({ var: {} });
    const res = await iterateModelProviders(c, vi.fn());
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { message: "Model is not set" } });
  });

  it("invokes callback with hydrated provider and returns its value (success on first provider)", async () => {
    const { iterateModelProviders } = await importFresh();

    getConfigMock.mockReturnValue({
      server: { logging: "prod" },
      providers: {
        openai: { type: "openai", api_key: "REAL_KEY" },
      },
    });

    const c = makeCtx({
      var: {
        auth: { type: "better-auth" }, // not byok
        model: {
          providers: [
            {
              provider: "openai",
              model: "gpt-4o",
              pricing: { type: "fixed", request: 1 },
            },
          ],
        },
      },
    });

    const cb = vi.fn(async (providerCfg, provider) => {
      expect(providerCfg).toEqual({
        provider: "openai",
        model: "gpt-4o",
        pricing: { type: "fixed", request: 1 },
      });
      expect(provider).toEqual({ type: "openai", api_key: "REAL_KEY" });
      return { ok: true };
    });

    const out = await iterateModelProviders(c, cb);
    expect(out).toEqual({ ok: true });
  });

  it("hydrates api_key from BYOK", async () => {
    const { iterateModelProviders } = await importFresh();

    getConfigMock.mockReturnValue({
      server: { logging: "prod" },
      providers: {
        openai: { type: "openai", api_key: "CONFIG_KEY" },
      },
    });

    const c = makeCtx({
      var: {
        auth: { type: "byok", byok: "USER_KEY" },
        model: { providers: [{ provider: "openai", model: "foo" }] },
      },
    });

    const cb = vi.fn(async (_cfg, provider) => {
      expect(provider.api_key).toBe("USER_KEY"); // replaced
      return { ok: true };
    });

    const out = await iterateModelProviders(c, cb);
    expect(out).toEqual({ ok: true });
  });

  it("skips provider not present in cfg.providers and still falls back to others", async () => {
    const { iterateModelProviders } = await importFresh();

    getConfigMock.mockReturnValue({
      server: { logging: "prod" },
      providers: {
        openai: { type: "openai", api_key: "k" },
      },
    });

    const c = makeCtx({
      var: {
        auth: { type: "better-auth" },
        model: {
          providers: [
            { provider: "missing", model: "x" }, // will be skipped
            { provider: "openai", model: "y" }, // will run
          ],
        },
      },
    });

    const cb = vi.fn(async (cfg, provider) => {
      expect(cfg.provider).toBe("openai");
      expect(provider.type).toBe("openai");
      return { worked: true };
    });

    const out = await iterateModelProviders(c, cb);
    expect(out).toEqual({ worked: true });
  });

  it("on callback error: records api call and continues; aggregates error if all fail", async () => {
    const { iterateModelProviders } = await importFresh();
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});

    getConfigMock.mockReturnValue({
      server: { logging: "dev" },
      providers: {
        openai: { type: "openai", api_key: "k1" },
        anthropic: { type: "anthropic", api_key: "k2" },
      },
    });

    const err = Object.assign(new Error("Boom"), {
      status: 429,
      error: { message: "rate" },
    });

    const c = makeCtx({
      var: {
        auth: { type: "better-auth" },
        model: {
          providers: [
            {
              provider: "openai",
              model: "foo",
              pricing: { type: "fixed", request: 1 },
            },
            {
              provider: "anthropic",
              model: "bar",
              pricing: { type: "fixed", request: 2 },
            },
          ],
        },
      },
    });

    const cb = vi.fn(async () => {
      throw err;
    });

    const res = await iterateModelProviders(c, cb);

    // recorded twice (both providers failed)
    expect(recordApiCallMock).toHaveBeenCalledTimes(2);
    const [
      cArg,
      provArg,
      statusArg,
      timestampsArg,
      usageArg,
      pricingArg,
      errorMsgArg,
    ] = recordApiCallMock.mock.calls[0];
    expect(cArg).toBe(c);
    expect(provArg).toBe("openai");
    expect(statusArg).toBe(429);
    expect(timestampsArg).toEqual({ start: 1, first_token: 2, end: 3 }); // from TKMock
    expect(usageArg).toBeUndefined();
    expect(pricingArg).toEqual({ type: "fixed", request: 1 });
    expect(errorMsgArg).toBe("rate");

    // response is aggregated error
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: { message: "rate" } });

    consoleErr.mockRestore();
  });

  it("returns generic failure when no providers and no error collected", async () => {
    const { iterateModelProviders } = await importFresh();
    getConfigMock.mockReturnValue({
      server: { logging: "prod" },
      providers: {}, // empty -> loop does nothing, error stays null
    });

    const c = makeCtx({
      var: { auth: { type: "better-auth" }, model: { providers: [] } },
    });

    const out = await iterateModelProviders(c, vi.fn());
    expect(out.status).toBe(500);
    expect(out.body).toEqual({
      error: { message: "All providers failed to complete the request" },
    });
  });
});
