import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, before } from "node:test";
import * as db from "./db";
import { isHardRejectedUrl } from "./reject";

const dir = mkdtempSync(join(tmpdir(), "agentboard-"));
process.env.DATA_PATH = join(dir, "incidents.json");

describe("board store", () => {
  before(() => {
    db.readStore();
  });

  it("seeds published OpenAI and Hugging Face cards", () => {
    const published = db.publishedIncidents();
    assert.equal(published.length, 2);
    assert.equal(published[0].who, "OpenAI");
    assert.match(published[0].sourceUrl, /openai\.com/);
    assert.equal(published[0].status, "official writeup");
    assert.equal(published[1].who, "Hugging Face");
    assert.match(published[1].sourceUrl, /huggingface\.co\/blog\/security-incident-july-2026/);
    assert.equal(published[1].status, "reported");
  });

  it("keeps a submitted URL in pending, not on the board", async () => {
    const before = db.publishedIncidents().length;
    const item = await db.addPending({
      sourceUrl: "https://example.com/incident-note",
      title: "Example incident note",
    });
    assert.equal(item.state, "pending");
    assert.equal(db.publishedIncidents().length, before);
    assert.equal(db.pendingIncidents().some((row) => row.id === item.id), true);
  });

  it("publishes a pending item and increments the public count", async () => {
    const before = db.publishedIncidents().length;
    const pending = db.pendingIncidents()[0];
    assert.ok(pending);
    const published = await db.publishIncident(pending.id, {
      summary: "A public incident writeup appeared.",
      who: "Example",
      publicDate: "2026-08-28",
      status: "reported",
    });
    assert.ok(published);
    assert.equal(published.state, "published");
    assert.equal(db.publishedIncidents().length, before + 1);
  });

  it("never publishes a hard-rejected URL", async () => {
    const url = "https://example.com/how-to-reproduce-an-exploit";
    assert.equal(isHardRejectedUrl(url), true);
    const before = db.publishedIncidents().length;
    const item = await db.addPending({ sourceUrl: url, title: "blocked" });
    if (isHardRejectedUrl(item.sourceUrl)) {
      await db.rejectIncident(item.id);
    }
    const published = db.publishedIncidents();
    assert.equal(published.length, before);
    assert.equal(
      published.some((row) => row.sourceUrl === url),
      false,
    );
  });
});

process.on("exit", () => {
  rmSync(dir, { recursive: true, force: true });
});
