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
import type { LMRouterCoreConfigProvider } from "../../../../../utils/config.js";

export class OpenAIImageEditOpenAIAdapter implements OpenAIImageEditAdapter {
  getClient(provider: LMRouterCoreConfigProvider): OpenAI {
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
    provider: LMRouterCoreConfigProvider,
    request: ImageEditParamsBase,
    options?: {},
  ): Promise<ImagesResponse> {
    const openai = this.getClient(provider);
    const image = await openai.images.edit(request);
    return image as ImagesResponse;
  }

  async *sendRequestStreaming(
    provider: LMRouterCoreConfigProvider,
    request: ImageEditParamsBase,
    options?: {},
  ): AsyncGenerator<ImageEditStreamEvent> {
    const openai = this.getClient(provider);
    const stream = await openai.images.edit(request);
    for await (const chunk of stream as Stream<ImageEditStreamEvent>) {
      yield chunk;
    }
  }
}
