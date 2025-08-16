// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type {
  ImageEditParamsBase,
  ImageGenerateParamsBase,
} from "openai/resources/images";

import { OpenAIImageEditAdapterFactory } from "../../../../adapters/openai/v1/images/edits/adapter.js";
import { OpenAIImageGenerationAdapterFactory } from "../../../../adapters/openai/v1/images/generations/adapter.js";
import { auth } from "../../../../middlewares/auth.js";
import type { ContextEnv } from "../../../../types/hono.js";
import { getModel, iterateModelProviders } from "../../../../utils/utils.js";

const imagesRouter = new Hono<ContextEnv>();

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
    const reqBody = { ...body } as ImageGenerateParamsBase;
    reqBody.model = modelName;

    const adapter = OpenAIImageGenerationAdapterFactory.getAdapter(provider);
    if (reqBody.stream !== true) {
      const image = await adapter.sendRequest(provider, reqBody);
      return c.json(image);
    }

    const s = adapter.sendRequestStreaming(provider, reqBody);
    return streamSSE(c, async (stream) => {
      for await (const chunk of s) {
        await stream.writeSSE({
          event: chunk.type,
          data: JSON.stringify(chunk),
        });
      }
    });
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
    const reqBody = { ...body } as ImageEditParamsBase;
    reqBody.model = modelName;

    const adapter = OpenAIImageEditAdapterFactory.getAdapter(provider);
    if (reqBody.stream !== true) {
      const image = await adapter.sendRequest(provider, reqBody);
      return c.json(image);
    }

    const s = adapter.sendRequestStreaming(provider, reqBody);
    return streamSSE(c, async (stream) => {
      for await (const chunk of s) {
        await stream.writeSSE({
          event: chunk.type,
          data: JSON.stringify(chunk),
        });
      }
    });
  });
});

export default imagesRouter;
