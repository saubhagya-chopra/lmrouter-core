import { describe, it, expect, vi, beforeEach } from "vitest";
import { HTTPException } from "hono/http-exception";

const MODULE_UNDER_TEST = "../../src/utils/billing.js";

// ---- Mocks (only your internal modules; no external libs) ----
const getConfigMock = vi.fn();
const insertValuesSpy = vi.fn().mockResolvedValue(undefined);
const insertSpy = vi.fn(() => ({ values: insertValuesSpy }));
const updateWhereSpy = vi.fn();
const updateSetSpy = vi.fn(() => ({ where: updateWhereSpy }));
const updateSpy = vi.fn(() => ({ set: updateSetSpy }));
const getDbMock = vi.fn(() => ({
  insert: insertSpy,
  update: updateSpy,
}));
const getRemoteIpMock = vi.fn(() => "1.2.3.4");

const balanceTableMock = { __table: "balance" };
const ledgerTableMock = { __table: "ledger" };

// Spy holder for tests that need to intercept updateBilling calls
const updateBillingSpy = vi.fn();

async function importFresh(patchUpdateBilling = true) {
  vi.resetModules();

  vi.doMock("../../src/utils/config.js", () => ({ getConfig: getConfigMock }));
  vi.doMock("../../src/utils/database.js", () => ({ getDb: getDbMock }));
  vi.doMock("../../src/models/billing.js", () => ({
    balance: balanceTableMock,
    ledger: ledgerTableMock,
  }));
  vi.doMock("../../src/utils/utils.js", () => ({
    getRemoteIp: getRemoteIpMock,
  }));

  const mod = await import(MODULE_UNDER_TEST);

  if (patchUpdateBilling && mod.updateBilling) {
    vi.spyOn(mod, "updateBilling").mockImplementation(updateBillingSpy as any);
  }
  return mod as unknown as {
    calculateCost: (
      usage?: any,
      pricing?: any,
    ) => { toString(): string; toNumber(): number };
    recordApiCall: Function;
    handleStripeWebhook: Function;
    updateBilling: Function;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- calculateCost ----------
describe("calculateCost", () => {
  it("returns 0 when usage or pricing is missing", async () => {
    const { calculateCost } = await importFresh();
    expect(calculateCost().toNumber()).toBe(0);
    expect(calculateCost({}, undefined as any).toNumber()).toBe(0);
    expect(calculateCost(undefined as any, { type: "fixed" }).toNumber()).toBe(
      0,
    );
  });

  it("selects matching tier via json-logic", async () => {
    const { calculateCost } = await importFresh();
    const usage = { service_tier: "pro", request: 1 };
    const pricing = {
      type: "tiered",
      tiers: [
        {
          predicate: { "==": [{ var: "service_tier" }, "basic"] },
          pricing: { type: "fixed", request: 0.02 },
        },
        {
          predicate: { "==": [{ var: "service_tier" }, "pro"] },
          pricing: { type: "fixed", request: 1.5 },
        },
      ],
    };

    const cost = calculateCost(usage, pricing);
    expect(cost.toNumber()).toBeCloseTo(1.5, 10);
  });

  it("falls back to tier with no predicate", async () => {
    const { calculateCost } = await importFresh();
    const usage = { request: 2 };
    const pricing = {
      type: "tiered",
      tiers: [
        { pricing: { type: "fixed", request: 0.25 } }, // default
        {
          predicate: { "==": [{ var: "service_tier" }, "x"] },
          pricing: { type: "fixed", request: 999 },
        },
      ],
    };

    const cost = calculateCost(usage, pricing);
    expect(cost.toNumber()).toBeCloseTo(0.5, 10);
  });

  it("throws on unknown pricing type", async () => {
    const { calculateCost } = await importFresh();
    expect(() => calculateCost({ request: 1 }, { type: "weird" })).toThrow(
      HTTPException,
    );
  });
});

// ---------- recordApiCall ----------
describe("recordApiCall", () => {
  it("early-returns when auth disabled or missing", async () => {
    const { recordApiCall } = await importFresh();

    getConfigMock.mockReturnValueOnce({ auth: { enabled: false } });
    const c1: any = { var: {}, req: { path: "/x", header: () => undefined } };
    await recordApiCall(
      c1,
      "prov",
      200,
      {},
      { request: 1 },
      { type: "fixed", request: 1 },
    );
    expect(updateBillingSpy).not.toHaveBeenCalled();

    getConfigMock.mockReturnValueOnce({ auth: { enabled: true } });
    const c2: any = { var: {}, req: { path: "/y", header: () => undefined } };
    await recordApiCall(
      c2,
      "prov",
      200,
      {},
      { request: 1 },
      { type: "fixed", request: 1 },
    );
    expect(updateBillingSpy).not.toHaveBeenCalled();
  });
});

// ---------- handleStripeWebhook ----------
describe("handleStripeWebhook", () => {
  it("ignores non-checkout events and missing metadata", async () => {
    const { handleStripeWebhook } = await importFresh();

    await handleStripeWebhook({
      type: "invoice.paid",
      data: { object: {} },
    } as any);
    await handleStripeWebhook({
      type: "checkout.session.completed",
      data: { object: { metadata: undefined } },
    } as any);
    await handleStripeWebhook({
      type: "checkout.session.completed",
      data: { object: { metadata: { owner_type: "user", owner_id: "u" } } },
    } as any);

    expect(updateBillingSpy).not.toHaveBeenCalled();
  });
});

// ---------- updateBilling (real) ----------
describe("updateBilling", () => {
  it("inserts ledger row and increments balance", async () => {
    // import real updateBilling (no spying)
    vi.resetModules();
    vi.doMock("../../src/utils/config.js", () => ({
      getConfig: getConfigMock,
    }));
    vi.doMock("../../src/utils/database.js", () => ({ getDb: getDbMock }));
    vi.doMock("../../src/models/billing.js", () => ({
      balance: balanceTableMock,
      ledger: ledgerTableMock,
    }));
    vi.doMock("../../src/utils/utils.js", () => ({
      getRemoteIp: getRemoteIpMock,
    }));

    const { updateBilling } = await import(MODULE_UNDER_TEST);

    const ctx = { ctxId: 1 } as any;
    const amount = new (await import("decimal.js")).Decimal(3.25); // this is part of app deps
    const metadata = { type: "payment", data: { hello: "world" } } as any;

    await updateBilling("user", "u_99", amount, metadata, ctx);

    // ledger insert
    expect(getDbMock).toHaveBeenCalledWith(ctx);
    expect(insertSpy).toHaveBeenCalledWith(ledgerTableMock);
    expect(insertValuesSpy).toHaveBeenCalledWith({
      ownerType: "user",
      ownerId: "u_99",
      amount: "3.25",
      metadata,
    });

    // balance update
    expect(updateSpy).toHaveBeenCalledWith(balanceTableMock);
    expect(updateSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ balance: expect.anything() }),
    );
    expect(updateWhereSpy).toHaveBeenCalledTimes(1);
  });
});
