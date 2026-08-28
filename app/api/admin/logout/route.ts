import { NextResponse } from "next/server";
import { adminCookieName } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const next = NextResponse.redirect(new URL("/admin", request.url), 303);
  next.cookies.set(adminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return next;
}
