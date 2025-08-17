// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import type { SpeechCreateParams } from "openai/resources/audio/speech";

import type { OpenAIAudioTTSAdapter } from "./adapter.js";
import type { LMRouterCoreConfigProvider } from "../../../../../utils/config.js";

export class OpenAIAudioTTSOpenAIAdapter implements OpenAIAudioTTSAdapter {
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
    request: SpeechCreateParams,
    options?: {},
  ): Promise<Response> {
    const openai = this.getClient(provider);
    const res = await openai.audio.speech.create(request);
    return res;
  }

  async *sendRequestStreaming(
    provider: LMRouterCoreConfigProvider,
    request: SpeechCreateParams,
    options?: {},
  ): AsyncGenerator<never> {
    throw new Error("Streaming not supported for TTS");
  }
}
