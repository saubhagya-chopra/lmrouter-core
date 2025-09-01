// getAuth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HTTPException } from "hono/http-exception";


const MODULE_UNDER_TEST = "../../src/utils/auth"; 

const betterAuthMock = vi.fn((opts: any) => ({
  __opts: opts,
  tag: "auth-inst",
}));
const drizzleAdapterMock = vi.fn(() => "drizzle-adapter");
const stripePluginMock = vi.fn(() => ({ name: "stripe-plugin" }));

// Local util mocks
const getConfigMock = vi.fn();
const getDbInsertValuesSpy = vi.fn().mockResolvedValue(undefined);
const getDbInsertSpy = vi.fn(() => ({ values: getDbInsertValuesSpy }));
const getDbMock = vi.fn(() => ({ insert: getDbInsertSpy }));
const getStripeMock = vi.fn(() => ({
  stripe: { tag: "stripe-client" },
  billingConfig: { stripe: { webhook_secret: "whsec_test_123" } },
}));
const handleStripeWebhookMock = vi.fn();
const balanceTableMock = { __table: "balance" };

// External libs
vi.mock("better-auth", () => ({ betterAuth: betterAuthMock, type: {} }));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: drizzleAdapterMock,
}));
vi.mock("@better-auth/stripe", () => ({ stripe: stripePluginMock }));

// Your updated internal paths
vi.mock("../../src/utils/config.js", () => ({ getConfig: getConfigMock }));
vi.mock("../../src/utils/database.js", () => ({ getDb: getDbMock }));
vi.mock("../../src/utils/stripe.js", () => ({ getStripe: getStripeMock }));
vi.mock("../../src/utils/billing.js", () => ({
  handleStripeWebhook: handleStripeWebhookMock,
}));
vi.mock("../../src/models/billing.js", () => ({ balance: balanceTableMock }));

async function importFresh() {
  vi.resetModules();
  // Re-apply mocks after reset
  vi.doMock("better-auth", () => ({ betterAuth: betterAuthMock }));
  vi.doMock("better-auth/adapters/drizzle", () => ({
    drizzleAdapter: drizzleAdapterMock,
  }));
  vi.doMock("@better-auth/stripe", () => ({ stripe: stripePluginMock }));

  vi.doMock("../../src/utils/config.js", () => ({ getConfig: getConfigMock }));
  vi.doMock("../../src/utils/database.js", () => ({ getDb: getDbMock }));
  vi.doMock("../../src/utils/stripe.js", () => ({ getStripe: getStripeMock }));
  vi.doMock("../../src/utils/billing.js", () => ({
    handleStripeWebhook: handleStripeWebhookMock,
  }));
  vi.doMock("../../src/models/billing.js", () => ({
    balance: balanceTableMock,
  }));

  return await import(MODULE_UNDER_TEST);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAuth", () => {
  it("throws 400 when auth is disabled", async () => {
    const { getAuth } = await importFresh();

    getConfigMock.mockReturnValueOnce({
      auth: { enabled: false },
    });

    try {
      getAuth({} as any);
      throw new Error("Expected to throw");
    } catch (e: any) {
      expect(e).toBeInstanceOf(HTTPException);
      expect(e.status).toBe(400);
      expect(e.message).toBe("Auth is not enabled");
    }

    expect(betterAuthMock).not.toHaveBeenCalled();
  });

  it("initializes better-auth with expected options", async () => {
    const { getAuth } = await importFresh();

    const ctx = { foo: "bar" } as any;
    getConfigMock.mockReturnValueOnce({
      auth: {
        enabled: true,
        better_auth: {
          url: "https://example.com",
          trusted_origins: ["https://app.example.com"],
          secret: "super-secret",
          telemetry: true,
        },
      },
    });

    const instance = getAuth(ctx);

    expect(betterAuthMock).toHaveBeenCalledTimes(1);
    const passed = betterAuthMock.mock.calls[0][0];

    expect(passed.baseURL).toBe("https://example.com");
    expect(passed.basePath).toBe("/v1/auth");
    expect(passed.trustedOrigins).toEqual(["https://app.example.com"]);
    expect(passed.secret).toBe("super-secret");
    expect(passed.telemetry).toEqual({ enabled: true });

    expect(drizzleAdapterMock).toHaveBeenCalledTimes(1);
    expect(getDbMock).toHaveBeenCalledWith(ctx);
    expect(drizzleAdapterMock.mock.calls[0][0]).toBe(
      getDbMock.mock.results[0].value,
    );
    expect(drizzleAdapterMock.mock.calls[0][1]).toEqual({ provider: "pg" });

    expect(passed.emailAndPassword).toEqual({ enabled: true });

    expect(getStripeMock).toHaveBeenCalledWith(ctx);
    expect(stripePluginMock).toHaveBeenCalledTimes(1);
    expect(stripePluginMock.mock.calls[0][0]).toMatchObject({
      stripeClient: { tag: "stripe-client" },
      stripeWebhookSecret: "whsec_test_123",
      createCustomerOnSignUp: true,
      onEvent: handleStripeWebhookMock,
    });

    expect(instance).toEqual({ __opts: passed, tag: "auth-inst" });
  });

  it("runs database user.create.after hook to insert initial balance", async () => {
    const { getAuth } = await importFresh();

    getConfigMock.mockReturnValueOnce({
      auth: {
        enabled: true,
        better_auth: {
          url: "http://localhost",
          trusted_origins: [],
          secret: "s",
          telemetry: false,
        },
      },
    });

    const inst = getAuth({} as any);
    const opts = (inst as any).__opts;

    expect(opts.databaseHooks?.user?.create?.after).toBeTypeOf("function");

    await opts.databaseHooks.user.create.after({ id: "user-123" });

    expect(getDbInsertSpy).toHaveBeenCalledWith(balanceTableMock);
    expect(getDbInsertValuesSpy).toHaveBeenCalledWith({
      ownerType: "user",
      ownerId: "user-123",
    });
  });

  it("caches the auth instance across calls", async () => {
    const { getAuth } = await importFresh();

    getConfigMock.mockReturnValue({
      auth: {
        enabled: true,
        better_auth: {
          url: "http://localhost",
          trusted_origins: [],
          secret: "s",
          telemetry: false,
        },
      },
    });

    const c1 = {} as any;
    const c2 = { other: true } as any;

    const a1 = getAuth(c1);
    const a2 = getAuth(c2);

    expect(a1).toBe(a2);
    expect(betterAuthMock).toHaveBeenCalledTimes(1);
    expect(getConfigMock).toHaveBeenCalledTimes(1);
    expect(getDbMock).toHaveBeenCalledTimes(1);
    expect(getStripeMock).toHaveBeenCalledTimes(1);
  });

  it("passes Context to getConfig/getDb/getStripe", async () => {
    const { getAuth } = await importFresh();

    getConfigMock.mockReturnValueOnce({
      auth: {
        enabled: true,
        better_auth: {
          url: "https://x",
          trusted_origins: [],
          secret: "s",
          telemetry: false,
        },
      },
    });

    const ctx = { ctxId: 42 } as any;
    getAuth(ctx);

    expect(getConfigMock).toHaveBeenCalledWith(ctx);
    expect(getDbMock).toHaveBeenCalledWith(ctx);
    expect(getStripeMock).toHaveBeenCalledWith(ctx);
  });
});
