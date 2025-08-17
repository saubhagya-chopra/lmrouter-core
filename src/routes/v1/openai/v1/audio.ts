// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type {
  TranscriptionCreateParams,
  TranscriptionStreamEvent,
} from "openai/resources/audio/transcriptions";
import type { SpeechCreateParams } from "openai/resources/audio/speech";

import { OpenAIAudioTranscriptionAdapterFactory } from "../../../../adapters/openai/v1/audio/transcriptions/adapter.js";
import { OpenAIAudioTTsAdapterFactory } from "../../../../adapters/openai/v1/audio/speech/adapter.js";
import { auth } from "../../../../middlewares/auth.js";
import { parseModel } from "../../../../middlewares/model.js";
import type { ContextEnv } from "../../../../types/hono.js";
import { iterateModelProviders } from "../../../../utils/utils.js";

const audioRouter = new Hono<ContextEnv>();

audioRouter.use(auth, parseModel);

audioRouter.post("/transcriptions", async (c) => {
  const formData = await c.req.formData();
  const body: Record<string, any> = {};
  for (const [key, value] of formData.entries()) {
    body[key] = value;
  }

  return await iterateModelProviders(c, async (modelName, provider) => {
    const reqBody = { ...body } as TranscriptionCreateParams;
    reqBody.model = modelName;

    const adapter = OpenAIAudioTranscriptionAdapterFactory.getAdapter(provider);
    if ((reqBody as any).stream === true) {
      const s = adapter.sendRequestStreaming(provider, reqBody);
      return streamSSE(c, async (stream) => {
        for await (const chunk of s) {
          await stream.writeSSE({
            event: chunk.type,
            data: JSON.stringify(chunk),
          });
        }
      });
    }

    const transcription = await adapter.sendRequest(provider, reqBody);
    if (typeof transcription === "string") {
      return c.text(transcription);
    }
    return c.json(transcription);
  });
});

audioRouter.post("/speech", async (c) => {
  const body = await c.req.json();
  return await iterateModelProviders(c, async (modelName, provider) => {
    const reqBody = { ...body } as SpeechCreateParams;
    reqBody.model = modelName;

    const adapter = OpenAIAudioTTsAdapterFactory.getAdapter(provider);
    const res = await adapter.sendRequest(provider, reqBody);
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/octet-stream",
      },
    });
  });
});

export default audioRouter;
