// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  ImageGenStreamEvent,
  ImageGenerateParamsBase,
  ImagesResponse,
} from "openai/resources/images";

import { LMRouterAdapter } from "../../../../adapter.js";
import { OpenAIImageGenerationOpenAIAdapter } from "./openai.js";
import type { LMRouterCoreConfigProvider } from "../../../../../utils/config.js";

export type OpenAIImageGenerationAdapter = LMRouterAdapter<
  ImageGenerateParamsBase,
  {},
  ImagesResponse,
  ImageGenStreamEvent
>;

const adapters = {
  openai: OpenAIImageGenerationOpenAIAdapter,
};

export class OpenAIImageGenerationAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): OpenAIImageGenerationAdapter {
    if (provider.type === "openai") {
      return new adapters.openai();
    }
    throw new Error(`Unsupported provider: ${provider.type}`);
  }
}
