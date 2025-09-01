import { describe, it, expect } from "vitest";
import { OpenAIChatCompletionAdapterFactory } from "../../../../../src/adapters/openai/v1/chat/adapter" 
import { OpenAIChatCompletionAnthropicAdapter } from "../../../../../src/adapters/openai/v1/chat/anthropic";
import { OpenAIChatCompletionOpenAIAdapter } from "../../../../../src/adapters/openai/v1/chat/openai";

describe("messages/adapter smoke", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});

describe("OpenAIChatCompletionAdapterFactory.getAdapter", () => {
  it('returns OpenAIChatCompletionAnthropicAdapter for provider.type = "anthropic"', () => {
    const provider: any = { type: "anthropic" };
    const adapter = OpenAIChatCompletionAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIChatCompletionAnthropicAdapter);
  });

  it('returns OpenAIChatCompletionOpenAIAdapter for provider.type = "others"', () => {
    const provider: any = { type: "others" };
    const adapter = OpenAIChatCompletionAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIChatCompletionOpenAIAdapter);
  });

  it("defaults to OpenAIChatCompletionOpenAIAdapter for unknown provider.type", () => {
    const provider: any = { type: "openrouter" }; // not in the adapters map
    const adapter = OpenAIChatCompletionAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIChatCompletionOpenAIAdapter);
  });

  it("creates a fresh instance on each call", () => {
    const provider: any = { type: "others" };
    const a1 = OpenAIChatCompletionAdapterFactory.getAdapter(provider);
    const a2 = OpenAIChatCompletionAdapterFactory.getAdapter(provider);
    expect(a2).not.toBe(a1);
  });
});

