// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";

import { OpenAIChatCompletionAdapterFactory } from "../../../../adapters/openai/v1/chat/adapter.js";
import { auth } from "../../../../middlewares/auth.js";
import type { Context } from "../../../../types/hono.js";
import { getModel, iterateModelProviders } from "../../../../utils/utils.js";

const chatRouter = new Hono<Context>();

chatRouter.use(auth);

chatRouter.post("/completions", async (c) => {
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
    const reqBody = { ...body } as ChatCompletionCreateParamsBase;
    reqBody.model = modelName;
    if (reqBody.stream === true) {
      reqBody.stream_options = {
        include_usage: true,
      };
    }

    const adapter = OpenAIChatCompletionAdapterFactory.getAdapter(provider);
    if (reqBody.stream !== true) {
      const completion = await adapter.sendRequest(provider, reqBody, {
        maxTokens: model.max_tokens,
      });
      return c.json(completion);
    }

    const s = adapter.sendRequestStreaming(provider, reqBody, {
      maxTokens: model.max_tokens,
    });
    return streamSSE(c, async (stream) => {
      for await (const chunk of s) {
        await stream.writeSSE({
          data: JSON.stringify(chunk),
        });
      }
      await stream.writeSSE({
        data: "[DONE]",
      });
    });
  });
});

export default chatRouter;
