// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import Anthropic from "@anthropic-ai/sdk";
import { Stream as AnthropicStream } from "@anthropic-ai/sdk/core/streaming";
import type { RawMessageStreamEvent } from "@anthropic-ai/sdk/resources";
import type { MessageCreateParamsBase } from "@anthropic-ai/sdk/resources/messages";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import OpenAI from "openai";
import { Stream as OpenAIStream } from "openai/core/streaming";
import type {
  ChatCompletion,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";

import { chatCompletionAdapters } from "../../../../adapters/chat.js";
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

    if (provider.type !== "anthropic") {
      const openai = new OpenAI({
        baseURL: provider.base_url,
        apiKey: provider.api_key,
        defaultHeaders: {
          "HTTP-Referer": "https://lmrouter.com/",
          "X-Title": "LMRouter",
        },
      });

      const completion = await openai.chat.completions.create(
        chatCompletionAdapters.anthropic.requestToOpenai(reqBody),
      );
      if (reqBody.stream !== true) {
        return c.json(
          chatCompletionAdapters.openai.responseToAnthropic(
            completion as ChatCompletion,
          ),
        );
      }
      return streamSSE(c, async (stream) => {
        for await (const chunk of chatCompletionAdapters.openai.streamToAnthropic(
          completion as OpenAIStream<ChatCompletionChunk>,
        )) {
          await stream.writeSSE({
            event: chunk.type,
            data: JSON.stringify(chunk),
          });
        }
      });
    }

    const anthropic = new Anthropic({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
      timeout: 3600000,
    });

    const completion = await anthropic.messages.create(reqBody);

    if (reqBody.stream !== true) {
      return c.json(completion);
    }

    return streamSSE(c, async (stream) => {
      for await (const chunk of completion as AnthropicStream<RawMessageStreamEvent>) {
        await stream.writeSSE({
          event: chunk.type,
          data: JSON.stringify(chunk),
        });
      }
    });
  });
});

export default messagesRouter;
