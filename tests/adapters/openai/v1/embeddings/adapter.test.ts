import { describe, it, expect } from "vitest";

import { OpenAIEmbeddingsAdapterFactory } from "../../../../../src/adapters/openai/v1/embeddings/adapter";
import { OpenAIEmbeddingsOpenAIAdapter } from "../../../../../src/adapters/openai/v1/embeddings/openai";

describe("OpenAIEmbeddingsAdapterFactory.getAdapter", () => {
  it('returns OpenAIEmbeddingsOpenAIAdapter for provider.type = "others"', () => {
    const provider: any = { type: "others" };
    const adapter = OpenAIEmbeddingsAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIEmbeddingsOpenAIAdapter);
  });

  it("defaults to OpenAIEmbeddingsOpenAIAdapter for unknown provider.type", () => {
    const provider: any = { type: "foo" };
    const adapter = OpenAIEmbeddingsAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIEmbeddingsOpenAIAdapter);
  });

  it("creates a fresh instance every call", () => {
    const provider: any = { type: "others" };
    const a1 = OpenAIEmbeddingsAdapterFactory.getAdapter(provider);
    const a2 = OpenAIEmbeddingsAdapterFactory.getAdapter(provider);
    expect(a1).not.toBe(a2);
  });
});
