// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { LMRouterCoreConfigProvider } from "../utils/config.js";

export abstract class LMRouterAdapter<
  TInput,
  TInputOptions,
  TOutput,
  TOutputStreamChunk,
> {
  abstract sendRequest(
    provider: LMRouterCoreConfigProvider,
    request: TInput,
    options?: TInputOptions,
  ): Promise<TOutput>;

  abstract sendRequestStreaming(
    provider: LMRouterCoreConfigProvider,
    request: TInput,
    options?: TInputOptions,
  ): AsyncGenerator<TOutputStreamChunk>;
}
