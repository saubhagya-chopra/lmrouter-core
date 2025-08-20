// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import { Stream } from "openai/core/streaming";
import type {
  ImageGenStreamEvent,
  ImageGenerateParamsBase,
  ImagesResponse,
} from "openai/resources/images";

import type { OpenAIImageGenerationAdapter } from "./adapter.js";
import type { LMRouterConfigProvider } from "../../../../../utils/config.js";

export class OpenAIImageGenerationOpenAIAdapter
  implements OpenAIImageGenerationAdapter
{
  getClient(provider: LMRouterConfigProvider): OpenAI {
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
    provider: LMRouterConfigProvider,
    request: ImageGenerateParamsBase,
    options?: {},
  ): Promise<ImagesResponse> {
    const openai = this.getClient(provider);
    const image = await openai.images.generate(request);
    return image as ImagesResponse;
  }

  async *sendRequestStreaming(
    provider: LMRouterConfigProvider,
    request: ImageGenerateParamsBase,
    options?: {},
  ): AsyncGenerator<ImageGenStreamEvent> {
    const openai = this.getClient(provider);
    const stream = await openai.images.generate(request);
    yield* stream as Stream<ImageGenStreamEvent>;
  }
}
