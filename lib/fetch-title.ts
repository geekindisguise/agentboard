import { isIP } from "node:net";

const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const MAX_BYTES = 64 * 1024;

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const ipVersion = isIP(host);
  if (!ipVersion) return false;
  if (host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("169.254.")) return true;
  const parts = host.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  if (host === "::" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    return true;
  }
  return false;
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchPageTitle(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "";
  }
  if (isPrivateHost(parsed.hostname)) {
    return "";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Agentboard/1.0 (title-only)",
      },
    });
    if (!response.ok || !response.body) return "";

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      received += value.byteLength;
      const soFar = Buffer.concat(chunks).toString("utf8");
      if (TITLE_RE.test(soFar)) break;
    }
    try {
      await reader.cancel();
    } catch {
      // ignore
    }

    const html = Buffer.concat(chunks).toString("utf8").slice(0, MAX_BYTES);
    const match = TITLE_RE.exec(html);
    if (!match) return "";
    return decodeEntities(match[1]).slice(0, 200);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}
