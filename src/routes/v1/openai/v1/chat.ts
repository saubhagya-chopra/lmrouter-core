// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import Anthropic from "@anthropic-ai/sdk";
import { Stream as AnthropicStream } from "@anthropic-ai/sdk/core/streaming";
import type {
  Message,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import OpenAI from "openai";
import { Stream as OpenAIStream } from "openai/core/streaming";
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsBase,
} from "openai/resources/chat/completions";

import { chatCompletionAdapters } from "../../../../adapters/chat.js";
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

    if (provider.type !== "anthropic") {
      const openai = new OpenAI({
        baseURL: provider.base_url,
        apiKey: provider.api_key,
        defaultHeaders: {
          "HTTP-Referer": "https://lmrouter.com/",
          "X-Title": "LMRouter",
        },
      });

      const completion = await openai.chat.completions.create(reqBody);
      if (reqBody.stream !== true) {
        return c.json(completion);
      }

      return streamSSE(c, async (stream) => {
        for await (const chunk of completion as OpenAIStream<ChatCompletionChunk>) {
          await stream.writeSSE({
            data: JSON.stringify(chunk),
          });
        }
        await stream.writeSSE({
          data: "[DONE]",
        });
      });
    }

    const anthropic = new Anthropic({
      baseURL: provider.base_url,
      apiKey: provider.api_key,
      timeout: 3600000,
    });

    const completion = await anthropic.messages.create(
      chatCompletionAdapters.openai.requestToAnthropic(
        reqBody,
        model.max_tokens,
      ),
    );

    if (reqBody.stream !== true) {
      return c.json(
        chatCompletionAdapters.anthropic.responseToOpenai(
          completion as Message,
        ),
      );
    }

    return streamSSE(c, async (stream) => {
      for await (const chunk of chatCompletionAdapters.anthropic.streamToOpenai(
        completion as AnthropicStream<RawMessageStreamEvent>,
      )) {
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
