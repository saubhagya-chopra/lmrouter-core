// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import { Stream } from "openai/core/streaming";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsBase,
} from "openai/resources/chat/completions";

import type {
  OpenAIChatCompletionAdapter,
  OpenAIChatCompletionInputOptions,
} from "./adapter.js";
import type { LMRouterCoreConfigProvider } from "../../../../utils/config.js";

export class OpenAIChatCompletionOpenAIAdapter
  implements OpenAIChatCompletionAdapter
{
  getClient(provider: LMRouterCoreConfigProvider): OpenAI {
    return new OpenAI({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
      defaultHeaders: {
        "HTTP-Referer": "https://lmrouter.com/",
        "X-Title": "LMRouter",
      },
    });
  }

  async sendRequest(
    provider: LMRouterCoreConfigProvider,
    request: ChatCompletionCreateParamsBase,
    options?: OpenAIChatCompletionInputOptions,
  ): Promise<ChatCompletion> {
    const openai = this.getClient(provider);
    const completion = await openai.chat.completions.create(request);
    return completion as ChatCompletion;
  }

  async *sendRequestStreaming(
    provider: LMRouterCoreConfigProvider,
    request: ChatCompletionCreateParamsBase,
    options?: OpenAIChatCompletionInputOptions,
  ): AsyncGenerator<ChatCompletionChunk> {
    const openai = this.getClient(provider);
    const stream = await openai.chat.completions.create(request);
    for await (const chunk of stream as Stream<ChatCompletionChunk>) {
      yield chunk;
    }
  }
}
