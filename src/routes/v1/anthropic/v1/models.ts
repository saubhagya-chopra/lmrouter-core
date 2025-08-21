// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";

import type { ContextEnv } from "../../../../types/hono.js";
import { getConfig } from "../../../../utils/config.js";

const modelsRouter = new Hono<ContextEnv>();

modelsRouter.get("/:model{.+}", (c) => {
  const cfg = getConfig(c);
  const modelName = c.req.param("model");
  const model = cfg.models[modelName];
  if (!model) {
    return c.json(
      {
        error: {
          message: "Model not found",
        },
      },
      404,
    );
  }

  return c.json({
    id: modelName,
    type: "model",
    display_name: model.name ?? modelName,
    created_at: model.created
      ? new Date(model.created).toISOString()
      : "1970-01-01T00:00:00Z",
  });
});

modelsRouter.get("/", (c) => {
  const cfg = getConfig(c);
  const models = Object.entries(cfg.models).map(([name, model]) => {
    return {
      id: name,
      type: "model",
      display_name: model.name ?? name,
      created_at: model.created
        ? new Date(model.created).toISOString()
        : "1970-01-01T00:00:00Z",
    };
  });

  return c.json({
    data: models,
    first_id: models.length > 0 ? models[0].id : null,
    has_more: false,
    last_id: models.length > 0 ? models[models.length - 1].id : null,
  });
});

export default modelsRouter;
