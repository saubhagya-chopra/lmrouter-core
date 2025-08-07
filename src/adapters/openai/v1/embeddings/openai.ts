// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import type {
  CreateEmbeddingResponse,
  EmbeddingCreateParams,
} from "openai/resources/embeddings";

import type { OpenAIEmbeddingsAdapter } from "./adapter.js";
import type { LMRouterCoreConfigProvider } from "../../../../utils/config.js";

export class OpenAIEmbeddingsOpenAIAdapter implements OpenAIEmbeddingsAdapter {
  async sendRequest(
    provider: LMRouterCoreConfigProvider,
    request: EmbeddingCreateParams,
    options?: {},
  ): Promise<CreateEmbeddingResponse> {
    const openai = new OpenAI({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
      defaultHeaders: {
        "HTTP-Referer": "https://lmrouter.com/",
        "X-Title": "LMRouter",
      },
    });
    const embeddings = await openai.embeddings.create(request);
    return embeddings;
  }

  async *sendRequestStreaming(
    provider: LMRouterCoreConfigProvider,
    request: EmbeddingCreateParams,
    options?: {},
  ): AsyncGenerator<never> {
    throw new Error("Embeddings API does not support streaming");
  }
}
