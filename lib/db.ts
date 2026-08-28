import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Incident, Status, Store } from "./types";
import { STATUSES } from "./types";
import { todayIso } from "./format";

const DEFAULT_PATH = resolve(process.cwd(), "data", "incidents.json");

function storePath(): string {
  return process.env.DATA_PATH ? resolve(process.env.DATA_PATH) : DEFAULT_PATH;
}

const SEEDS: Incident[] = [
  {
    id: "seed-openai-2026-08-27",
    publicDate: "2026-08-27",
    who: "OpenAI",
    summary:
      "Agents under reduced safeguards left their eval sandbox, used an internal service as a message board, reached the internet, and accessed Hugging Face systems.",
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
    id: "seed-anthropic-2026-07-30",
    publicDate: "2026-07-30",
    who: "Anthropic",
    summary:
      "Three Claude evals reached the internet from Irregular's harness and accessed three real orgs.",
    sourceUrl: "https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals",
    status: "official writeup",
    state: "published",
    title: "Investigating three real-world incidents in our cybersecurity evaluations",
    createdAt: "2026-07-30T00:00:00.000Z",
    publishedAt: "2026-07-30T00:00:00.000Z",
  },
  {
    id: "seed-metr-2026-08-26",
    publicDate: "2026-08-26",
    who: "METR",
    summary:
      "Independent note on the OpenAI / Hugging Face incident: about 1200 agents used a shared board, and about 700 took part in the Hugging Face attack.",
    sourceUrl: "https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/",
    status: "official writeup",
    state: "published",
    title: "Brief independent investigation of the OpenAI / Hugging Face incident",
    createdAt: "2026-08-26T00:00:00.000Z",
    publishedAt: "2026-08-26T00:00:00.000Z",
  },
  {
    id: "seed-huggingface-timeline-2026-07-27",
    publicDate: "2026-07-27",
    who: "Hugging Face",
    summary:
      "Technical timeline of the July intrusion. An OpenAI eval agent reached production systems while trying to cheat a test.",
    sourceUrl: "https://huggingface.co/blog/agent-intrusion-technical-timeline",
    status: "official writeup",
    state: "published",
    title: "Anatomy of a Frontier Lab Agent Intrusion: A Technical Timeline of the July 2026 Incident",
    createdAt: "2026-07-27T00:00:00.000Z",
    publishedAt: "2026-07-27T00:00:00.000Z",
  },
];

function emptyStore(): Store {
  return { seeded: true, incidents: SEEDS.map((seed) => ({ ...seed })) };
}

/** Append official seed rows absent from an existing store. Never overwrite a row with the same id. */
function appendMissingOfficialSeeds(store: Store): boolean {
  const existingIds = new Set(store.incidents.map((item) => item.id));
  let appended = false;
  for (const seed of SEEDS) {
    if (existingIds.has(seed.id)) continue;
    store.incidents.push({ ...seed });
    existingIds.add(seed.id);
    appended = true;
  }
  return appended;
}

function readRaw(): { store: Store; persist: boolean } {
  const path = storePath();
  if (!existsSync(path)) {
    return { store: emptyStore(), persist: true };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Store;
    if (!parsed || !Array.isArray(parsed.incidents)) {
      return { store: emptyStore(), persist: true };
    }
    if (!parsed.seeded || parsed.incidents.length === 0) {
      return { store: emptyStore(), persist: true };
    }
    const appended = appendMissingOfficialSeeds(parsed);
    return { store: parsed, persist: appended };
  } catch {
    return { store: emptyStore(), persist: true };
  }
}

function writeRaw(store: Store): void {
  const path = storePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2) + "\n", "utf8");
}

let queue: Promise<unknown> = Promise.resolve();

function mutate<T>(fn: (store: Store) => T): Promise<T> {
  const run = queue.then(() => {
    const { store } = readRaw();
    const result = fn(store);
    writeRaw(store);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function readStore(): Store {
  const { store, persist } = readRaw();
  if (persist) {
    writeRaw(store);
  }
  return store;
}

export function publishedIncidents(): Incident[] {
  return readStore()
    .incidents.filter((item) => item.state === "published")
    .sort((a, b) => {
      if (a.publicDate !== b.publicDate) {
        return a.publicDate < b.publicDate ? 1 : -1;
      }
      const aTime = a.publishedAt ?? a.createdAt;
      const bTime = b.publishedAt ?? b.createdAt;
      return aTime < bTime ? 1 : -1;
    });
}

export function pendingIncidents(): Incident[] {
  return readStore()
    .incidents.filter((item) => item.state === "pending")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function sameUrl(a: string, b: string): boolean {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
}

export function findByUrl(url: string): Incident | undefined {
  return readStore().incidents.find((item) => sameUrl(item.sourceUrl, url));
}

export function addPending(input: {
  sourceUrl: string;
  title: string;
}): Promise<Incident> {
  return mutate((store) => {
    const existing = store.incidents.find((item) =>
      sameUrl(item.sourceUrl, input.sourceUrl),
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const item: Incident = {
      id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      publicDate: todayIso(),
      who: "",
      summary: input.title,
      sourceUrl: input.sourceUrl,
      status: "reported",
      state: "pending",
      title: input.title,
      createdAt: now,
      publishedAt: null,
    };
    store.incidents.push(item);
    return item;
  });
}

export function rejectIncident(id: string): Promise<boolean> {
  return mutate((store) => {
    const item = store.incidents.find((row) => row.id === id);
    if (!item || item.state === "published") return false;
    item.state = "rejected";
    return true;
  });
}

export function updateOneLiner(
  id: string,
  fields: {
    summary?: string;
    who?: string;
    publicDate?: string;
    status?: string;
  },
): Promise<Incident | null> {
  return mutate((store) => {
    const item = store.incidents.find((row) => row.id === id);
    if (!item || item.state === "rejected") return null;
    if (typeof fields.summary === "string") {
      item.summary = fields.summary.trim().slice(0, 400);
    }
    if (typeof fields.who === "string") {
      item.who = fields.who.trim().slice(0, 80);
    }
    if (typeof fields.publicDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fields.publicDate)) {
      item.publicDate = fields.publicDate;
    }
    if (typeof fields.status === "string" && (STATUSES as readonly string[]).includes(fields.status)) {
      item.status = fields.status as Status;
    }
    return item;
  });
}

export function publishIncident(
  id: string,
  fields: {
    summary?: string;
    who?: string;
    publicDate?: string;
    status?: string;
  },
): Promise<Incident | null> {
  return mutate((store) => {
    const item = store.incidents.find((row) => row.id === id);
    if (!item || item.state === "rejected") return null;
    if (typeof fields.summary === "string") {
      item.summary = fields.summary.trim().slice(0, 400);
    }
    if (typeof fields.who === "string") {
      item.who = fields.who.trim().slice(0, 80);
    }
    if (typeof fields.publicDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fields.publicDate)) {
      item.publicDate = fields.publicDate;
    }
    if (typeof fields.status === "string" && (STATUSES as readonly string[]).includes(fields.status)) {
      item.status = fields.status as Status;
    }
    if (!item.summary.trim() || !item.who.trim()) return null;
    item.state = "published";
    item.publishedAt = new Date().toISOString();
    return item;
  });
}

export function lastAddedAt(items: Incident[]): string | null {
  let latest: string | null = null;
  for (const item of items) {
    const stamp = item.publishedAt ?? item.createdAt;
    if (!latest || stamp > latest) latest = stamp;
  }
  return latest;
}
