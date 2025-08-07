// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  Message,
  MessageCreateParamsBase,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";

import { LMRouterAdapter } from "../../../adapter.js";
import { AnthropicMessagesAnthropicAdapter } from "./anthropic.js";
import { AnthropicMessagesOthersAdapter } from "./others.js";
import type { LMRouterCoreConfigProvider } from "../../../../utils/config.js";

export type AnthropicMessagesAdapter = LMRouterAdapter<
  MessageCreateParamsBase,
  {},
  Message,
  RawMessageStreamEvent
>;

const adapters = {
  anthropic: AnthropicMessagesAnthropicAdapter,
  others: AnthropicMessagesOthersAdapter,
};

export class AnthropicMessagesAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): AnthropicMessagesAdapter {
    if (provider.type === "anthropic") {
      return new adapters.anthropic();
    }
    return new adapters.others();
  }
}
