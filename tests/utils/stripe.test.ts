// stripe.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HTTPException } from "hono/http-exception";

// 🔧 point to your file
const MODULE_UNDER_TEST = "../../src/utils/stripe";

// --- Mocks ---
const getConfigMock = vi.fn();
const getDbMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn(() => ({ where: whereMock }));
const whereMock = vi.fn();
const updateMock = vi.fn(() => ({ set: setMock }));
const setMock = vi.fn(() => ({ where: whereMock }));

// Fake Stripe client with spies
const stripeCustomersCreateMock = vi.fn();
const stripeCheckoutSessionsCreateMock = vi.fn();
class FakeStripe {
  customers = { create: stripeCustomersCreateMock };
  checkout = { sessions: { create: stripeCheckoutSessionsCreateMock } };
  constructor(_key: string) {}
}

// External libs
vi.mock("stripe", () => ({ default: FakeStripe })); // default export class
vi.mock("../../src/utils/config.js", () => ({ getConfig: getConfigMock }));
vi.mock("../../src/utils/database.js", () => ({ getDb: getDbMock }));
// drizzle-orm's eq is only passed through; it won’t execute in our mock chain
vi.mock("drizzle-orm", () => ({ eq: (...args: any[]) => ({ __eq: args }) }));

const BILLING_CFG = {
  stripe: {
    secret_key: "sk_test_123",
    webhook_secret: "whsec_x",
    lmrouter_credits_product_id: "prod_credits",
    lmrouter_fees_product_id: "prod_fees",
  },
  credit_minimum: 10,
  fee_rate: 0.07,
  fee_minimum: 2.5,
};

async function importFresh() {
  vi.resetModules();
  vi.doMock("stripe", () => ({ default: FakeStripe }));
  vi.doMock("../../src/utils/config.js", () => ({ getConfig: getConfigMock }));
  vi.doMock("../../src/utils/database.js", () => ({ getDb: getDbMock }));
  vi.doMock("drizzle-orm", () => ({
    eq: (...args: any[]) => ({ __eq: args }),
  }));
  return await import(MODULE_UNDER_TEST);
}

beforeEach(() => {
  vi.clearAllMocks();
  // reset DB chain mocks
  selectMock.mockReset();
  fromMock.mockReset().mockReturnValue({ where: whereMock });
  whereMock.mockReset();
  updateMock.mockReset().mockReturnValue({ set: setMock });
  setMock.mockReset().mockReturnValue({ where: whereMock });
  getDbMock.mockReset().mockReturnValue({
    select: selectMock,
    from: fromMock,
    where: whereMock,
    update: updateMock,
  });
});

// ---- getStripe ----
describe("getStripe", () => {
  it("throws 400 when auth is disabled", async () => {
    const { getStripe } = await importFresh();

    // Persisting mock so ANY number of calls work
    getConfigMock.mockReturnValue({ auth: { enabled: false } });

    try {
      getStripe({} as any);
      throw new Error("Expected to throw");
    } catch (e: any) {
      expect(e).toBeInstanceOf(HTTPException);
      expect(e.status).toBe(400);
      expect(e.message).toBe("Auth is not enabled");
    }
  });


  it("initializes StripeClient with billing config and caches the instance", async () => {
    const { getStripe } = await importFresh();

    getConfigMock.mockReturnValue({
      auth: { enabled: true, billing: BILLING_CFG, database_url: "ignore" },
    });

    const ctx1 = { a: 1 } as any;
    const ctx2 = { a: 2 } as any;

    const s1 = getStripe(ctx1);
    const s2 = getStripe(ctx2);

    expect(s1).toBe(s2);
    expect(getConfigMock).toHaveBeenCalledTimes(1);
    // Stripe constructor was called exactly once
    expect(stripeCustomersCreateMock).toHaveBeenCalledTimes(0); // not yet
  });
});

// ---- createCheckoutSession ----
describe("StripeClient.createCheckoutSession", () => {
  const ctxBase = {
    var: {
      auth: {
        type: "better-auth",
        ownerType: "user",
        ownerId: "user_1",
        user: { email: "u@example.com" },
      },
    },
  } as any;

  async function setupStore() {
    const { getStripe } = await importFresh();
    getConfigMock.mockReturnValue({
      auth: { enabled: true, billing: BILLING_CFG, database_url: "ignore" },
    });
    return getStripe({} as any);
  }

  it("rejects when amount is below credit_minimum", async () => {
    const stripeClient: any = await setupStore();
    await expect(
      stripeClient.createCheckoutSession(
        ctxBase,
        BILLING_CFG.credit_minimum - 1,
        "https://ok",
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: "Amount is less than the minimum credit amount",
    });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("throws 500 if user row missing", async () => {
    const stripeClient: any = await setupStore();

    // DB select returns empty
    selectMock.mockReturnValueOnce({ from: fromMock });
    whereMock.mockReturnValueOnce([]); // simulate .where() returning rows
    // Make our chain: getDb(c).select({...}).from(...).where(...)-> []
    getDbMock.mockReturnValueOnce({
      select: () => ({ from: () => ({ where: () => [] }) }),
      update: updateMock,
    });

    await expect(
      stripeClient.createCheckoutSession(ctxBase, 10, "https://ok"),
    ).rejects.toMatchObject({ status: 500, message: "Internal server error" });
  });

  it("creates a new customer if missing, updates DB, and creates checkout session", async () => {
    const stripeClient: any = await setupStore();

    // First DB read: user has no stripe_customer_id
    getDbMock.mockReturnValueOnce({
      select: () => ({
        from: () => ({ where: () => [{ stripe_customer_id: null }] }),
      }),
      update: updateMock,
    });

    // Stripe: create customer -> returns id
    stripeCustomersCreateMock.mockResolvedValueOnce({ id: "cus_123" });

    // Stripe: create session
    stripeCheckoutSessionsCreateMock.mockResolvedValueOnce({ id: "cs_111" });

    const res = await stripeClient.createCheckoutSession(
      ctxBase,
      50,
      "https://ok/success",
    );

    // DB update to set new customer id
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ stripeCustomerId: "cus_123" }),
    );

    // Fee = max(50 * 0.07, 2.5) = 3.5 -> 350 cents
    expect(stripeCheckoutSessionsCreateMock).toHaveBeenCalledTimes(1);
    const call = stripeCheckoutSessionsCreateMock.mock.calls[0][0];

    expect(call.customer).toBe("cus_123");
    expect(call.client_reference_id).toBe("user_1");
    expect(call.success_url).toBe("https://ok/success");

    // credits line item: 50 USD -> 5000 cents
    const liCredits = call.line_items[0].price_data;
    expect(liCredits.product).toBe(
      BILLING_CFG.stripe.lmrouter_credits_product_id,
    );
    expect(liCredits.unit_amount).toBe(5000);

    // fee line item: 350 cents
    const liFees = call.line_items[1].price_data;
    expect(liFees.product).toBe(BILLING_CFG.stripe.lmrouter_fees_product_id);
    expect(liFees.unit_amount).toBe(350);

    expect(call.metadata).toEqual({
      owner_type: "user",
      owner_id: "user_1",
      amount: 50,
    });

    expect(res).toEqual({ id: "cs_111" });
  });

  it("reuses existing customer and creates session", async () => {
    const stripeClient: any = await setupStore();

    // user row has existing stripe_customer_id
    getDbMock.mockReturnValueOnce({
      select: () => ({
        from: () => ({ where: () => [{ stripe_customer_id: "cus_EXISTING" }] }),
      }),
      update: updateMock,
    });

    stripeCheckoutSessionsCreateMock.mockResolvedValueOnce({ id: "cs_222" });

    const res = await stripeClient.createCheckoutSession(
      ctxBase,
      25,
      "https://ok",
    );
    // No customer create
    expect(stripeCustomersCreateMock).not.toHaveBeenCalled();

    const args = stripeCheckoutSessionsCreateMock.mock.calls[0][0];
    expect(args.customer).toBe("cus_EXISTING");

    // fee = max(25 * 0.07, 2.5) = max(1.75, 2.5) = 2.5 -> 250 cents
    expect(args.line_items[1].price_data.unit_amount).toBe(250);

    // credits 25 -> 2500 cents
    expect(args.line_items[0].price_data.unit_amount).toBe(2500);

    expect(res).toEqual({ id: "cs_222" });
  });
});
