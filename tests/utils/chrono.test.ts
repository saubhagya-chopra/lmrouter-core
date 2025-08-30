// chrono.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HTTPException } from "hono/http-exception";
import { TimeKeeper } from "../../src/utils/chrono";

describe("TimeKeeper (chrono.ts)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("throws if timestamps() called before any record()", () => {
    const tk = new TimeKeeper();
    expect(() => tk.timestamps()).toThrow(HTTPException);
  });

  it("throws if only one record() was made", () => {
    const tk = new TimeKeeper();
    vi.setSystemTime(1_000);
    tk.record();
    expect(() => tk.timestamps()).toThrow(HTTPException);
  });

  it("returns {start, end} after exactly two record() calls", () => {
    const tk = new TimeKeeper();

    vi.setSystemTime(1_000);
    tk.record(); // first

    vi.setSystemTime(1_100);
    tk.record(); // second

    const ts = tk.timestamps();
    expect(ts).toEqual({ start: 1_000, end: 1_100 });
    expect(ts).not.toHaveProperty("first_token");
  });

  it("returns {start, first_token, end} after three record() calls", () => {
    const tk = new TimeKeeper();

    vi.setSystemTime(2_000);
    tk.record(); // first

    vi.setSystemTime(2_150);
    tk.record(); // second

    vi.setSystemTime(2_500);
    tk.record(); // last

    const ts = tk.timestamps();
    expect(ts).toEqual({ start: 2_000, first_token: 2_150, end: 2_500 });
  });

  it("subsequent record() calls update only 'end' (keep start & first_token)", () => {
    const tk = new TimeKeeper();

    vi.setSystemTime(3_000);
    tk.record(); // first

    vi.setSystemTime(3_050);
    tk.record(); // second

    vi.setSystemTime(3_200);
    tk.record(); // third -> sets last

    vi.setSystemTime(3_900);
    tk.record(); // fourth -> updates last

    const ts = tk.timestamps();
    expect(ts).toEqual({ start: 3_000, first_token: 3_050, end: 3_900 });
  });

  it("HTTPException details are 500/Internal Server Error", () => {
    const tk = new TimeKeeper();
    try {
      tk.timestamps();
      throw new Error("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(HTTPException);
      expect(e.status).toBe(500);
      expect(e.message).toBe("Internal server error");
    }
  });
});
