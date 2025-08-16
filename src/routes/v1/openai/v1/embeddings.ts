// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";
import type { EmbeddingCreateParams } from "openai/resources";

import { OpenAIEmbeddingsAdapterFactory } from "../../../../adapters/openai/v1/embeddings/adapter.js";
import { auth } from "../../../../middlewares/auth.js";
import type { ContextEnv } from "../../../../types/hono.js";
import { getModel, iterateModelProviders } from "../../../../utils/utils.js";

const embeddingsRouter = new Hono<ContextEnv>();

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
    const reqBody = { ...body } as EmbeddingCreateParams;
    reqBody.model = modelName;

    const adapter = OpenAIEmbeddingsAdapterFactory.getAdapter(provider);
    const embeddings = await adapter.sendRequest(provider, reqBody);
    return c.json(embeddings);
  });
});

export default embeddingsRouter;
