// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import fs from "fs";

import type { Context } from "hono";
import yaml from "yaml";

export interface LMRouterConfigServer {
  host: string;
  port: number;
  logging: string;
}

export type LMRouterConfigProviderType =
  | "openai"
  | "openai_woresp"
  | "anthropic"
  | "fireworks"
  | "google";

export interface LMRouterConfigProvider {
  type: LMRouterConfigProviderType;
  base_url?: string;
  api_key: string;
}

export interface LMRouterConfigModelProvider {
  provider: string;
  model: string;
}

export interface LMRouterConfigModel {
  max_tokens?: number;
  providers: LMRouterConfigModelProvider[];
}

export interface LMRouterConfig {
  server: LMRouterConfigServer;
  access_keys: string[];
  providers: Record<string, LMRouterConfigProvider>;
  models: Record<string, LMRouterConfigModel>;
}

let configCache: LMRouterConfig | null = null;

export const getConfig = (c?: Context): LMRouterConfig => {
  if (configCache) {
    return configCache;
  }

  if (c?.env.CONFIG) {
    configCache = yaml.parse(
      Buffer.from(c.env.CONFIG, "base64").toString("utf8"),
    ) as LMRouterConfig;
    return configCache;
  }

  if (process.argv.length < 3) {
    console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <config-file>`);
    process.exit(1);
  }

  configCache = yaml.parse(
    fs.readFileSync(process.argv[2], "utf8"),
  ) as LMRouterConfig;
  return configCache;
};
