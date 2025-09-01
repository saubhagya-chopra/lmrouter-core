// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  TranslationCreateParams,
  TranslationCreateResponse,
} from "openai/resources/audio/translations";

import { LMRouterAdapter } from "../../../../adapter.js";
import { OpenAITranslationsOpenAIAdapter } from "./openai.js";
import type { LMRouterConfigProvider } from "../../../../../types/config.js";

export type OpenAITranslationsAdapter = LMRouterAdapter<
  TranslationCreateParams,
  {},
  TranslationCreateResponse | string,
  never
>;

const adapters: Record<string, new () => OpenAITranslationsAdapter> = {
  others: OpenAITranslationsOpenAIAdapter,
};

export class OpenAITranslationsAdapterFactory {
  static getAdapter(
    provider: LMRouterConfigProvider,
  ): OpenAITranslationsAdapter {
    if (!Object.keys(adapters).includes(provider.type)) {
      return new adapters.others();
    }
    return new adapters[provider.type]();
  }
}
