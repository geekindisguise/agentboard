import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ab_admin";

function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || !value.trim()) return null;
  return value;
}

export function adminConfigured(): boolean {
  return adminPassword() !== null;
}

function tokenFor(password: string): string {
  return createHmac("sha256", password).update("agentboard-admin").digest("hex");
}

export function passwordMatches(candidate: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const expected = adminPassword();
  if (!expected) return false;
  const jar = await cookies();
  const got = jar.get(COOKIE)?.value;
  if (!got) return false;
  const want = tokenFor(expected);
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function adminCookieValue(): string | null {
  const expected = adminPassword();
  if (!expected) return null;
  return tokenFor(expected);
}

export const adminCookieName = COOKIE;
