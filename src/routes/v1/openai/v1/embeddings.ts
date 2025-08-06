// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";
import OpenAI from "openai";
import type { EmbeddingCreateParams } from "openai/resources";

import { auth } from "../../../../middlewares/auth.js";
import type { Context } from "../../../../types/hono.js";
import { getModel, iterateModelProviders } from "../../../../utils/utils.js";

const embeddingsRouter = new Hono<Context>();

embeddingsRouter.use(auth);

embeddingsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const model = getModel(body.model, c);
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

  return await iterateModelProviders(model, c, async (modelName, provider) => {
    const openai = new OpenAI({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
    });
    const reqBody = { ...body } as EmbeddingCreateParams;
    reqBody.model = modelName;
    const embedding = await openai.embeddings.create(reqBody);
    return c.json(embedding);
  });
});

export default embeddingsRouter;
