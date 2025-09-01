// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { Session, User } from "better-auth";

import type {
  LMRouterConfigModel,
  LMRouterConfigModelProvider,
  LMRouterConfigProvider,
} from "./config.js";

export interface LMRouterSessionResponse {
  session: Session;
  user: User;
}

export interface LMRouterApiKeyListResponse {
  keys: {
    id: string;
    name: string;
    key_prefix: string;
    created_at: number;
  }[];
}

export interface LMRouterApiKeyCreateParams {
  name: string;
}

export interface LMRouterApiKeyCreateResponse {
  key: string;
}

export interface LMRouterApiKeyUpdateParams {
  name?: string;
}

export interface LMRouterApiKeyUpdateResponse {
  message: string;
}

export interface LMRouterApiKeyDeleteResponse {
  message: string;
}

export interface LMRouterBalanceResponse {
  balance: string;
}

export interface LMRouterCheckoutParams {
  amount: number;
  success_url: string;
}

export interface LMRouterCheckoutResponse {
  session_url: string;
}

export type LMRouterModelGetResponse = Omit<
  LMRouterConfigModel,
  "providers"
> & {
  id: string;
  providers: (Omit<LMRouterConfigModelProvider, "provider"> & {
    provider: Omit<LMRouterConfigProvider, "api_key"> & {
      id: string;
    };
  })[];
};

export interface LMRouterModelListResponse {
  models: LMRouterModelGetResponse[];
}
