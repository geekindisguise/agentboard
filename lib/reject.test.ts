import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isHardRejectedUrl, normalizeHttpUrl } from "./reject";

describe("isHardRejectedUrl", () => {
  it("rejects how-to, exploit, PoC, payload, and reproduce URLs", () => {
    const blocked = [
      "https://example.com/how-to-break-agents",
      "https://example.com/howto/sandbox",
      "https://example.com/blog/exploit-notes",
      "https://example.com/research/poc",
      "https://example.com/payloads/sample",
      "https://example.com/how-to-reproduce",
      "https://example.com/proof-of-concept",
      "https://example.com/posts?q=how%20to%20reproduce",
    ];
    for (const url of blocked) {
      assert.equal(isHardRejectedUrl(url), true, url);
    }
  });

  it("allows ordinary incident writeups", () => {
    const allowed = [
      "https://openai.com/index/hugging-face-incident-and-the-road-ahead/",
      "https://huggingface.co/blog/security-incident-july-2026",
      "https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals",
      "https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/",
      "https://huggingface.co/blog/agent-intrusion-technical-timeline",
      "https://www.example.com/company-incident-disclosure",
    ];
    for (const url of allowed) {
      assert.equal(isHardRejectedUrl(url), false, url);
    }
  });
});

describe("normalizeHttpUrl", () => {
  it("accepts http(s) and drops hashes", () => {
    assert.equal(
      normalizeHttpUrl("https://example.com/a#frag"),
      "https://example.com/a",
    );
  });

  it("rejects non-http schemes", () => {
    assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
    assert.equal(normalizeHttpUrl("not a url"), null);
  });
});
