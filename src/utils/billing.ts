// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { Decimal } from "decimal.js";
import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import jsonLogic from "json-logic-js";

import {
  getConfig,
  type LMRouterConfigModelProviderPricing,
} from "./config.js";
import { getDb } from "./database.js";
import { balance, ledger, type LedgerMetadata } from "../models/billing.js";
import type { ContextEnv } from "../types/hono.js";

export interface LMRouterApiCallUsage {
  service_tier?: string;
  input?: number;
  input_image?: number;
  input_audio?: number;
  output?: number;
  image?: number;
  image_quality?: string;
  image_size?: string;
  web_search?: number;
  code_interpreter?: number;
  request?: number;
  input_cache_reads?: number;
  input_cache_writes?: number;
}

export const calculateCost = (
  usage?: LMRouterApiCallUsage,
  pricing?: LMRouterConfigModelProviderPricing,
): Decimal => {
  if (!usage || !pricing) {
    return new Decimal(0);
  }

  if (pricing.type === "fixed") {
    let cost = new Decimal(0);
    cost = cost.plus(
      new Decimal(usage.input ?? 0).mul(pricing.input ?? 0).dividedBy(1000000),
    );
    cost = cost.plus(
      new Decimal(usage.input_audio ?? 0)
        .mul(pricing.input_audio ?? 0)
        .dividedBy(1000000),
    );
    cost = cost.plus(
      new Decimal(usage.output ?? 0)
        .mul(pricing.output ?? 0)
        .dividedBy(1000000),
    );
    cost = cost.plus(new Decimal(usage.image ?? 0).mul(pricing.image ?? 0));
    cost = cost.plus(
      new Decimal(usage.web_search ?? 0).mul(pricing.web_search ?? 0),
    );
    cost = cost.plus(
      new Decimal(usage.code_interpreter ?? 0).mul(
        pricing.code_interpreter ?? 0,
      ),
    );
    cost = cost.plus(new Decimal(usage.request ?? 0).mul(pricing.request ?? 0));
    cost = cost.plus(
      new Decimal(usage.input_cache_reads ?? 0)
        .mul(pricing.input_cache_reads ?? 0)
        .dividedBy(1000000),
    );
    cost = cost.plus(
      new Decimal(usage.input_cache_writes ?? 0)
        .mul(pricing.input_cache_writes ?? 0)
        .dividedBy(1000000),
    );
    return cost.neg();
  } else if (pricing.type === "tiered") {
    for (const tier of pricing.tiers) {
      if (!tier.predicate) {
        return calculateCost(usage, tier.pricing);
      }

      const predicate = jsonLogic.apply(tier.predicate, usage);
      if (predicate) {
        return calculateCost(usage, tier.pricing);
      }
    }
  }

  throw new HTTPException(500, {
    message: "Unknown pricing type",
  });
};

export const updateBilling = async (
  c: Context<ContextEnv>,
  amount: Decimal,
  metadata: LedgerMetadata,
) => {
  if (!getConfig(c).auth.enabled || !c.var.auth) {
    return;
  }

  if (c.var.auth.type === "access-key" || c.var.auth.type === "byok") {
    await getDb(c).insert(ledger).values({
      ownerType: c.var.auth.type,
      ownerId: "",
      amount: amount.toString(),
      metadata,
    });
    return;
  }

  const ownerType =
    c.var.auth.type === "api-key" ? c.var.auth.apiKey.ownerType : "user";
  const ownerId =
    c.var.auth.type === "api-key"
      ? c.var.auth.apiKey.ownerId
      : c.var.auth.user.id;

  await getDb(c).insert(ledger).values({
    ownerType,
    ownerId,
    amount: amount.toString(),
    metadata,
  });
  await getDb(c)
    .update(balance)
    .set({
      balance: sql`balance + (${amount.toString()})`,
    })
    .where(and(eq(balance.ownerType, ownerType), eq(balance.ownerId, ownerId)));
};
