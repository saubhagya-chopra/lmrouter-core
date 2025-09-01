import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAIChatCompletionOpenAIAdapter } from "../../../../../src/adapters/openai/v1/chat/openai";

describe("messages/adapter smoke", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});

// ---- Mock openai SDK ----
let createImpl: (...args: any[]) => any;

vi.mock("openai", () => {
  class FakeOpenAI {
    static lastOpts: any;
    chat = {
      completions: {
        create: (...args: any[]) => createImpl(...args),
      },
    };
    constructor(opts: any) {
      FakeOpenAI.lastOpts = opts;
    }
  }
  return { default: FakeOpenAI };
});

type Provider = { base_url: string; api_key: string; type?: string };

const provider: Provider = {
  base_url: "https://openai.example",
  api_key: "sk-test-abc",
  type: "others",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("OpenAIChatCompletionOpenAIAdapter.getClient", () => {
  it("constructs OpenAI client with baseURL, apiKey, and default headers", async () => {
    const sut = new OpenAIChatCompletionOpenAIAdapter();
    // Import the mocked class to read constructor args
    const Fake: any = (await import("openai")).default;

    sut.getClient(provider as any);

    expect(Fake.lastOpts).toEqual({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
      defaultHeaders: {
        "HTTP-Referer": "https://lmrouter.com/",
        "X-Title": "LMRouter",
      },
    });
  });
});

describe("OpenAIChatCompletionOpenAIAdapter.sendRequest", () => {
  it("calls chat.completions.create and maps usage (incl. audio + cached tokens) to adapter.usage", async () => {
    const sut = new OpenAIChatCompletionOpenAIAdapter();

    const completion: any = {
      id: "chatcmpl_1",
      object: "chat.completion",
      model: "gpt-4o-mini",
      service_tier: "priority",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "ok" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        prompt_tokens_details: {
          cached_tokens: 30,
          audio_tokens: 10,
        },
        completion_tokens_details: {
          audio_tokens: 5,
        },
      },
    };

    createImpl = vi.fn().mockResolvedValue(completion);

    const req: any = {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 16,
    };

    const resp = await sut.sendRequest(provider as any, req, { maxTokens: 16 });

    expect(resp).toBe(completion);
    expect(createImpl).toHaveBeenCalledWith(req);

    // input = prompt - cached - audioPrompt; output = completion - audioCompletion
    expect(sut.usage).toEqual({
      service_tier: "priority",
      input: 100 - 30 - 10, // 60
      input_audio: 10,
      output: 50 - 5, // 45
      output_audio: 5,
      request: 1,
      input_cache_reads: 30,
    });
  });

  it("defaults missing usage fields to zeros", async () => {
    const sut = new OpenAIChatCompletionOpenAIAdapter();

    const completion: any = {
      id: "chatcmpl_2",
      choices: [],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        // no details blocks
      },
    };
    createImpl = vi.fn().mockResolvedValue(completion);

    await sut.sendRequest(
      provider as any,
      { model: "gpt-mini", messages: [] } as any,
      {},
    );
    expect(sut.usage).toEqual({
      service_tier: undefined,
      input: 0,
      input_audio: 0,
      output: 0,
      output_audio: 0,
      request: 1,
      input_cache_reads: 0,
    });
  });
});

describe("OpenAIChatCompletionOpenAIAdapter.sendRequestStreaming", () => {
  it("yields chunks and updates usage on chunks that include usage", async () => {
    const sut = new OpenAIChatCompletionOpenAIAdapter();

    async function* stream() {
      // first chunk (no usage)
      yield {
        id: "chunk_1",
        object: "chat.completion.chunk",
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            delta: { content: "He" },
            finish_reason: null,
            logprobs: null,
          },
        ],
        usage: null,
        service_tier: "default",
      } as any;

      // second chunk (with usage)
      yield {
        id: "chunk_2",
        object: "chat.completion.chunk",
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            delta: { content: "llo" },
            finish_reason: "stop",
            logprobs: null,
          },
        ],
        service_tier: "priority",
        usage: {
          prompt_tokens: 40,
          completion_tokens: 12,
          total_tokens: 52,
          prompt_tokens_details: {
            cached_tokens: 8,
            audio_tokens: 4,
          },
          // completion_tokens_details may be absent; streaming code doesn’t read it anyway
        },
      } as any;
    }

    createImpl = vi.fn().mockResolvedValue(stream());

    const req: any = {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hi" }],
      stream: true,
    };

    const iter = await sut.sendRequestStreaming(provider as any, req, {
      maxTokens: 32,
    });

    const chunks: any[] = [];
    for await (const ch of iter) chunks.push(ch);

    // passthrough
    expect(chunks.length).toBe(2);
    expect(chunks[0].choices[0].delta.content).toBe("He");
    expect(chunks[1].choices[0].delta.content).toBe("llo");

    // usage is updated only when chunk.usage exists
    // NOTE: streaming code sets output = completion_tokens (no audio subtraction here)
    expect(sut.usage).toEqual({
      service_tier: "priority",
      input: 40 - 8 - 4, // 28
      input_audio: 4,
      output: 12,
      request: 1,
      input_cache_reads: 8,
    });
  });

  it("handles minimal usage shape in stream gracefully", async () => {
    const sut = new OpenAIChatCompletionOpenAIAdapter();

    async function* stream() {
      yield {
        id: "chunk_min",
        object: "chat.completion.chunk",
        model: "gpt-mini",
        choices: [{ index: 0, delta: {}, finish_reason: null, logprobs: null }],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 2,
          // no prompt_tokens_details
        },
        service_tier: null,
      } as any;
    }

    createImpl = vi.fn().mockResolvedValue(stream());

    const iter = await sut.sendRequestStreaming(
      provider as any,
      { model: "gpt-mini", messages: [] } as any,
      {},
    );
    // drain
    for await (const _ of iter) {
      /* noop */
    }

    expect(sut.usage).toEqual({
      service_tier: undefined,
      input: 5 - 0 - 0,
      input_audio: 0,
      output: 2,
      request: 1,
      input_cache_reads: 0,
    });
  });
});
