import { describe, it, expect, vi, beforeEach } from "vitest";

const MODULE_UNDER_TEST = "../../src/utils/database";

// --- Mocks ---
const drizzleMock = vi.fn(() => ({ __db: true, tag: "neon-drizzle" }));
const getConfigMock = vi.fn();

// fake schema objects to verify merging
const authSchemaMock = {
  users: { __table: "users" },
  sessions: { __table: "sessions" },
};
const billingSchemaMock = {
  balance: { __table: "balance" },
  ledger: { __table: "ledger" },
};

vi.mock("drizzle-orm/neon-http", () => ({ drizzle: drizzleMock }));
vi.mock("../../src/utils/config.js", () => ({ getConfig: getConfigMock }));
vi.mock("../../src/models/auth.js", () => authSchemaMock);
vi.mock("../../src/models/billing.js", () => billingSchemaMock);

async function importFresh() {
  vi.resetModules();
  // re-apply mocks after reset
  vi.doMock("drizzle-orm/neon-http", () => ({ drizzle: drizzleMock }));
  vi.doMock("../../src/utils/config.js", () => ({ getConfig: getConfigMock }));
  vi.doMock("../../src/models/auth.js", () => authSchemaMock);
  vi.doMock("../../src/models/billing.js", () => billingSchemaMock);

  return await import(MODULE_UNDER_TEST);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDb", () => {
  it("initializes drizzle with database_url and merged schema", async () => {
    const { getDb } = await importFresh();

    const ctx = { ctxId: 1 } as any;
    getConfigMock.mockReturnValueOnce({
      auth: {
        enabled: true,
        database_url: "postgres://user:pass@host/db",
      },
    });

    const db = getDb(ctx);

    expect(getConfigMock).toHaveBeenCalledWith(ctx);
    expect(drizzleMock).toHaveBeenCalledTimes(1);

    const [dbUrlArg, optionsArg] = drizzleMock.mock.calls[0];
    expect(dbUrlArg).toBe("postgres://user:pass@host/db");
    expect(optionsArg).toBeTruthy();
    expect(optionsArg.schema).toEqual({
      ...authSchemaMock,
      ...billingSchemaMock,
    });

    // returns drizzle instance
    expect(db).toEqual({ __db: true, tag: "neon-drizzle" });
  });

  it("caches the drizzle instance across calls", async () => {
    const { getDb } = await importFresh();

    getConfigMock.mockReturnValue({
      auth: {
        enabled: true,
        database_url: "postgres://cache@test/db",
      },
    });

    const c1 = { a: 1 } as any;
    const c2 = { a: 2 } as any;

    const db1 = getDb(c1);
    const db2 = getDb(c2);

    expect(db1).toBe(db2); // same cached instance
    // Only first call should initialize:
    expect(getConfigMock).toHaveBeenCalledTimes(1);
    expect(drizzleMock).toHaveBeenCalledTimes(1);
  });

  it("passes Context to getConfig on first initialization only", async () => {
    const { getDb } = await importFresh();

    const ctx = { hello: "world" } as any;
    getConfigMock.mockReturnValue({
      auth: {
        enabled: true,
        database_url: "postgres://init@test/db",
      },
    });

    getDb(ctx);
    getDb({ later: true } as any);

    expect(getConfigMock).toHaveBeenCalledTimes(1);
    expect(getConfigMock).toHaveBeenCalledWith(ctx);
  });
});
