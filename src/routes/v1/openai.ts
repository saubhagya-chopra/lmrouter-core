// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";

import openaiV1Router from "./openai/v1.js";
import type { Context } from "../../types/hono.js";

const openaiRouter = new Hono<Context>();

openaiRouter.route("/v1", openaiV1Router);

export default openaiRouter;
