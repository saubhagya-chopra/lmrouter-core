// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  CreateEmbeddingResponse,
  EmbeddingCreateParams,
} from "openai/resources/embeddings";

import { LMRouterAdapter } from "../../../adapter.js";
import { OpenAIEmbeddingsOpenAIAdapter } from "./openai.js";
import type { LMRouterCoreConfigProvider } from "../../../../utils/config.js";

export type OpenAIEmbeddingsAdapter = LMRouterAdapter<
  EmbeddingCreateParams,
  {},
  CreateEmbeddingResponse,
  never
>;

const adapters = {
  openai: OpenAIEmbeddingsOpenAIAdapter,
};

export class OpenAIEmbeddingsAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): OpenAIEmbeddingsAdapter {
    if (provider.type === "openai") {
      return new adapters.openai();
    }
    throw new Error(`Unsupported provider: ${provider.type}`);
  }
}
