// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { LMRouterApiCallUsage } from "../types/billing.js";
import type { LMRouterConfigProvider } from "../types/config.js";

export abstract class LMRouterAdapter<
  TInput,
  TInputOptions,
  TOutput,
  TOutputStreamChunk,
> {
  usage?: LMRouterApiCallUsage;

  abstract sendRequest(
    provider: LMRouterConfigProvider,
    request: TInput,
    options?: TInputOptions,
  ): Promise<TOutput>;

  abstract sendRequestStreaming(
    provider: LMRouterConfigProvider,
    request: TInput,
    options?: TInputOptions,
  ): Promise<AsyncGenerator<TOutputStreamChunk>>;
}
