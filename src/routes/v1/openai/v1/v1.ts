import { Router } from "express";

import { createChatCompletion } from "../../../../controllers/v1/openai/v1/chat.js";
import { createEmbeddings } from "../../../../controllers/v1/openai/v1/embeddings.js";
import {
  editImage,
  generateImage,
} from "../../../../controllers/v1/openai/v1/images.js";
import {
  getModel,
  listModels,
} from "../../../../controllers/v1/openai/v1/models.js";
import { auth } from "../../../../middlewares/auth.js";

const openaiV1Router = Router();

openaiV1Router.get("/models", listModels);
openaiV1Router.get("/models/*model", getModel);

openaiV1Router.post("/chat/completions", auth, createChatCompletion);

openaiV1Router.post("/images/generations", auth, generateImage);
openaiV1Router.post("/images/edits", auth, editImage);

openaiV1Router.post("/embeddings", auth, createEmbeddings);

export default openaiV1Router;
