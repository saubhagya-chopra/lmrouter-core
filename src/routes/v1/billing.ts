// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { requireAuth } from "../../middlewares/auth.js";
import { balance as balanceModel } from "../../models/billing.js";
import type { AuthBetterAuth, ContextEnv } from "../../types/hono.js";
import { getDb } from "../../utils/database.js";
import { getStripe } from "../../utils/stripe.js";

const billingRouter = new Hono<ContextEnv>();

billingRouter.use(requireAuth("better-auth"));

billingRouter.get("/balance", async (c) => {
  const auth = c.var.auth as AuthBetterAuth;
  const balance = await getDb(c)
    .select({ balance: balanceModel.balance })
    .from(balanceModel)
    .where(
      and(
        eq(balanceModel.ownerType, auth.ownerType),
        eq(balanceModel.ownerId, auth.ownerId),
      ),
    );
  if (balance.length === 0) {
    return c.json({ error: { message: "Internal server error" } }, 500);
  }
  return c.json({ balance: balance[0].balance });
});

billingRouter.post("/checkout", async (c) => {
  const { amount, success_url } = await c.req.json();
  if (typeof amount !== "number" || typeof success_url !== "string") {
    return c.json({ error: { message: "Bad request" } }, 400);
  }

  const session = await getStripe(c).createCheckoutSession(
    c,
    amount,
    success_url,
  );

  return c.json({ session_url: session.url });
});

export default billingRouter;
