// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import OpenAI from "openai";
import { Stream as OpenAIStream } from "openai/core/streaming";
import type {
  ResponseCreateParamsBase,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";

import { auth } from "../../../../middlewares/auth.js";
import type { Context } from "../../../../types/hono.js";
import { getModel, iterateModelProviders } from "../../../../utils/utils.js";

const responsesRouter = new Hono<Context>();

responsesRouter.use(auth);

responsesRouter.post("/", async (c) => {
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

    const reqBody = { ...body } as ResponseCreateParamsBase;
    reqBody.model = modelName;

    const response = await openai.responses.create(reqBody);
    if (reqBody.stream !== true) {
      return c.json(response);
    }

    return streamSSE(c, async (stream) => {
      for await (const chunk of response as OpenAIStream<ResponseStreamEvent>) {
        await stream.writeSSE({
          event: chunk.type,
          data: JSON.stringify(chunk),
        });
      }
    });
  });
});

export default responsesRouter;
