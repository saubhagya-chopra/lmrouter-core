// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { requireAuth } from "../../middlewares/auth.js";
import { apiKey } from "../../models/billing.js";
import type {
  LMRouterApiKeyCreateParams,
  LMRouterApiKeyCreateResponse,
  LMRouterApiKeyDeleteResponse,
  LMRouterApiKeyListResponse,
  LMRouterApiKeyUpdateParams,
  LMRouterApiKeyUpdateResponse,
} from "../../types/api.js";
import type { AuthBetterAuth, ContextEnv } from "../../types/hono.js";
import {
  generateApiKey,
  getApiKeyPrefix,
  hashApiKey,
} from "../../utils/api-key.js";
import { getDb } from "../../utils/database.js";

const apiKeysRouter = new Hono<ContextEnv>();

apiKeysRouter.use(requireAuth("better-auth"));

apiKeysRouter.get("/", async (c) => {
  const auth = c.var.auth as AuthBetterAuth;
  const keys = await getDb(c)
    .select({
      id: apiKey.id,
      name: apiKey.name,
      key_prefix: apiKey.keyPrefix,
      created_at: apiKey.createdAt,
    })
    .from(apiKey)
    .where(
      and(
        eq(apiKey.ownerType, auth.ownerType),
        eq(apiKey.ownerId, auth.ownerId),
      ),
    );

  return c.json({
    keys: keys.map((key) => ({
      ...key,
      created_at: key.created_at.getTime(),
    })),
  } as LMRouterApiKeyListResponse);
});

apiKeysRouter.post("/", async (c) => {
  const { name } = (await c.req.json()) as LMRouterApiKeyCreateParams;
  if (typeof name !== "string") {
    return c.json({ error: { message: "Name is required" } }, 400);
  }

  const auth = c.var.auth as AuthBetterAuth;
  const key = generateApiKey();
  await getDb(c)
    .insert(apiKey)
    .values({
      ownerType: auth.ownerType,
      ownerId: auth.ownerId,
      name,
      keyHash: hashApiKey(key),
      keyPrefix: getApiKeyPrefix(key),
    });

  return c.json({
    key,
  } as LMRouterApiKeyCreateResponse);
});

apiKeysRouter.patch("/:id", async (c) => {
  const { id } = c.req.param();
  const { name } = (await c.req.json()) as LMRouterApiKeyUpdateParams;
  const auth = c.var.auth as AuthBetterAuth;
  const key = await getDb(c)
    .select()
    .from(apiKey)
    .where(
      and(
        eq(apiKey.id, id),
        eq(apiKey.ownerType, auth.ownerType),
        eq(apiKey.ownerId, auth.ownerId),
      ),
    );
  if (key.length === 0) {
    return c.json({ error: { message: "API key not found" } }, 404);
  }
  await getDb(c).update(apiKey).set({ name }).where(eq(apiKey.id, id));
  return c.json({
    message: "API key updated",
  } as LMRouterApiKeyUpdateResponse);
});

apiKeysRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const auth = c.var.auth as AuthBetterAuth;
  const key = await getDb(c)
    .select()
    .from(apiKey)
    .where(
      and(
        eq(apiKey.id, id),
        eq(apiKey.ownerType, auth.ownerType),
        eq(apiKey.ownerId, auth.ownerId),
      ),
    );
  if (key.length === 0) {
    return c.json({ error: { message: "API key not found" } }, 404);
  }
  await getDb(c).delete(apiKey).where(eq(apiKey.id, id));
  return c.json({
    message: "API key deleted",
  } as LMRouterApiKeyDeleteResponse);
});

export default apiKeysRouter;
