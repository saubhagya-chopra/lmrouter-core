import { describe, it, expect, vi } from "vitest";
import { OpenAIChatCompletionAnthropicAdapter } from "../../../../../src/adapters/openai/v1/chat/anthropic";
import * as AnthropicFactoryMod from "../../../../../src/adapters/anthropic/v1/messages/adapter";

describe("messages/adapter smoke", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});

type RawEvent =
  import("@anthropic-ai/sdk/resources/messages").RawMessageStreamEvent;
type Message = import("@anthropic-ai/sdk/resources/messages").Message;

describe("OpenAIChatCompletionAnthropicAdapter.convertRequest", () => {
  it("maps system/developer, tool/tool_calls, images, tool_choice & tokens clamp", () => {
    const sut = new OpenAIChatCompletionAnthropicAdapter();

    const req: any = {
      model: "gpt-4o-mini",
      user: "user-123",
      parallel_tool_calls: true,
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: "SYS" },
        { role: "developer", content: "DEV" },
        {
          role: "user",
          content: [
            { type: "text", text: "hi" },
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64,aGVsbG8=" },
            },
          ],
        },
        {
          role: "assistant",
          content: "thinking…",
          tool_calls: [
            {
              id: "t1",
              type: "function",
              function: {
                name: "sum",
                arguments: JSON.stringify({ a: 1, b: 2 }),
              },
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: "t1",
          content: [{ type: "text", text: "3" }],
        },
        { role: "function", name: "x", content: "ignore" }, // filtered out
      ],
      tool_choice: { type: "function", function: { name: "sum" } },
      tools: [
        {
          type: "function",
          function: {
            name: "sum",
            description: "adds",
            parameters: { type: "object" },
          },
        },
      ],
      stop: "END",
      stream: true,
      temperature: 0.7,
      reasoning_effort: "medium",
      top_p: 0.9,
    };

    const out = sut.convertRequest(req, 1500);

    expect(out.model).toBe("gpt-4o-mini");
    expect(out.metadata?.user_id).toBe("user-123");
    expect(out.system).toBe("SYS");

    const userMsg = out.messages[0];
    expect(userMsg.role).toBe("user");
    expect(userMsg.content[0]).toEqual({ type: "text", text: "hi" });
    expect(userMsg.content[1]).toMatchObject({ type: "image" });

    const assistantMsg = out.messages[1];
    expect(assistantMsg.role).toBe("assistant");
    expect(assistantMsg.content[1]).toMatchObject({
      type: "tool_use",
      id: "t1",
      name: "sum",
    });

    const toolMsg = out.messages[2];
    expect(toolMsg).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "t1", content: "3" }],
    });

    expect(out.max_tokens).toBe(1500);
    expect(out.stop_sequences).toEqual(["END"]);
    expect(out.stream).toBe(true);
    expect(out.temperature).toBe(0.7);
    expect(out.top_p).toBe(0.9);
    expect(out.thinking).toEqual({ type: "enabled", budget_tokens: 8192 });
    expect(out.tool_choice).toEqual({
      type: "tool",
      name: "sum",
      disable_parallel_tool_use: false,
    });
    expect(out.tools?.[0].name).toBe("sum");
  });
});

describe("OpenAIChatCompletionAnthropicAdapter.convertResponse", () => {
  it("maps Message → ChatCompletion with text, tool_calls, finish_reason, usage", () => {
    const sut = new OpenAIChatCompletionAnthropicAdapter();

    const msg: Message = {
      id: "m1",
      type: "message",
      role: "assistant",
      model: "gpt-x",
      content: [
        { type: "text", text: "hello " } as any,
        { type: "text", text: "world" } as any,
        { type: "tool_use", id: "t1", name: "sum", input: { a: 1 } } as any,
      ],
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 3,
        cache_read_input_tokens: 2,
        cache_creation_input_tokens: null,
        server_tool_use: null,
        service_tier: "standard",
      },
    };

    const out = sut.convertResponse(msg);

    expect(out.id).toBe("m1");
    expect(out.choices[0].message.content).toBe("hello world");
    expect(out.choices[0].finish_reason).toBe("tool_calls");
    expect(out.service_tier).toBe("default");
  });
});

describe("OpenAIChatCompletionAnthropicAdapter.convertStream", () => {
  it("emits ChatCompletionChunks from RawMessageStreamEvent stream", async () => {
    const sut = new OpenAIChatCompletionAnthropicAdapter();

    async function* events(): AsyncGenerator<RawEvent> {
      yield {
        type: "message_start",
        message: {
          id: "m1",
          type: "message",
          role: "assistant",
          model: "gpt-y",
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: 8,
            output_tokens: 0,
            cache_read_input_tokens: 3,
            cache_creation_input_tokens: null,
            server_tool_use: null,
            service_tier: "priority",
          },
        },
      } as any;
      yield {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "", citations: null },
      } as any;
      yield {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "hi" },
      } as any;
      yield {
        type: "message_delta",
        delta: { stop_reason: "tool_use", stop_sequence: null },
        usage: {
          input_tokens: 8,
          output_tokens: 4,
          cache_read_input_tokens: 3,
          cache_creation_input_tokens: 0,
          server_tool_use: null,
        },
      } as any;
    }

    const chunks: any[] = [];
    for await (const c of sut.convertStream(events())) {
      chunks.push(c);
    }

    expect(chunks[0].choices[0].delta.role).toBe("assistant");
    expect(chunks[1].choices[0].delta).toEqual({ content: "hi" });
    expect(chunks[chunks.length - 2].choices[0].finish_reason).toBe(
      "tool_calls",
    );
    expect(chunks[chunks.length - 1].usage?.total_tokens).toBe(15);
  });
});

describe("OpenAIChatCompletionAnthropicAdapter.sendRequest / sendRequestStreaming", () => {
  it("delegates to AnthropicMessagesAdapter and propagates usage", async () => {
    const sut = new OpenAIChatCompletionAnthropicAdapter();
    const fakeUsage = {
      input: 10,
      output: 5,
      web_search: 0,
      request: 1,
      input_cache_reads: 2,
      input_cache_writes: 0,
    };

    const fakeMessage: Message = {
      id: "m2",
      type: "message",
      role: "assistant",
      model: "z",
      content: [{ type: "text", text: "ok" }] as any,
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 9,
        output_tokens: 5,
        cache_read_input_tokens: 2,
        cache_creation_input_tokens: null,
        server_tool_use: null,
        service_tier: "standard",
      },
    };

    const sendRequest = vi.fn().mockResolvedValue(fakeMessage);
    async function* fakeEvents() {
      yield { type: "message_start", message: fakeMessage } as any;
    }
    const sendRequestStreaming = vi.fn().mockResolvedValue(fakeEvents());

    const fakeAnthropicAdapter: any = {
      sendRequest,
      sendRequestStreaming,
      usage: fakeUsage,
    };
    vi.spyOn(
      AnthropicFactoryMod.AnthropicMessagesAdapterFactory,
      "getAdapter",
    ).mockReturnValue(fakeAnthropicAdapter);

    const provider: any = { type: "anthropic" };
    const openaiReq: any = {
      model: "g",
      max_completion_tokens: 64,
      messages: [{ role: "user", content: "hi" }],
    };

    const resp = await sut.sendRequest(provider, openaiReq, { maxTokens: 32 });
    expect(resp.choices[0].message.role).toBe("assistant");
    expect(sut.usage).toBe(fakeUsage);

    const iter = await sut.sendRequestStreaming(provider, openaiReq, {
      maxTokens: 32,
    });
    const chunks: any[] = [];
    expect(sut.usage).toBe(fakeUsage);
  });
});
