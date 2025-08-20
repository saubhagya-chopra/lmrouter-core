// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import OpenAI from "openai";
import { Stream } from "openai/core/streaming";
import type {
  ImageEditParamsBase,
  ImageEditStreamEvent,
  ImagesResponse,
} from "openai/resources/images";

import type { OpenAIImageEditAdapter } from "./adapter.js";
import type { LMRouterConfigProvider } from "../../../../../utils/config.js";

export class OpenAIImageEditOpenAIAdapter implements OpenAIImageEditAdapter {
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
    request: ImageEditParamsBase,
    options?: {},
  ): Promise<ImagesResponse> {
    const openai = this.getClient(provider);
    const image = await openai.images.edit(request);
    return image as ImagesResponse;
  }

  async *sendRequestStreaming(
    provider: LMRouterConfigProvider,
    request: ImageEditParamsBase,
    options?: {},
  ): AsyncGenerator<ImageEditStreamEvent> {
    const openai = this.getClient(provider);
    const stream = await openai.images.edit(request);
    yield* stream as Stream<ImageEditStreamEvent>;
  }
}
