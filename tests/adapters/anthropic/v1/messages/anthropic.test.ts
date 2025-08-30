import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnthropicMessagesAnthropicAdapter } from "../../../../../src/adapters/anthropic/v1/messages/anthropic";

describe("messages/adapter smoke", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});

// ---- Mock @anthropic-ai/sdk ----
let createImpl: (...args: any[]) => any;

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAnthropic {
    static lastOpts: any;
    messages = {
      create: (...args: any[]) => createImpl(...args),
    };
    constructor(opts: any) {
      FakeAnthropic.lastOpts = opts;
    }
  }
  return { default: FakeAnthropic };
});

type Provider = {
  base_url: string;
  api_key: string;
  type?: string;
};

const provider: Provider = {
  base_url: "https://anthropic.example",
  api_key: "sk-test-123",
  type: "anthropic",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AnthropicMessagesAnthropicAdapter.sendRequest", () => {
  it("calls messages.create and maps usage -> adapter.usage", async () => {
    const sut = new AnthropicMessagesAnthropicAdapter();

    // Fake non-streaming Message with usage block
    const fakeMessage: any = {
      id: "msg_1",
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
      usage: {
        input_tokens: 42,
        output_tokens: 7,
        server_tool_use: { web_search_requests: 3 },
        cache_read_input_tokens: 5,
        cache_creation_input_tokens: 11,
      },
    };

    createImpl = vi.fn().mockResolvedValue(fakeMessage);

    const req: any = {
      model: "claude-3-haiku",
      messages: [{ role: "user", content: "ping" }],
    };
    const resp = await sut.sendRequest(provider as any, req, { maxTokens: 99 });

    // returns message as-is
    expect(resp).toBe(fakeMessage);

    // usage mapped correctly
    expect(sut.usage).toEqual({
      input: 42,
      output: 7,
      web_search: 3,
      request: 1,
      input_cache_reads: 5,
      input_cache_writes: 11,
    });

    // ensure messages.create was invoked with our request
    expect(createImpl).toHaveBeenCalledWith(req);
  });

  it("handles absent optional usage fields (defaults to 0)", async () => {
    const sut = new AnthropicMessagesAnthropicAdapter();

    const msgNoExtras: any = {
      id: "msg_2",
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        // server_tool_use, cache_* missing -> should map to 0
      },
    };
    createImpl = vi.fn().mockResolvedValue(msgNoExtras);

    const resp = await sut.sendRequest(
      provider as any,
      {
        model: "claude-3-haiku",
        max_tokens: 1,
        messages: [{ role: "user", content: [{ type: "text", text: "ping" }] }],
      },
      {},
    );
    expect(resp).toBe(msgNoExtras);
    expect(sut.usage).toEqual({
      input: 0,
      output: 0,
      web_search: 0,
      request: 1,
      input_cache_reads: 0,
      input_cache_writes: 0,
    });
  });
});

describe("AnthropicMessagesAnthropicAdapter.sendRequestStreaming", () => {
  it("yields stream events and updates usage when a message_delta arrives", async () => {
    const sut = new AnthropicMessagesAnthropicAdapter();

    // Build an async generator that yields a few RawMessageStreamEvent-like objects
    async function* fakeStream() {
      yield { type: "message_start", message: { id: "m1" } };
      yield {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "he" },
      };
      // message_delta carries usage — adapter must update usage from this
      yield {
        type: "message_delta",
        delta: { stop_reason: "end_turn", stop_sequence: null },
        usage: {
          input_tokens: 12,
          output_tokens: 3,
          cache_read_input_tokens: 2,
          cache_creation_input_tokens: 0,
          server_tool_use: { web_search_requests: 1 },
        },
      };
      yield { type: "message_stop" };
    }

    // For streaming, anthropic.messages.create returns an async-iterable stream
    createImpl = vi.fn().mockResolvedValue(fakeStream());

    const req: any = {
      model: "claude-3-haiku",
      messages: [{ role: "user", content: "hello" }],
      stream: true,
    };
    const iter = await sut.sendRequestStreaming(provider as any, req, {
      maxTokens: 50,
    });

    const events: any[] = [];
    for await (const ev of iter) events.push(ev);

    // All events yielded through
    expect(events.map((e) => e.type)).toEqual([
      "message_start",
      "content_block_delta",
      "message_delta",
      "message_stop",
    ]);

    // usage updated from the message_delta event
    expect(sut.usage).toEqual({
      input: 12,
      output: 3,
      web_search: 1,
      request: 1,
      input_cache_reads: 2,
      input_cache_writes: 0,
    });

    // ensure messages.create was called once with our request
    expect(createImpl).toHaveBeenCalledTimes(1);
    expect(createImpl).toHaveBeenCalledWith(req);
  });

  it("defaults missing usage fields in message_delta to zeros", async () => {
    const sut = new AnthropicMessagesAnthropicAdapter();

    async function* minimalDelta() {
      yield {
        type: "message_delta",
        delta: { stop_reason: null, stop_sequence: null },
        usage: {} as any,
      };
    }
    createImpl = vi.fn().mockResolvedValue(minimalDelta());

    const iter = await sut.sendRequestStreaming(
      provider as any,
      { model: "claude-3", messages: [] } as any,
      {},
    );
    // drain
    for await (const _ of iter) {
      /* noop */
    }

    expect(sut.usage).toEqual({
      input: 0,
      output: 0,
      web_search: 0,
      request: 1,
      input_cache_reads: 0,
      input_cache_writes: 0,
    });
  });
});
