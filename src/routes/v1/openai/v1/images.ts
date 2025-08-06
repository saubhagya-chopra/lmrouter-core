// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";
import OpenAI from "openai";
import type {
  ImageEditParamsNonStreaming,
  ImageGenerateParamsNonStreaming,
} from "openai/resources";

import { auth } from "../../../../middlewares/auth.js";
import type { Context } from "../../../../types/hono.js";
import { getModel, iterateModelProviders } from "../../../../utils/utils.js";

const imagesRouter = new Hono<Context>();

imagesRouter.use(auth);

imagesRouter.post("/generations", async (c) => {
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
    const reqBody = { ...body } as ImageGenerateParamsNonStreaming;
    reqBody.model = modelName;
    const image = await openai.images.generate(reqBody);
    return c.json(image);
  });
});

imagesRouter.post("/edits", async (c) => {
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
    const reqBody = { ...body } as ImageEditParamsNonStreaming;
    reqBody.model = modelName;
    const image = await openai.images.edit(reqBody);
    return c.json(image);
  });
});

export default imagesRouter;
