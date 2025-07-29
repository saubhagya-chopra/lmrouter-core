import { Router } from "express";

import openaiV1Router from "./v1/v1.js";

const openaiRouter = Router();

openaiRouter.use("/v1", openaiV1Router);

export default openaiRouter;
