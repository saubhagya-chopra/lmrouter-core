
// ⚠️ Adjust these paths to your repo structure (alias '@' -> './src' in vitest.config.ts)
import { AnthropicMessagesAdapterFactory } from "../../../../../src/adapters/anthropic/v1/messages/adapter";
import { AnthropicMessagesAnthropicAdapter } from "../../../../../src/adapters/anthropic/v1/messages/anthropic";
import { AnthropicMessagesOthersAdapter } from "../../../../../src/adapters/anthropic/v1/messages/others";
import { describe, it, expect } from "vitest";

describe("messages/adapter smoke", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});

describe("AnthropicMessagesAdapterFactory.getAdapter", () => {
  it('returns AnthropicMessagesAnthropicAdapter for provider.type = "anthropic"', () => {
    const provider: any = { type: "anthropic" };
    const adapter = AnthropicMessagesAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(AnthropicMessagesAnthropicAdapter);
  });

  it('returns AnthropicMessagesOthersAdapter for provider.type = "others"', () => {
    const provider: any = { type: "others" };
    const adapter = AnthropicMessagesAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(AnthropicMessagesOthersAdapter);
  });

  it("defaults to AnthropicMessagesOthersAdapter for unknown provider.type", () => {
    const provider: any = { type: "openrouter" }; // anything not in adapters map
    const adapter = AnthropicMessagesAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(AnthropicMessagesOthersAdapter);
  });

  it("does not crash if provider has extra/missing fields (only type is used)", () => {
    const provider: any = { type: "anthropic", foo: 123, headers: undefined };
    const adapter = AnthropicMessagesAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(AnthropicMessagesAnthropicAdapter);
    // sanity: factory should create a *new instance* each call
    const adapter2 = AnthropicMessagesAdapterFactory.getAdapter(provider);
    expect(adapter2).not.toBe(adapter);
  });
});
