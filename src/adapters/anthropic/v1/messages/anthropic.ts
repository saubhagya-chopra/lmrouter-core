// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import Anthropic from "@anthropic-ai/sdk";
import { Stream } from "@anthropic-ai/sdk/core/streaming";
import type {
  Message,
  MessageCreateParamsBase,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";

import type { AnthropicMessagesAdapter } from "./adapter.js";
import type { LMRouterCoreConfigProvider } from "../../../../utils/config.js";

export class AnthropicMessagesAnthropicAdapter
  implements AnthropicMessagesAdapter
{
  getClient(provider: LMRouterCoreConfigProvider): Anthropic {
    return new Anthropic({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
      timeout: 3600000,
    });
  }

  async sendRequest(
    provider: LMRouterCoreConfigProvider,
    request: MessageCreateParamsBase,
    options?: {},
  ): Promise<Message> {
    const anthropic = this.getClient(provider);
    const message = await anthropic.messages.create(request);
    return message as Message;
  }

  async *sendRequestStreaming(
    provider: LMRouterCoreConfigProvider,
    request: MessageCreateParamsBase,
    options?: {},
  ): AsyncGenerator<RawMessageStreamEvent> {
    const anthropic = this.getClient(provider);
    const stream = await anthropic.messages.create(request);
    yield* stream as Stream<RawMessageStreamEvent>;
  }
}
