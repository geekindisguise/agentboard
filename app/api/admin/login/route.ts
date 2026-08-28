import { NextResponse } from "next/server";
import { adminCookieName, adminCookieValue, passwordMatches } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = NextResponse.redirect(new URL("/admin", request.url), 303);

  if (!passwordMatches(password)) {
    return next;
  }

  const value = adminCookieValue();
  if (!value) {
    return next;
  }

  const proto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol;
  next.cookies.set(adminCookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: proto === "https" || proto === "https:",
  });
  return next;
}
