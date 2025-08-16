// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { createMiddleware } from "hono/factory";

import type { ContextEnv } from "../types/hono.js";
import { getConfig } from "../utils/config.js";

export const auth = createMiddleware<ContextEnv>(async (c, next) => {
  const apiKey =
    c.req.header("Authorization")?.split(" ")[1] ?? c.req.header("x-api-key");
  if (!apiKey) {
    return c.json(
      {
        error: {
          message: "API key is required",
        },
      },
      401,
    );
  }

  if (apiKey.startsWith("BYOK:")) {
    c.set("byok", apiKey.slice(5));
  } else {
    const cfg = getConfig(c);
    if (!cfg.access_keys.includes(apiKey)) {
      return c.json(
        {
          error: {
            message: "Invalid API key",
          },
        },
        401,
      );
    }
  }

  await next();
});
