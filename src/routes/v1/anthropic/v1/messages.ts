// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { MessageCreateParamsBase } from "@anthropic-ai/sdk/resources/messages";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { AnthropicMessagesAdapterFactory } from "../../../../adapters/anthropic/v1/messages/adapter.js";
import { auth } from "../../../../middlewares/auth.js";
import type { Context } from "../../../../types/hono.js";
import { getModel, iterateModelProviders } from "../../../../utils/utils.js";

const messagesRouter = new Hono<Context>();

messagesRouter.use(auth);

messagesRouter.post("/", async (c) => {
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
    const reqBody = { ...body } as MessageCreateParamsBase;
    reqBody.model = modelName;

    const adapter = AnthropicMessagesAdapterFactory.getAdapter(provider);
    if (reqBody.stream !== true) {
      const completion = await adapter.sendRequest(provider, reqBody);
      return c.json(completion);
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

export default messagesRouter;
