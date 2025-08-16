// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";

import anthropicV1Router from "./anthropic/v1.js";
import type { ContextEnv } from "../../types/hono.js";

const anthropicRouter = new Hono<ContextEnv>();

anthropicRouter.route("/v1", anthropicV1Router);

export default anthropicRouter;
