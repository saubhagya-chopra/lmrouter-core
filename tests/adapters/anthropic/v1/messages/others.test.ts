import { describe, it, expect, vi } from "vitest";

// ⚠️ Adjust this import path to your repo structure
import { AnthropicMessagesOthersAdapter } from "../../../../../src/adapters/anthropic/v1/messages/others";


// --- Helpers / minimal fakes ---
const provider: any = {
  name: "fake",
  baseUrl: "https://example.test",
  headers: {},
};

function chunk(
  partial: Partial<
    import("openai/resources/chat/completions").ChatCompletionChunk
  >,
): any {
  // minimal chunk; fill defaults for fields SUT expects
  return {
    id: "chunk_1",
    object: "chat.completion.chunk",
    created: Date.now() / 1000,
    model: "gpt-3.5-turbo",
    system_fingerprint: null,
    service_tier: "default",
    choices: [{ index: 0, delta: {}, finish_reason: null }],
    ...partial,
  };
}

function completion(
  partial: Partial<import("openai/resources/chat/completions").ChatCompletion>,
): any {
  return {
    id: "cmpl_1",
    object: "chat.completion",
    created: Date.now() / 1000,
    model: "gpt-4o-mini",
    service_tier: "priority",
    usage: {
      prompt_tokens: 15,
      completion_tokens: 7,
      total_tokens: 22,
      prompt_tokens_details: { cached_tokens: 5 },
    },
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "hello", tool_calls: [] },
        finish_reason: "stop",
      },
    ],
    ...partial,
  };
}

describe("AnthropicMessagesOthersAdapter.convertRequest", () => {
  it("maps system, user text/image, assistant text, tool_use/tool_result, and options → OpenAI shape", () => {
    const sut = new AnthropicMessagesOthersAdapter();

    const request: any = {
      model: "gpt-4o",
      system: [
        { type: "text", text: "sysA" },
        { type: "text", text: "sysB" },
      ],
      messages: [
        // user: text + image
        {
          role: "user",
          content: [
            { type: "text", text: "hello" },
            {
              type: "image",
              source: { type: "url", url: "https://img/x.png" },
            },
          ],
        },
        // assistant: text only
        {
          role: "assistant",
          content: [{ type: "text", text: "ok" }],
        },
        // assistant tool_use
        {
          role: "assistant",
          content: [
            { type: "text", text: "calling tool" },
            {
              type: "tool_use",
              id: "tool_1",
              name: "weather",
              input: { city: "delhi" },
            },
            { type: "tool_use", id: "tool_2", name: "math", input: { x: 2 } },
          ],
        },
        // tool_result(s) → tool role messages
        {
          role: "user", // role ignored for tool_result pathway
          content: [
            { type: "tool_result", tool_use_id: "tool_1", content: "32C" },
            {
              type: "tool_result",
              tool_use_id: "tool_2",
              content: [{ type: "text", text: "4" }],
            },
          ],
        },
      ],
      tools: [
        {
          name: "weather",
          input_schema: {
            type: "object",
            properties: { city: { type: "string" } },
          },
          description: "Weather",
        },
      ],
      tool_choice: { type: "tool", name: "weather" },
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.9,
      stop_sequences: ["END"],
      stream: true,
      thinking: { type: "enabled", budget_tokens: 4096 },
      metadata: { user_id: "u".repeat(200) }, // should be truncated to 128
    };

    const out = sut.convertRequest(request, /*maxTokens*/ 1500);

    // system → first message
    expect(out.messages[0]).toEqual({ role: "system", content: "sysAsysB" });

    // user with text+image
    const userMsg = out.messages.find((m: any) => m.role === "user");
    expect(userMsg?.content).toEqual([
      { type: "text", text: "hello" },
      { type: "image_url", image_url: { url: "https://img/x.png" } },
    ]);

    // assistant text
    const assistantText = out.messages.find(
      (m: any) => m.role === "assistant" && m.content === "ok",
    );
    expect(assistantText).toBeTruthy();

    // assistant tool_calls mapping
    const assistantWithTools = out.messages.find((m: any) => m.tool_calls);
    expect(assistantWithTools).toMatchObject({
      role: "assistant",
      content: "calling tool",
      tool_calls: [
        {
          index: 0,
          id: "tool_1",
          type: "function",
          function: {
            name: "weather",
            arguments: JSON.stringify({ city: "delhi" }),
          },
        },
        {
          index: 1,
          id: "tool_2",
          type: "function",
          function: { name: "math", arguments: JSON.stringify({ x: 2 }) },
        },
      ],
    });

    // tool_result → tool messages
    const toolMsgs = out.messages.filter((m: any) => m.role === "tool");
    expect(toolMsgs).toEqual([
      { role: "tool", tool_call_id: "tool_1", content: "32C" },
      { role: "tool", tool_call_id: "tool_2", content: "4" },
    ]);

    // tokens clamp
    expect(out.max_completion_tokens).toBe(Math.min(2000, 1500));

    // reasoning_effort from thinking.budget_tokens (4096 => medium)
    expect(out.reasoning_effort).toBe("medium");

    // tool_choice to function by name
    expect(out.tool_choice).toEqual({
      type: "function",
      function: { name: "weather" },
    });

    // tools list
    expect(out.tools?.[0]).toEqual({
      type: "function",
      function: {
        name: "weather",
        description: "Weather",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
        },
      },
    });

    // stream options include usage
    expect(out.stream).toBe(true);
    expect(out.stream_options).toEqual({ include_usage: true });

    // user truncation to 128
    expect((out.user as string).length).toBe(128);
  });

  it("handles no system, string content, and tool_choice none/any/auto", () => {
    const sut = new AnthropicMessagesOthersAdapter();
    const request: any = {
      model: "gpt-mini",
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: [{ type: "text", text: "yo" }] },
      ],
      tool_choice: { type: "none" },
      max_tokens: 50,
    };
    const out = sut.convertRequest(request, 1000);
    expect(out.messages[0]).toEqual({ role: "user", content: "hi" });
    expect(out.messages[1]).toEqual({ role: "assistant", content: "yo" });
    expect(out.tool_choice).toBe("none");

    // any -> "required", auto -> "auto"
    request.tool_choice = { type: "any", disable_parallel_tool_use: true };
    expect(sut.convertRequest(request).tool_choice).toBe("required");
    request.tool_choice = { type: "auto" };
    expect(sut.convertRequest(request).tool_choice).toBe("auto");
  });
});
