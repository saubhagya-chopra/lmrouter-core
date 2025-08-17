// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import { Stream } from "openai/core/streaming";
import type {
  TranscriptionCreateParams,
  TranscriptionCreateResponse,
  TranscriptionStreamEvent,
} from "openai/resources/audio/transcriptions";

import type { OpenAIAudioTranscriptionAdapter } from "./adapter.js";
import type { LMRouterCoreConfigProvider } from "../../../../../utils/config.js";

export class OpenAIAudioTranscriptionOpenAIAdapter
  implements OpenAIAudioTranscriptionAdapter
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
    request: TranscriptionCreateParams,
    options?: {},
  ): Promise<TranscriptionCreateResponse | string> {
    const openai = this.getClient(provider);
    const transcription = await openai.audio.transcriptions.create(
      request as any,
    );
    return transcription as TranscriptionCreateResponse | string;
  }

  async *sendRequestStreaming(
    provider: LMRouterCoreConfigProvider,
    request: TranscriptionCreateParams,
    options?: {},
  ): AsyncGenerator<TranscriptionStreamEvent> {
    const openai = this.getClient(provider);
    const stream = (await openai.audio.transcriptions.create(
      request as any,
    )) as unknown as Stream<TranscriptionStreamEvent>;
    yield* stream;
  }
}
