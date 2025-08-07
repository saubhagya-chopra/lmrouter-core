// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  ImageEditParamsBase,
  ImageEditStreamEvent,
  ImagesResponse,
} from "openai/resources/images";

import { LMRouterAdapter } from "../../../../adapter.js";
import { OpenAIImageEditOpenAIAdapter } from "./openai.js";
import type { LMRouterCoreConfigProvider } from "../../../../../utils/config.js";

export type OpenAIImageEditAdapter = LMRouterAdapter<
  ImageEditParamsBase,
  {},
  ImagesResponse,
  ImageEditStreamEvent
>;

const adapters = {
  openai: OpenAIImageEditOpenAIAdapter,
};

export class OpenAIImageEditAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): OpenAIImageEditAdapter {
    if (provider.type === "openai") {
      return new adapters.openai();
    }
    throw new Error(`Unsupported provider: ${provider.type}`);
  }
}
