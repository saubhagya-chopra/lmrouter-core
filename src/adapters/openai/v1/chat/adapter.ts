import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsBase,
} from "openai/resources/chat/completions";

import { LMRouterAdapter } from "../../../adapter.js";
import { OpenAIChatCompletionAnthropicAdapter } from "./anthropic.js";
import { OpenAIChatCompletionOpenAIAdapter } from "./openai.js";
import type { LMRouterCoreConfigProvider } from "../../../../utils/config.js";

export type OpenAIChatCompletionInputOptions = {
  maxTokens?: number;
};

export type OpenAIChatCompletionAdapter = LMRouterAdapter<
  ChatCompletionCreateParamsBase,
  OpenAIChatCompletionInputOptions,
  ChatCompletion,
  ChatCompletionChunk
>;

const adapters = {
  anthropic: OpenAIChatCompletionAnthropicAdapter,
  openai: OpenAIChatCompletionOpenAIAdapter,
};

export class OpenAIChatCompletionAdapterFactory {
  static getAdapter(
    provider: LMRouterCoreConfigProvider,
  ): OpenAIChatCompletionAdapter {
    return new adapters[provider.type]();
  }
}
