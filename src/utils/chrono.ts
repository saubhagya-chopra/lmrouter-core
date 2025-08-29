// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import type { LedgerMetadataApiCallTimestamps } from "../models/billing.js";

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

  timestamps(): LedgerMetadataApiCallTimestamps {
    if (!this.first || !this.second) {
      throw new Error("Timestamps not recorded");
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
