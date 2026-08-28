import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, before } from "node:test";
import * as db from "./db";
import { isHardRejectedUrl } from "./reject";

const OFFICIAL_FOLLOW_UP_IDS = [
  "seed-anthropic-2026-07-30",
  "seed-metr-2026-08-26",
  "seed-huggingface-timeline-2026-07-27",
] as const;

const FORBIDDEN_COPY = /exploit|payload|poc|how-to|how to reproduce/i;

const dir = mkdtempSync(join(tmpdir(), "agentboard-"));
process.env.DATA_PATH = join(dir, "incidents.json");

describe("board store", () => {
  before(() => {
    db.readStore();
  });

  it("seeds published OpenAI and Hugging Face cards plus official follow-ups", () => {
    const published = db.publishedIncidents();
    const byId = Object.fromEntries(published.map((row) => [row.id, row]));

    assert.ok(byId["seed-openai-2026-08-27"]);
    assert.equal(byId["seed-openai-2026-08-27"].who, "OpenAI");
    assert.match(byId["seed-openai-2026-08-27"].sourceUrl, /openai\.com/);
    assert.equal(byId["seed-openai-2026-08-27"].status, "official writeup");

    assert.ok(byId["seed-huggingface-2026-07-16"]);
    assert.equal(byId["seed-huggingface-2026-07-16"].who, "Hugging Face");
    assert.match(
      byId["seed-huggingface-2026-07-16"].sourceUrl,
      /huggingface\.co\/blog\/security-incident-july-2026/,
    );
    assert.equal(byId["seed-huggingface-2026-07-16"].status, "reported");

    for (const id of OFFICIAL_FOLLOW_UP_IDS) {
      const card = byId[id];
      assert.ok(card, id);
      assert.equal(card.state, "published");
      assert.equal(card.status, "official writeup");
      assert.doesNotMatch(card.summary, FORBIDDEN_COPY);
      assert.doesNotMatch(card.title, FORBIDDEN_COPY);
      assert.doesNotMatch(card.id, FORBIDDEN_COPY);
    }
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

  it("appends missing official seed ids on load without overwriting or resetting", () => {
    const path = process.env.DATA_PATH as string;
    writeFileSync(
      path,
      JSON.stringify(
        {
          seeded: true,
          incidents: [
            {
              id: "seed-openai-2026-08-27",
              publicDate: "2026-08-27",
              who: "OpenAI",
              summary: "Custom existing summary that must stay.",
              sourceUrl: "https://openai.com/index/hugging-face-incident-and-the-road-ahead/",
              status: "official writeup",
              state: "published",
              title: "The Hugging Face incident and the road ahead",
              createdAt: "2026-08-27T00:00:00.000Z",
              publishedAt: "2026-08-27T00:00:00.000Z",
            },
            {
              id: "seed-huggingface-2026-07-16",
              publicDate: "2026-07-16",
              who: "Hugging Face",
              summary:
                "Hugging Face disclosed an intrusion into production infrastructure, later attributed to autonomous AI agents.",
              sourceUrl: "https://huggingface.co/blog/security-incident-july-2026",
              status: "reported",
              state: "published",
              title: "Security incident disclosure — July 2026",
              createdAt: "2026-07-16T00:00:00.000Z",
              publishedAt: "2026-07-16T00:00:00.000Z",
            },
            {
              id: "custom-keep-me",
              publicDate: "2026-08-01",
              who: "Example",
              summary: "A reviewer-published card that must remain after load.",
              sourceUrl: "https://example.com/kept-card",
              status: "reported",
              state: "published",
              title: "Kept card",
              createdAt: "2026-08-01T00:00:00.000Z",
              publishedAt: "2026-08-01T00:00:00.000Z",
            },
          ],
        },
        null,
        2,
      ) + "\n",
    );

    const store = db.readStore();
    const byId = Object.fromEntries(store.incidents.map((row) => [row.id, row]));

    assert.equal(byId["seed-openai-2026-08-27"].summary, "Custom existing summary that must stay.");
    assert.ok(byId["custom-keep-me"]);

    for (const id of OFFICIAL_FOLLOW_UP_IDS) {
      const card = byId[id];
      assert.ok(card, id);
      assert.equal(card.state, "published");
      assert.equal(card.status, "official writeup");
      assert.doesNotMatch(card.summary, FORBIDDEN_COPY);
      assert.doesNotMatch(card.title, FORBIDDEN_COPY);
      assert.doesNotMatch(card.id, FORBIDDEN_COPY);
    }

    const persisted = JSON.parse(readFileSync(path, "utf8")) as {
      incidents: { id: string }[];
    };
    const persistedIds = persisted.incidents.map((row) => row.id);
    for (const id of OFFICIAL_FOLLOW_UP_IDS) {
      assert.equal(persistedIds.includes(id), true, id);
    }
    assert.equal(persistedIds.includes("custom-keep-me"), true);
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
