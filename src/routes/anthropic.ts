// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Hono } from "hono";

import anthropicRouter from "./v1/anthropic.js";
import type { ContextEnv } from "../types/hono.js";

const rootAnthropicRouter = new Hono<ContextEnv>();

rootAnthropicRouter.route("/", anthropicRouter);

export default rootAnthropicRouter;
