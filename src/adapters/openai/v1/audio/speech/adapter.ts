// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { SpeechCreateParams } from "openai/resources/audio/speech";

import { LMRouterAdapter } from "../../../../adapter.js";
import { OpenAIAudioTTsOpenAIAdapter } from "./openai.js";
import type { LMRouterCoreConfigProvider } from "../../../../../utils/config.js";

export type OpenAIAudioTTsAdapter = LMRouterAdapter<
  SpeechCreateParams,
  {},
  Response,
  never
>;

const adapters: Record<string, new () => OpenAIAudioTTsAdapter> = {
  openai: OpenAIAudioTTsOpenAIAdapter,
  openai_woresp: OpenAIAudioTTsOpenAIAdapter,
};

export class OpenAIAudioTTsAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): OpenAIAudioTTsAdapter {
    if (!Object.keys(adapters).includes(provider.type)) {
      throw new Error(`Unsupported provider: ${provider.type}`);
    }
    return new adapters[provider.type]!();
  }
}
