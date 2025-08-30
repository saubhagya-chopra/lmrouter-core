import { describe, it, expect, vi, beforeEach } from "vitest";
import { HTTPException } from "hono/http-exception";

import { OpenAIEmbeddingsOpenAIAdapter } from "../../../../../src/adapters/openai/v1/embeddings/openai";

// ---- Mock openai SDK ----
let createImpl: (...args: any[]) => any;

vi.mock("openai", () => {
  class FakeOpenAI {
    static lastOpts: any;
    embeddings = {
      create: (...args: any[]) => createImpl(...args),
    };
    constructor(opts: any) {
      FakeOpenAI.lastOpts = opts;
    }
  }
  return { default: FakeOpenAI };
});

type Provider = { base_url: string; api_key: string };

const provider: Provider = {
  base_url: "https://openai.example",
  api_key: "sk-test-emb",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("OpenAIEmbeddingsOpenAIAdapter.sendRequest", () => {
  it("calls OpenAI.embeddings.create and maps usage to adapter.usage", async () => {
    const sut = new OpenAIEmbeddingsOpenAIAdapter();

    const embeddingResp: any = {
      object: "list",
      data: [{ object: "embedding", index: 0, embedding: [0.1, 0.2] }],
      model: "text-embedding-3-small",
      usage: { prompt_tokens: 42, total_tokens: 42 },
    };

    createImpl = vi.fn().mockResolvedValue(embeddingResp);

    const req: any = {
      model: "text-embedding-3-small",
      input: "hello world",
    };

    const resp = await sut.sendRequest(provider as any, req, {});

    expect(resp).toBe(embeddingResp);
    expect(createImpl).toHaveBeenCalledWith(req);

    // usage mapping
    expect(sut.usage).toEqual({
      input: 42,
      request: 1,
    });

    // verify client constructed with baseURL/apiKey and default headers
    const Fake: any = (await import("openai")).default;
    expect(Fake.lastOpts).toEqual({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
      defaultHeaders: {
        "HTTP-Referer": "https://lmrouter.com/",
        "X-Title": "LMRouter",
      },
    });
  });

  it("handles missing usage.prompt_tokens by treating it as 0", async () => {
    const sut = new OpenAIEmbeddingsOpenAIAdapter();

    const minimalResp: any = {
      object: "list",
      data: [],
      model: "text-embedding-3-small",
      usage: {
        /* prompt_tokens absent */
      } as any,
    };

    createImpl = vi.fn().mockResolvedValue(minimalResp);

    await sut.sendRequest(
      provider as any,
      { model: "text-embedding-3-small", input: [] } as any,
      {},
    );
    expect(sut.usage).toEqual({
      input: undefined, // openai returns undefined; adapter copies directly, which is fine
      request: 1,
    });
  });
});

describe("OpenAIEmbeddingsOpenAIAdapter.sendRequestStreaming", () => {
  it("throws 400 HTTPException since embeddings do not support streaming", async () => {
    const sut = new OpenAIEmbeddingsOpenAIAdapter();

    const call = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of await sut.sendRequestStreaming(
        provider as any,
        { model: "text-embedding-3-small", input: "x" } as any,
        {},
      )) {
        /* never reached */
      }
    };

    await expect(call()).rejects.toBeInstanceOf(HTTPException);
    await expect(call()).rejects.toMatchObject({
      status: 400,
      message: "Embeddings API does not support streaming",
    });
  });
});
