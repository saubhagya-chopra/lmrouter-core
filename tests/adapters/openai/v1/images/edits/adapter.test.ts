import { describe, it, expect } from "vitest";

import { OpenAIImageEditAdapterFactory } from "../../../../../../src/adapters/openai/v1/images/edits/adapter";
import { OpenAIImageEditFireworksAdapter } from "../../../../../../src/adapters/openai/v1/images/edits/fireworks";
import { OpenAIImageEditGoogleAdapter } from "../../../../../../src/adapters/openai/v1/images/edits/google";
import { OpenAIImageEditOpenAIAdapter } from "../../../../../../src/adapters/openai/v1/images/edits/openai";

describe("OpenAIImageEditAdapterFactory.getAdapter", () => {
  it('returns OpenAIImageEditFireworksAdapter for provider.type = "fireworks"', () => {
    const provider: any = { type: "fireworks" };
    const adapter = OpenAIImageEditAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIImageEditFireworksAdapter);
  });

  it('returns OpenAIImageEditGoogleAdapter for provider.type = "google"', () => {
    const provider: any = { type: "google" };
    const adapter = OpenAIImageEditAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIImageEditGoogleAdapter);
  });

  it('returns OpenAIImageEditOpenAIAdapter for provider.type = "others"', () => {
    const provider: any = { type: "others" };
    const adapter = OpenAIImageEditAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIImageEditOpenAIAdapter);
  });

  it("defaults to OpenAIImageEditOpenAIAdapter for unknown provider.type", () => {
    const provider: any = { type: "random" };
    const adapter = OpenAIImageEditAdapterFactory.getAdapter(provider);
    expect(adapter).toBeInstanceOf(OpenAIImageEditOpenAIAdapter);
  });

  it("creates a new instance on each call", () => {
    const provider: any = { type: "google" };
    const a1 = OpenAIImageEditAdapterFactory.getAdapter(provider);
    const a2 = OpenAIImageEditAdapterFactory.getAdapter(provider);
    expect(a1).not.toBe(a2);
  });
});
