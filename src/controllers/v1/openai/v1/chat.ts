import { Request, Response } from "express";
import OpenAI from "openai";

import { getConfig } from "../../../../utils/config.js";

export const createChatCompletion = async (req: Request, res: Response) => {
  const cfg = getConfig();
  const model = cfg.models[req.body.model];
  if (!model) {
    return res.status(404).json({
      error: {
        message: "Model not found",
      },
    });
  }

  let error: any = null;
  for (const provider of model.providers) {
    const providerCfg = cfg.providers[provider.provider];
    if (!providerCfg) {
      continue;
    }

    const openai = new OpenAI({
      baseURL: providerCfg.base_url,
      apiKey: providerCfg.api_key,
    });

    const reqBody = { ...req.body };
    reqBody.model = provider.model;

    try {
      const completion = await openai.chat.completions.create(reqBody);
      res.status(200).json(completion);
      return;
    } catch (e) {
      error = e;
      if (cfg.server.logging === "dev") {
        console.error(error);
      }
    }
  }

  if (error) {
    return res.status(error.status).json({
      error: error.error,
    });
  }

  return res.status(500).json({
    error: {
      message: "All providers failed to complete the request",
    },
  });
};
