import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MODULE_UNDER_TEST = "../../src/utils/config";

// --- Mocks ---
const fsReadFileSyncMock = vi.fn();
const yamlParseMock = vi.fn();

vi.mock("fs", () => ({
  default: {
    readFileSync: fsReadFileSyncMock,
  },
}));
vi.mock("yaml", () => ({
  default: { parse: yamlParseMock },
  parse: yamlParseMock, // if code imports default or named, both resolve
}));

// util: import module fresh (so its internal configCache resets)
async function importFresh() {
  vi.resetModules();
  // reapply our mocks after reset
  vi.doMock("fs", () => ({ default: { readFileSync: fsReadFileSyncMock } }));
  vi.doMock("yaml", () => ({
    default: { parse: yamlParseMock },
    parse: yamlParseMock,
  }));
  return await import(MODULE_UNDER_TEST);
}

const ORIG_ARGV = [...process.argv];
const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.argv = [...ORIG_ARGV];
  process.env = { ...ORIG_ENV };
});

afterEach(() => {
  process.argv = [...ORIG_ARGV];
  process.env = { ...ORIG_ENV };
});

describe("getConfig()", () => {
  it("loads config from base64 env (context env wins over process.env)", async () => {
    const { getConfig } = await importFresh();

    const envYaml =
      "server:\n  host: 127.0.0.1\n  port: 7777\n  logging: debug\n";
    const base64 = Buffer.from(envYaml, "utf8").toString("base64");

    // return value from yaml.parse
    const parsed = {
      server: { host: "127.0.0.1", port: 7777, logging: "debug" },
      auth: { enabled: false },
      access_keys: [],
      providers: {},
      models: {},
    };
    yamlParseMock.mockReturnValueOnce(parsed);

    const c: any = { env: { LMROUTER_CONFIG: base64 } };
    const cfg = getConfig(c);

    expect(yamlParseMock).toHaveBeenCalledTimes(1);
    // ensure decoded string is passed to parser
    expect(yamlParseMock.mock.calls[0][0]).toBe(envYaml);
    expect(cfg).toBe(parsed);
  });

  it("loads config from process.env when context env is absent", async () => {
    const { getConfig } = await importFresh();

    const envYaml = "server:\n  host: 0.0.0.0\n  port: 8080\n  logging: info\n";
    process.env.LMROUTER_CONFIG = Buffer.from(envYaml, "utf8").toString(
      "base64",
    );

    const parsed = {
      server: { host: "0.0.0.0", port: 8080, logging: "info" },
      auth: { enabled: false },
      access_keys: [],
      providers: {},
      models: {},
    };
    yamlParseMock.mockReturnValueOnce(parsed);

    const cfg = getConfig(); // no ctx
    expect(yamlParseMock).toHaveBeenCalledTimes(1);
    expect(yamlParseMock.mock.calls[0][0]).toBe(envYaml);
    expect(cfg).toBe(parsed);
  });

  it("loads default example file when no env set and argv length < 3", async () => {
    const { getConfig } = await importFresh();

    // simulate no extra argv
    process.argv = ["node", "script.js"];

    fsReadFileSyncMock.mockReturnValueOnce("default-yaml-content");
    const parsed = {
      server: { host: "default", port: 3000, logging: "info" },
      auth: { enabled: false },
      access_keys: [],
      providers: {},
      models: {},
    };
    yamlParseMock.mockReturnValueOnce(parsed);

    const cfg = getConfig();

    expect(fsReadFileSyncMock).toHaveBeenCalledTimes(1);
    // ensure readFileSync called with 'utf8' encoding
    expect(fsReadFileSyncMock.mock.calls[0][1]).toBe("utf8");
    expect(yamlParseMock).toHaveBeenCalledWith("default-yaml-content");
    expect(cfg).toBe(parsed);
  });

  it("loads config from explicit file path via process.argv[2]", async () => {
    const { getConfig } = await importFresh();

    process.argv = ["node", "script.js", "/abs/path/config.yaml"];

    fsReadFileSyncMock.mockReturnValueOnce("file-yaml-content");
    const parsed = {
      server: { host: "file-host", port: 9090, logging: "warn" },
      auth: { enabled: false },
      access_keys: [],
      providers: {},
      models: {},
    };
    yamlParseMock.mockReturnValueOnce(parsed);

    const cfg = getConfig();

    expect(fsReadFileSyncMock).toHaveBeenCalledWith(
      "/abs/path/config.yaml",
      "utf8",
    );
    expect(yamlParseMock).toHaveBeenCalledWith("file-yaml-content");
    expect(cfg).toBe(parsed);
  });

  it("uses in-memory cache on subsequent calls (no re-parse)", async () => {
    const { getConfig } = await importFresh();

    // first call: load from env
    const envYaml = "server:\n  host: cache\n  port: 1\n  logging: off\n";
    process.env.LMROUTER_CONFIG = Buffer.from(envYaml, "utf8").toString(
      "base64",
    );

    const parsed = {
      server: { host: "cache", port: 1, logging: "off" },
      auth: { enabled: false },
      access_keys: [],
      providers: {},
      models: {},
    };
    yamlParseMock.mockReturnValueOnce(parsed);

    const first = getConfig();
    expect(first).toBe(parsed);
    expect(yamlParseMock).toHaveBeenCalledTimes(1);

    // mutate env/argv to what would otherwise trigger a different branch
    delete process.env.LMROUTER_CONFIG;
    process.argv = ["node", "script.js", "/another/config.yaml"];

    // second call should return cached result, NOT call fs/yaml again
    const second = getConfig();
    expect(second).toBe(parsed);
    expect(yamlParseMock).toHaveBeenCalledTimes(1);
    expect(fsReadFileSyncMock).not.toHaveBeenCalled();
  });
});
