// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { SpeechCreateParams } from "openai/resources/audio/speech";

import { LMRouterAdapter } from "../../../../adapter.js";
import { OpenAIAudioTTSOpenAIAdapter } from "./openai.js";
import type { LMRouterCoreConfigProvider } from "../../../../../utils/config.js";

export type OpenAIAudioTTSAdapter = LMRouterAdapter<
  SpeechCreateParams,
  {},
  Response,
  never
>;

const adapters: Record<string, new () => OpenAIAudioTTSAdapter> = {
  openai: OpenAIAudioTTSOpenAIAdapter,
  openai_woresp: OpenAIAudioTTSOpenAIAdapter,
};

export class OpenAIAudioTTSAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): OpenAIAudioTTSAdapter {
    if (!Object.keys(adapters).includes(provider.type)) {
      throw new Error(`Unsupported provider: ${provider.type}`);
    }
    return new adapters[provider.type]!();
  }
}
