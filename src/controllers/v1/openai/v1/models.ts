import { Request, Response } from "express";

import { getConfig } from "../../../../utils/config.js";

export const getModel = (req: Request, res: Response) => {
  const cfg = getConfig();
  const modelName = (req.params.model as unknown as string[]).join("/");
  const model = cfg.models[modelName];
  if (!model) {
    return res.status(404).json({
      error: {
        message: "Model not found",
      },
    });
  }

  res.status(200).json({
    id: modelName,
    object: "model",
    created: 0,
    owned_by: model.providers.map((provider) => provider.provider).join(", "),
  });
};

export const listModels = (req: Request, res: Response) => {
  const cfg = getConfig();
  const models = Object.entries(cfg.models).map(([name, model]) => {
    return {
      id: name,
      object: "model",
      created: 0,
      owned_by: model.providers.map((provider) => provider.provider).join(", "),
    };
  });

  res.status(200).json({
    object: "list",
    data: models,
  });
};
