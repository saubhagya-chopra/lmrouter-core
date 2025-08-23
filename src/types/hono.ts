// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { Session, User } from "better-auth";

import type { LMRouterConfigModel } from "../utils/config.js";

export type AuthType = "better-auth" | "api-key" | "access-key" | "byok";

export interface AuthBetterAuth {
  type: "better-auth";
  user: User;
  session: Session;
}

export interface AuthApiKey {
  type: "api-key";
  apiKey: string;
  user: User;
  session: Session;
}

export interface AuthAccessKey {
  type: "access-key";
  accessKey: string;
}

export interface AuthByok {
  type: "byok";
  byok: string;
}

export type ContextEnv = {
  Variables: {
    auth?: AuthBetterAuth | AuthApiKey | AuthAccessKey | AuthByok;
    model?: LMRouterConfigModel;
  };
  Bindings: {
    LMROUTER_CONFIG?: string;
  };
};
