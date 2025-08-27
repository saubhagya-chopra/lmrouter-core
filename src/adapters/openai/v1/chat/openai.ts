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
import type { LMRouterApiCallUsage } from "../../../../utils/billing.js";
import type { LMRouterConfigProvider } from "../../../../utils/config.js";

export class OpenAIChatCompletionOpenAIAdapter
  implements OpenAIChatCompletionAdapter
{
  usage?: LMRouterApiCallUsage;

  getClient(provider: LMRouterConfigProvider): OpenAI {
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
    provider: LMRouterConfigProvider,
    request: ChatCompletionCreateParamsBase,
    options?: OpenAIChatCompletionInputOptions,
  ): Promise<ChatCompletion> {
    const openai = this.getClient(provider);
    const completion = await openai.chat.completions.create(request);
    this.usage = {
      service_tier: (completion as ChatCompletion).service_tier ?? undefined,
      input:
        ((completion as ChatCompletion).usage?.prompt_tokens ?? 0) -
        ((completion as ChatCompletion).usage?.prompt_tokens_details
          ?.cached_tokens ?? 0) -
        ((completion as ChatCompletion).usage?.prompt_tokens_details
          ?.audio_tokens ?? 0),
      input_audio:
        (completion as ChatCompletion).usage?.prompt_tokens_details
          ?.audio_tokens ?? 0,
      output: (completion as ChatCompletion).usage?.completion_tokens ?? 0,
      request: 1,
      input_cache_reads:
        (completion as ChatCompletion).usage?.prompt_tokens_details
          ?.cached_tokens ?? 0,
    };
    return completion as ChatCompletion;
  }

  async *sendRequestStreaming(
    provider: LMRouterConfigProvider,
    request: ChatCompletionCreateParamsBase,
    options?: OpenAIChatCompletionInputOptions,
  ): AsyncGenerator<ChatCompletionChunk> {
    const openai = this.getClient(provider);
    const stream = await openai.chat.completions.create(request);
    for await (const chunk of stream as Stream<ChatCompletionChunk>) {
      if (chunk.usage) {
        this.usage = {
          service_tier: chunk.service_tier ?? undefined,
          input:
            chunk.usage.prompt_tokens -
            (chunk.usage.prompt_tokens_details?.cached_tokens ?? 0) -
            (chunk.usage.prompt_tokens_details?.audio_tokens ?? 0),
          input_audio: chunk.usage.prompt_tokens_details?.audio_tokens ?? 0,
          output: chunk.usage.completion_tokens,
          request: 1,
          input_cache_reads:
            chunk.usage.prompt_tokens_details?.cached_tokens ?? 0,
        };
      }
      yield chunk;
    }
  }
}
