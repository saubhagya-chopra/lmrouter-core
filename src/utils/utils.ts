// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { Context } from "hono";

import {
  getConfig,
  type LMRouterCoreConfigModel,
  type LMRouterCoreConfigProvider,
} from "./config.js";

export const getUptime = () => {
  const seconds = Math.floor(process.uptime());
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const uptime = `${days} days, ${hours % 24} hours, ${minutes % 60} minutes, ${seconds % 60} seconds`;
  return uptime;
};

export const getModel = (
  modelName: string,
  c: Context,
): LMRouterCoreConfigModel | null => {
  const cfg = getConfig(c);

  const colonIndex = modelName.indexOf(":");
  if (colonIndex !== -1) {
    const provider = modelName.slice(0, colonIndex);
    const providerCfg = cfg.providers[provider];
    if (providerCfg) {
      return {
        providers: [
          {
            provider,
            model: modelName.slice(colonIndex + 1),
          },
        ],
      };
    }
  }

  const model = cfg.models[modelName];
  if (model) {
    return model;
  }
  if (!cfg.models["*"]) {
    return null;
  }
  return {
    providers: cfg.models["*"].providers.map((provider) => ({
      provider: provider.provider,
      model: modelName,
    })),
  };
};

export const iterateModelProviders = async (
  model: LMRouterCoreConfigModel,
  c: Context,
  cb: (modelName: string, provider: LMRouterCoreConfigProvider) => Promise<any>,
): Promise<any> => {
  const cfg = getConfig(c);
  let error: any = null;

  for (const provider of model.providers) {
    const providerCfg = cfg.providers[provider.provider];
    if (!providerCfg) {
      continue;
    }

    const hydratedProviderCfg = { ...providerCfg };
    hydratedProviderCfg.api_key = c.var.byok ?? providerCfg.api_key;

    try {
      return await cb(provider.model, hydratedProviderCfg);
    } catch (e) {
      error = e;
      if (cfg.server.logging === "dev") {
        console.error(e);
      }
    }
  }

  if (error) {
    return c.json(
      {
        error: error.error,
      },
      error.status || 500,
    );
  }

  return c.json(
    {
      error: {
        message: "All providers failed to complete the request",
      },
    },
    500,
  );
};
