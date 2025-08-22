// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { LMRouterConfigModel } from "../utils/config.js";

export type ContextEnv = {
  Variables: {
    byok?: string;
    model?: LMRouterConfigModel;
  };
  Bindings: {
    LMROUTER_CONFIG?: string;
  };
};
