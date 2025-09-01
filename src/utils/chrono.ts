// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import { HTTPException } from "hono/http-exception";

import type { LMRouterLedgerMetadataApiCallTimestamps } from "../types/billing.js";

export class TimeKeeper {
  private first?: number;
  private second?: number;
  private last?: number;

  record() {
    if (!this.first) {
      this.first = Date.now();
      return;
    }

    if (!this.second) {
      this.second = Date.now();
      return;
    }

    this.last = Date.now();
  }

  timestamps(): LMRouterLedgerMetadataApiCallTimestamps {
    if (!this.first || !this.second) {
      throw new HTTPException(500, {
        message: "Internal server error",
      });
    }

    if (!this.last) {
      return {
        start: this.first,
        end: this.second,
      };
    }

    return {
      start: this.first,
      first_token: this.second,
      end: this.last,
    };
  }
}
