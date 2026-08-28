import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPublicDate, formatRelative } from "./format";

describe("formatPublicDate", () => {
  it("prints day month year", () => {
    assert.equal(formatPublicDate("2026-08-27"), "27 Aug 2026");
    assert.equal(formatPublicDate("2026-07-16"), "16 Jul 2026");
  });
});

describe("formatRelative", () => {
  it("uses short units", () => {
    const now = Date.parse("2026-08-28T12:00:00.000Z");
    assert.equal(formatRelative("2026-08-28T11:59:30.000Z", now), "just now");
    assert.equal(formatRelative("2026-08-28T11:10:00.000Z", now), "50m ago");
    assert.equal(formatRelative("2026-08-28T09:00:00.000Z", now), "3h ago");
  });
});
