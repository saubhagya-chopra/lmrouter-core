// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type {
  Response,
  ResponseCreateParamsBase,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";

import { LMRouterAdapter } from "../../../adapter.js";
import { OpenAIResponsesOpenAIAdapter } from "./openai.js";
import type { LMRouterCoreConfigProvider } from "../../../../utils/config.js";

export type OpenAIResponsesInputOptions = {
  maxTokens?: number;
};

export type OpenAIResponsesAdapter = LMRouterAdapter<
  ResponseCreateParamsBase,
  OpenAIResponsesInputOptions,
  Response,
  ResponseStreamEvent
>;

const adapters = {
  openai: OpenAIResponsesOpenAIAdapter,
};

export class OpenAIResponsesAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): OpenAIResponsesAdapter {
    if (provider.type === "openai") {
      return new adapters.openai();
    }
    throw new Error(`Unsupported provider: ${provider.type}`);
  }
}
