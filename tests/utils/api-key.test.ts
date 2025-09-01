// apiKey.test.ts
import { describe, it, expect } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
} from "../../src/utils/api-key";

describe("generateApiKey", () => {
  it("should generate a string starting with sk-lmr-", () => {
    const key = generateApiKey();
    expect(key.startsWith("sk-lmr-")).toBe(true);
  });

  it("should generate unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toEqual(key2);
  });

  it("should have reasonable length (prefix + base64url)", () => {
    const key = generateApiKey();
    // 7 chars for prefix + 43-44 chars for 32-byte base64url
    expect(key.length).toBeGreaterThan(40);
  });
});

describe("hashApiKey", () => {
  it("should return a SHA256 hex digest", () => {
    const apiKey = "test-key";
    const hash = hashApiKey(apiKey);
    expect(hash).toMatch(/^[a-f0-9]{64}$/); // sha256 always 64 hex chars
  });

  it("should return consistent results for same input", () => {
    const apiKey = "test-key";
    const hash1 = hashApiKey(apiKey);
    const hash2 = hashApiKey(apiKey);
    expect(hash1).toEqual(hash2);
  });

  it("should return different hashes for different inputs", () => {
    const hash1 = hashApiKey("key-1");
    const hash2 = hashApiKey("key-2");
    expect(hash1).not.toEqual(hash2);
  });
});

describe("getApiKeyPrefix", () => {
  it("should return the first 15 characters", () => {
    const key = "sk-lmr-1234567890abcdef";
    const prefix = getApiKeyPrefix(key);
    expect(prefix).toBe(key.slice(0, 15));
  });

  it("should handle short keys gracefully", () => {
    const key = "short-key";
    const prefix = getApiKeyPrefix(key);
    expect(prefix).toBe("short-key");
  });
});
