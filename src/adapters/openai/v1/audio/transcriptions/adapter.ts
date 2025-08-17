// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  TranscriptionCreateParams,
  TranscriptionCreateResponse,
  TranscriptionStreamEvent,
} from "openai/resources/audio/transcriptions";

import { LMRouterAdapter } from "../../../../adapter.js";
import { OpenAIAudioTranscriptionOpenAIAdapter } from "./openai.js";
import type { LMRouterCoreConfigProvider } from "../../../../../utils/config.js";

export type OpenAIAudioTranscriptionAdapter = LMRouterAdapter<
  TranscriptionCreateParams,
  {},
  TranscriptionCreateResponse | string,
  TranscriptionStreamEvent
>;

const adapters: Record<string, new () => OpenAIAudioTranscriptionAdapter> = {
  openai: OpenAIAudioTranscriptionOpenAIAdapter,
  openai_woresp: OpenAIAudioTranscriptionOpenAIAdapter,
};

export class OpenAIAudioTranscriptionAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): OpenAIAudioTranscriptionAdapter {
    if (!Object.keys(adapters).includes(provider.type)) {
      throw new Error(`Unsupported provider: ${provider.type}`);
    }
    return new adapters[provider.type]!();
  }
}
